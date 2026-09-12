"use strict";

/**
 * An HTTP client on top of `fetch`: JSON by default, query objects, base
 * URLs, timeouts, safe retries that respect `Retry-After`, typed errors,
 * hooks, reusable clients and downloads with progress.
 *
 * @example
 * const { data } = await http.get("https://api.github.com/repos/nodejs/node");
 *
 * const api = http.create({ baseURL: "https://api.example.com/v1/", auth: { bearer: process.env.TOKEN } });
 * const { data: users } = await api.get("users", { query: { page: 2 } });
 */

const fs = require("node:fs");
const nodePath = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { HttpError, TimeoutError, AbortError } = require("./errors.js");

/**
 * A request body.
 * @typedef {string | Buffer | Uint8Array | ArrayBuffer | URLSearchParams | FormData | Blob | ReadableStream | import("node:stream").Readable} HttpBody
 */

/**
 * An HTTP method.
 * @typedef {"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | (string & {})} HttpMethod
 */

/**
 * Query string values. `null` and `undefined` are skipped, arrays repeat the key.
 * @typedef {Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>>} QueryParams
 */

/**
 * Retry settings.
 * @typedef {object} HttpRetryOptions
 * @property {number} [attempts] Total attempts, the first included. Defaults to `3` for methods that are safe to repeat, `1` for the others.
 * @property {number} [delay] Wait before the first retry, in ms. Defaults to `300`.
 * @property {number} [backoff] Multiplies the wait after each attempt. Defaults to `2`.
 * @property {number} [maxDelay] Longest wait, `Retry-After` included. Defaults to 30 seconds.
 * @property {number[]} [statuses] Statuses worth retrying. Defaults to 408, 413, 429, 500, 502, 503 and 504.
 * @property {HttpMethod[]} [methods] Methods allowed to retry. POST and PATCH aren't, by default, so nothing gets created twice.
 */

/**
 * A request as hooks see it.
 * @typedef {object} HttpRequestConfig
 * @property {string} url The final URL, base URL and query included.
 * @property {HttpMethod} method
 * @property {Record<string, string>} headers Lower-cased names.
 * @property {HttpBody | undefined} body
 * @property {number} attempt 1 for the first try.
 */

/**
 * Hooks to watch or change requests.
 * @typedef {object} HttpHooks
 * @property {Array<(config: HttpRequestConfig) => void | Promise<void>>} [beforeRequest] Runs before each attempt. It can change the URL, headers or body.
 * @property {Array<(response: HttpResponse<any>, config: HttpRequestConfig) => void | HttpResponse<any> | Promise<void | HttpResponse<any>>>} [afterResponse] Runs after each response, before errors are thrown. It can return another response.
 * @property {Array<(error: unknown, attempt: number, delay: number) => void | Promise<void>>} [beforeRetry] Runs before waiting for a retry.
 */

/**
 * Request options.
 * @typedef {object} HttpOptions
 * @property {HttpMethod} [method] Defaults to `"GET"`.
 * @property {string} [baseURL] Prefix for relative URLs.
 * @property {Record<string, string | undefined>} [headers] Set a header to `undefined` to remove a default one.
 * @property {QueryParams | URLSearchParams} [query] Added to the URL's own query string.
 * @property {unknown} [json] Sent as JSON.
 * @property {Record<string, string | number | boolean>} [form] Sent as a URL-encoded form.
 * @property {HttpBody} [body] Sent as is: string, Buffer, `FormData`, stream...
 * @property {{ bearer: string } | { username: string, password: string }} [auth] Sets the `authorization` header.
 * @property {number | string | false} [timeout] Time limit per attempt, like `"10s"`. `false` turns it off. Defaults to 30 seconds.
 * @property {number | false | HttpRetryOptions} [retry] Number of attempts, `false`, or retry settings.
 * @property {"auto" | "json" | "text" | "buffer" | "stream"} [responseType] How to read the body. `"auto"` reads JSON or text based on the content type, a Buffer otherwise.
 * @property {boolean} [throwHttpErrors] Throw an `HttpError` when the status isn't 2xx. Defaults to `true`.
 * @property {AbortSignal} [signal] Cancels the request.
 * @property {HttpHooks} [hooks]
 * @property {(progress: { loaded: number, total: number | undefined, percent: number | undefined }) => void} [onDownloadProgress] Called while the body downloads.
 * @property {"follow" | "error" | "manual"} [redirect] Defaults to `"follow"`.
 */

/**
 * A response.
 * @template [T=any]
 * @typedef {object} HttpResponse
 * @property {number} status
 * @property {string} statusText
 * @property {boolean} ok `true` for 2xx statuses.
 * @property {Record<string, string>} headers Lower-cased names.
 * @property {T} data The body, already read (see `responseType`).
 * @property {string} url The final URL, after redirects.
 * @property {number} duration In ms, retries included.
 * @property {number} attempts How many attempts it took.
 */

/**
 * A client with its own defaults, from `create()`.
 * @typedef {object} HttpClient
 * @property {<T = any>(url: string | URL, options?: HttpOptions) => Promise<HttpResponse<T>>} request Sends a request.
 * @property {<T = any>(url: string | URL, options?: HttpOptions) => Promise<HttpResponse<T>>} get Sends a GET request.
 * @property {<T = any>(url: string | URL, options?: HttpOptions) => Promise<HttpResponse<T>>} head Sends a HEAD request.
 * @property {<T = any>(url: string | URL, options?: HttpOptions) => Promise<HttpResponse<T>>} delete Sends a DELETE request.
 * @property {<T = any>(url: string | URL, data?: unknown, options?: HttpOptions) => Promise<HttpResponse<T>>} post Sends a POST request. Objects and arrays go as JSON.
 * @property {<T = any>(url: string | URL, data?: unknown, options?: HttpOptions) => Promise<HttpResponse<T>>} put Sends a PUT request. Objects and arrays go as JSON.
 * @property {<T = any>(url: string | URL, data?: unknown, options?: HttpOptions) => Promise<HttpResponse<T>>} patch Sends a PATCH request. Objects and arrays go as JSON.
 * @property {(url: string | URL, destination: string, options?: HttpOptions) => Promise<{ path: string, size: number }>} download Saves a response to a file.
 * @property {(defaults: HttpOptions) => HttpClient} extend A new client with these defaults added.
 * @property {Readonly<HttpOptions>} defaults
 */

const RETRY_STATUSES = [408, 413, 429, 500, 502, 503, 504];
const RETRY_METHODS = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"];

/** @param {number | string | false | undefined} value */
const _ms = (value) => {
  if (value === false) return undefined;
  if (value === undefined) return 30_000;
  if (typeof value === "number") return value;
  const ms = require("./Time.js").parseDuration(value);
  if (ms === null) throw new TypeError(`Invalid timeout: ${value}`);
  return ms;
};

/**
 * @param {HttpOptions} base
 * @param {HttpOptions} extra
 * @returns {HttpOptions}
 */
const _mergeOptions = (base, extra) => ({
  ...base,
  ...extra,
  headers: { ...base.headers, ...extra.headers },
  hooks: {
    beforeRequest: [...(base.hooks?.beforeRequest ?? []), ...(extra.hooks?.beforeRequest ?? [])],
    afterResponse: [...(base.hooks?.afterResponse ?? []), ...(extra.hooks?.afterResponse ?? [])],
    beforeRetry: [...(base.hooks?.beforeRetry ?? []), ...(extra.hooks?.beforeRetry ?? [])],
  },
});

/**
 * @param {string | URL} input
 * @param {HttpOptions} options
 * @returns {string}
 */
const _buildURL = (input, options) => {
  let url;
  if (input instanceof URL) url = new URL(input.href);
  else if (/^[a-z][a-z\d+.-]*:/i.test(input)) url = new URL(input);
  else if (options.baseURL) url = new URL(input.replace(/^\/+/, ""), options.baseURL.replace(/\/*$/, "/"));
  else throw new TypeError(`Invalid URL "${input}": use an absolute URL or set baseURL`);
  const query = options.query;
  if (query instanceof URLSearchParams) for (const [k, v] of query) url.searchParams.append(k, v);
  else if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item));
      else url.searchParams.set(key, String(value));
    }
  }
  return url.href;
};

/**
 * @param {Response} res
 * @param {HttpOptions} options
 * @returns {Promise<unknown>}
 */
const _readBody = async (res, options) => {
  const type = options.responseType ?? "auto";
  if (type === "stream") return res.body ? Readable.fromWeb(/** @type {any} */ (res.body)) : Readable.from([]);
  let buffer;
  if (options.onDownloadProgress && res.body) {
    const total = Number(res.headers.get("content-length")) || undefined;
    /** @type {Buffer[]} */
    const chunks = [];
    let loaded = 0;
    for await (const chunk of /** @type {AsyncIterable<Uint8Array>} */ (/** @type {unknown} */ (res.body))) {
      chunks.push(Buffer.from(chunk));
      loaded += chunk.length;
      options.onDownloadProgress({ loaded, total, percent: total ? Math.min(100, (loaded / total) * 100) : undefined });
    }
    buffer = Buffer.concat(chunks);
  } else {
    buffer = Buffer.from(await res.arrayBuffer());
  }
  if (type === "buffer") return buffer;
  const text = buffer.toString("utf8");
  const contentType = res.headers.get("content-type") ?? "";
  if (type === "json" || (type === "auto" && /[/+]json\b/i.test(contentType))) {
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch (error) {
      if (type === "json") throw new HttpError(`Invalid JSON in response from ${res.url}`, { status: res.status, url: res.url, data: text, cause: error });
      return text;
    }
  }
  if (type === "text" || type === "auto" && (/^text\/|xml|javascript|x-www-form-urlencoded/i.test(contentType) || !contentType)) return text;
  return buffer;
};

/**
 * @param {Headers} headers
 * @returns {Record<string, string>}
 */
const _headers = (headers) => Object.fromEntries(headers.entries());

/**
 * The delay asked for by a `Retry-After` header, in ms.
 * @param {string | null} value
 * @returns {number | undefined}
 */
const _retryAfter = (value) => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

/**
 * The engine behind every method.
 * @param {string | URL} input
 * @param {HttpOptions} options
 * @returns {Promise<HttpResponse<any>>}
 */
const _send = async (input, options) => {
  const started = Date.now();
  const method = String(options.method ?? "GET").toUpperCase();
  const retryOptions = typeof options.retry === "object" ? options.retry : {};
  const retryMethods = (retryOptions.methods ?? RETRY_METHODS).map((m) => m.toUpperCase());
  const attempts = options.retry === false
    ? 1
    : typeof options.retry === "number"
      ? Math.max(1, options.retry)
      : retryOptions.attempts ?? (retryMethods.includes(method) ? 3 : 1);
  const statuses = retryOptions.statuses ?? RETRY_STATUSES;
  const timeoutMs = _ms(options.timeout);

  /** @type {Record<string, string>} */
  const headers = { accept: "application/json, text/plain, */*" };
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    if (value === undefined) delete headers[key.toLowerCase()];
    else headers[key.toLowerCase()] = value;
  }
  if (options.auth) {
    headers.authorization = "bearer" in options.auth
      ? `Bearer ${options.auth.bearer}`
      : `Basic ${Buffer.from(`${options.auth.username}:${options.auth.password}`).toString("base64")}`;
  }
  /** @type {HttpBody | undefined} */
  let body = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers["content-type"] ??= "application/json";
  } else if (options.form) {
    body = new URLSearchParams(Object.entries(options.form).map(([k, v]) => /** @type {[string, string]} */ ([k, String(v)])));
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    /** @type {HttpRequestConfig} */
    const config = { url: _buildURL(input, options), method, headers: { ...headers }, body, attempt };
    for (const hook of options.hooks?.beforeRequest ?? []) await hook(config);
    const signals = [options.signal, timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs)].filter((s) => s !== undefined);
    /** @type {HttpResponse<any> | undefined} */
    let result;
    /** @type {number | undefined} */
    let serverDelay;
    try {
      /** @type {any} */
      const init = {
        method,
        headers: config.headers,
        body: method === "GET" || method === "HEAD" ? undefined : config.body,
        signal: signals.length ? AbortSignal.any(/** @type {AbortSignal[]} */ (signals)) : undefined,
        redirect: options.redirect ?? "follow",
      };
      if (init.body instanceof Readable || (init.body && typeof (/** @type {any} */ (init.body)).getReader === "function")) init.duplex = "half";
      const res = await fetch(config.url, init);
      const data = method === "HEAD" ? undefined : await _readBody(res, options);
      result = { status: res.status, statusText: res.statusText, ok: res.ok, headers: _headers(res.headers), data, url: res.url || config.url, duration: Date.now() - started, attempts: attempt };
      for (const hook of options.hooks?.afterResponse ?? []) {
        const replaced = await hook(result, config);
        if (replaced) result = replaced;
      }
      if (result.ok || options.throwHttpErrors === false) return result;
      lastError = new HttpError(`Request failed with status ${result.status}${result.statusText ? ` ${result.statusText}` : ""}: ${method} ${config.url}`, {
        status: result.status, statusText: result.statusText, url: result.url, method, headers: result.headers, data: result.data,
      });
      serverDelay = _retryAfter(res.headers.get("retry-after"));
      if (!statuses.includes(result.status)) throw lastError;
    } catch (error) {
      if (error === lastError && lastError instanceof HttpError && !statuses.includes(lastError.status)) throw error;
      if (options.signal?.aborted) throw new AbortError(`Request aborted: ${method} ${config.url}`, { cause: options.signal.reason });
      if (error instanceof Error && (error.name === "TimeoutError" || (error.name === "AbortError" && !options.signal?.aborted))) {
        lastError = new TimeoutError(`Request timed out after ${timeoutMs}ms: ${method} ${config.url}`, { timeout: timeoutMs, cause: error });
      } else if (error !== lastError && !(error instanceof HttpError)) {
        /** @type {any} */
        const failure = error;
        /** @type {string} */
        const reason = failure?.cause?.code ?? failure?.cause?.message ?? failure?.message ?? String(error);
        lastError = new HttpError(`Network error (${reason}): ${method} ${config.url}`, { status: 0, url: config.url, method, code: "ERR_NETWORK", cause: error });
      } else if (error !== lastError) {
        lastError = error;
      }
    }
    if (attempt < attempts) {
      const computed = Math.min((retryOptions.delay ?? 300) * (retryOptions.backoff ?? 2) ** (attempt - 1), retryOptions.maxDelay ?? 30_000);
      const wait = serverDelay !== undefined ? Math.min(serverDelay, retryOptions.maxDelay ?? 30_000) : computed;
      for (const hook of options.hooks?.beforeRetry ?? []) await hook(lastError, attempt, wait);
      await require("./Utils.js").wait(wait, { signal: options.signal });
    }
  }
  throw lastError;
};

/**
 * @param {unknown} data
 * @param {HttpOptions} options
 * @returns {HttpOptions}
 */
const _withData = (data, options) => {
  if (data === undefined) return options;
  const plain = data !== null && typeof data === "object" && (Array.isArray(data) || Object.getPrototypeOf(data) === Object.prototype || Object.getPrototypeOf(data) === null);
  return plain || typeof data === "number" || typeof data === "boolean" || data === null ? { ...options, json: data } : { ...options, body: /** @type {HttpBody} */ (data) };
};

/**
 * @param {HttpOptions} defaults
 * @returns {HttpClient}
 */
const _client = (defaults) => {
  const merged = (/** @type {HttpOptions} */ options) => _mergeOptions(defaults, options ?? {});
  /** @type {HttpClient} */
  const client = {
    request: (url, options) => _send(url, merged(options ?? {})),
    get: (url, options) => _send(url, { ...merged(options ?? {}), method: "GET" }),
    head: (url, options) => _send(url, { ...merged(options ?? {}), method: "HEAD" }),
    delete: (url, options) => _send(url, { ...merged(options ?? {}), method: "DELETE" }),
    post: (url, data, options) => _send(url, { ..._withData(data, merged(options ?? {})), method: "POST" }),
    put: (url, data, options) => _send(url, { ..._withData(data, merged(options ?? {})), method: "PUT" }),
    patch: (url, data, options) => _send(url, { ..._withData(data, merged(options ?? {})), method: "PATCH" }),
    download: (url, destination, options) => download(url, destination, merged(options ?? {})),
    extend: (more) => _client(_mergeOptions(defaults, more)),
    defaults: Object.freeze({ ...defaults }),
  };
  return client;
};

/**
 * Sends a request and resolves with the response, body already read.
 * Throws an `HttpError` for error statuses, a `TimeoutError` when it's too
 * slow and an `AbortError` when cancelled.
 *
 * @example
 * const res = await http.request("https://api.example.com/items/42", {
 *   method: "PUT",
 *   json: { name: "Lamp" },
 *   timeout: "10s",
 *   retry: { attempts: 5, statuses: [429, 503] },
 * });
 * res.data; // parsed JSON
 *
 * @template [T=any]
 * @param {string | URL} url An absolute URL, or a path when `baseURL` is set.
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 * @throws {HttpError | TimeoutError | AbortError}
 */
function request(url, options = {}) {
  return _send(url, options);
}

/**
 * Sends a GET request.
 *
 * @example
 * const { data } = await http.get("https://api.example.com/users", { query: { page: 2, tags: ["a", "b"] } });
 *
 * @template [T=any]
 * @param {string | URL} url
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 */
function get(url, options = {}) {
  return _send(url, { ...options, method: "GET" });
}

/**
 * Sends a HEAD request: headers only, no body.
 *
 * @example
 * const { headers } = await http.head("https://example.com/big.zip");
 * headers["content-length"];
 *
 * @template [T=undefined]
 * @param {string | URL} url
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 */
function head(url, options = {}) {
  return _send(url, { ...options, method: "HEAD" });
}

/**
 * Sends a POST request. Objects, arrays, numbers and booleans go as JSON;
 * strings, Buffers, `FormData`, Blobs and streams go as they are.
 *
 * @example
 * const { data: user } = await http.post("https://api.example.com/users", { name: "Ada" });
 * await http.post(uploadUrl, formData);
 *
 * @template [T=any]
 * @param {string | URL} url
 * @param {unknown} [data]
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 */
function post(url, data, options = {}) {
  return _send(url, { ..._withData(data, options), method: "POST" });
}

/**
 * Sends a PUT request. The body works like in `post()`.
 *
 * @template [T=any]
 * @param {string | URL} url
 * @param {unknown} [data]
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 */
function put(url, data, options = {}) {
  return _send(url, { ..._withData(data, options), method: "PUT" });
}

/**
 * Sends a PATCH request. The body works like in `post()`.
 *
 * @template [T=any]
 * @param {string | URL} url
 * @param {unknown} [data]
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 */
function patch(url, data, options = {}) {
  return _send(url, { ..._withData(data, options), method: "PATCH" });
}

/**
 * Sends a DELETE request.
 *
 * @example
 * await http.delete(`https://api.example.com/users/${id}`);
 *
 * @template [T=any]
 * @param {string | URL} url
 * @param {HttpOptions} [options]
 * @returns {Promise<HttpResponse<T>>}
 */
function del(url, options = {}) {
  return _send(url, { ...options, method: "DELETE" });
}

/**
 * Downloads to a file as a stream, so memory stays flat whatever the size.
 * Folders are created, and a partial file is removed if it fails.
 *
 * @example
 * await http.download("https://example.com/video.mp4", "./downloads/video.mp4", {
 *   onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
 * });
 *
 * @param {string | URL} url
 * @param {string} destination
 * @param {HttpOptions} [options]
 * @returns {Promise<{ path: string, size: number }>} The absolute path and size in bytes.
 * @throws {HttpError | TimeoutError | AbortError}
 */
async function download(url, destination, options = {}) {
  const target = nodePath.resolve(destination);
  fs.mkdirSync(nodePath.dirname(target), { recursive: true });
  const res = await _send(url, { ...options, responseType: "stream", onDownloadProgress: undefined, timeout: options.timeout ?? false });
  const total = Number(res.headers["content-length"]) || undefined;
  let size = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      options.onDownloadProgress?.({ loaded: size, total, percent: total ? Math.min(100, (size / total) * 100) : undefined });
      callback(null, chunk);
    },
  });
  try {
    await pipeline(/** @type {Readable} */ (res.data), counter, fs.createWriteStream(target), { signal: options.signal });
  } catch (error) {
    fs.rmSync(target, { force: true });
    if (options.signal?.aborted) throw new AbortError(`Download aborted: ${String(url)}`, { cause: error });
    throw error;
  }
  return { path: target, size };
}

/**
 * Creates a client with default options. Options passed to each call are
 * merged on top.
 *
 * @example
 * const github = http.create({
 *   baseURL: "https://api.github.com",
 *   auth: { bearer: process.env.GITHUB_TOKEN },
 *   hooks: { afterResponse: [(res) => nc.debug(res.status, res.url)] },
 * });
 * const { data: repo } = await github.get("/repos/nodejs/node");
 *
 * @param {HttpOptions} [defaults]
 * @returns {HttpClient}
 */
function create(defaults = {}) {
  return _client(defaults);
}

module.exports = {
  request,
  // not shorthand: Node's ES module export detection stops at a bare `get`
  get: get,
  head,
  post,
  put,
  patch,
  delete: del,
  download,
  create,
  HttpError,
};
