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

const { types } = require("node:util");
const { HttpError, TimeoutError, AbortError } = require("./errors.js");
const { toMs, setLongTimeout, sleep } = require("./internal/shared.js");

/**
 * A request body.
 * @typedef {string | Buffer | Uint8Array | ArrayBuffer | URLSearchParams | FormData | Blob | ReadableStream | import("node:stream").Readable} HttpBody
 */

/**
 * An HTTP method.
 * @typedef {"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | (string & {})} HttpMethod
 */

/**
 * Query string values. `null` and `undefined` are skipped, arrays repeat the key, dates are sent in ISO format.
 * @typedef {Record<string, string | number | boolean | Date | null | undefined | Array<string | number | boolean | Date>>} QueryParams
 */

/**
 * Request headers: an object, a `Headers` instance or a list of pairs.
 * @typedef {Record<string, string | undefined> | Headers | Array<[string, string]>} HttpHeaders
 */

/**
 * Retry settings.
 * @typedef {object} HttpRetryOptions
 * @property {number} [attempts] Total attempts, the first included. Defaults to `3` for methods that are safe to repeat, `1` for the others. A number you give applies to every method, POST included.
 * @property {number | string} [delay] Wait before the first retry, in ms or like `"1s"`. Defaults to `300`.
 * @property {number} [backoff] Multiplies the wait after each attempt. Defaults to `2`.
 * @property {number | string} [maxDelay] Longest wait, `Retry-After` included. Defaults to 30 seconds.
 * @property {boolean} [jitter] Shorten each wait by a random amount, up to half of it, so many clients don't all come back at the same instant.
 * @property {number[]} [statuses] Statuses worth retrying. Defaults to 408, 413, 429, 500, 502, 503 and 504.
 * @property {HttpMethod[]} [methods] Methods retried when you give no number of attempts. POST and PATCH aren't, by default, so nothing gets created twice.
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
 * @property {HttpHeaders} [headers] Set a header to `undefined` to remove a default one.
 * @property {Record<string, string | number | boolean>} [params] Values for the `:name` parts of the URL: `"users/:id"` with `{ id: 42 }` gives `users/42`. They're encoded for you.
 * @property {QueryParams | URLSearchParams} [query] Added to the URL's own query string, and to the client's default query.
 * @property {unknown} [json] Sent as JSON.
 * @property {Record<string, string | number | boolean>} [form] Sent as a URL-encoded form.
 * @property {HttpBody} [body] Sent as is: string, Buffer, `FormData`, stream...
 * @property {{ bearer: string } | { username: string, password: string }} [auth] Sets the `authorization` header.
 * @property {number | string | false} [timeout] Time limit per attempt, like `"10s"`. `false` turns it off. Defaults to 30 seconds. With `responseType: "stream"`, it only covers the wait for the response headers.
 * @property {number | false | HttpRetryOptions} [retry] Number of attempts, `false`, or retry settings. A request whose body is a stream is never retried.
 * @property {"auto" | "json" | "text" | "buffer" | "stream"} [responseType] How to read the body. `"auto"` reads JSON or text based on the content type, a Buffer otherwise.
 * @property {{ parse(data: unknown): unknown }} [schema] Checks the body of a 2xx response, and replaces it with the result: pass a `nc.schema` and bad data from an API stops at the door, with a `ValidationError`. `data` takes the type the schema describes.
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
 * @property {string[]} cookies The `Set-Cookie` headers, one per cookie. `headers` can only hold one of them.
 * @property {T} data The body, already read (see `responseType`).
 * @property {string} url The final URL, after redirects.
 * @property {number} duration In ms, retries included.
 * @property {number} attempts How many attempts it took.
 */

/**
 * What the `schema` option takes: a `nc.schema`, or anything else with a
 * `parse()` method that returns the checked value or throws.
 * @typedef {{ parse(data: unknown): unknown }} ResponseSchema
 */

/**
 * Request options, where `schema` gives `response.data` its type.
 * @template {ResponseSchema} S
 * @typedef {Omit<HttpOptions, "schema"> & { schema?: S }} HttpOptionsOf
 */

/**
 * A client with its own defaults, from `create()`.
 * @typedef {object} HttpClient
 * @property {<T = any, S extends ResponseSchema = { parse(data: unknown): T }>(url: string | URL, options?: HttpOptionsOf<S>) => Promise<HttpResponse<ReturnType<S["parse"]>>>} request Sends a request.
 * @property {<T = any, S extends ResponseSchema = { parse(data: unknown): T }>(url: string | URL, options?: HttpOptionsOf<S>) => Promise<HttpResponse<ReturnType<S["parse"]>>>} get Sends a GET request.
 * @property {<T = any>(url: string | URL, options?: HttpOptions) => Promise<HttpResponse<T>>} head Sends a HEAD request.
 * @property {<T = any, S extends ResponseSchema = { parse(data: unknown): T }>(url: string | URL, options?: HttpOptionsOf<S>) => Promise<HttpResponse<ReturnType<S["parse"]>>>} delete Sends a DELETE request.
 * @property {<T = any, S extends ResponseSchema = { parse(data: unknown): T }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>) => Promise<HttpResponse<ReturnType<S["parse"]>>>} post Sends a POST request. Objects, arrays, numbers and booleans go as JSON.
 * @property {<T = any, S extends ResponseSchema = { parse(data: unknown): T }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>) => Promise<HttpResponse<ReturnType<S["parse"]>>>} put Sends a PUT request. Objects, arrays, numbers and booleans go as JSON.
 * @property {<T = any, S extends ResponseSchema = { parse(data: unknown): T }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>) => Promise<HttpResponse<ReturnType<S["parse"]>>>} patch Sends a PATCH request. Objects, arrays, numbers and booleans go as JSON.
 * @property {(url: string | URL, destination: string, options?: HttpOptions) => Promise<{ path: string, size: number }>} download Saves a response to a file.
 * @property {(defaults: HttpOptions) => HttpClient} extend A new client with these defaults added.
 * @property {Readonly<HttpOptions>} defaults
 */

const RETRY_STATUSES = [408, 413, 429, 500, 502, 503, 504];
const RETRY_METHODS = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"];
const DEFAULT_TIMEOUT = 30_000;
const ABSOLUTE = /^[a-z][a-z\d+.-]*:/i;
// ":name" right after a slash, which leaves "http://host:3000" alone
const PARAM = /(?<=\/):([A-Za-z_]\w*)/g;

/**
 * @param {number | string | false | undefined} value
 * @returns {number | undefined} `undefined` for no limit.
 */
const _timeout = (value) => {
  if (value === false) return undefined;
  if (value === undefined) return DEFAULT_TIMEOUT;
  const ms = toMs(value, "timeout");
  return ms === Infinity ? undefined : ms;
};

/**
 * Headers as an object with lower-cased names.
 * @param {HttpHeaders | undefined} input
 * @returns {Record<string, string | undefined>}
 */
const _headerRecord = (input) => {
  /** @type {Record<string, string | undefined>} */
  const out = {};
  if (!input) return out;
  if (typeof (/** @type {Headers} */ (input).forEach) === "function" && !Array.isArray(input)) {
    /** @type {Headers} */ (input).forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  for (const [key, value] of Array.isArray(input) ? input : Object.entries(input)) {
    out[String(key).toLowerCase()] = value === undefined || value === null ? undefined : String(value);
  }
  return out;
};

/** @param {unknown} value */
const _queryValue = (value) => (types.isDate(value) ? value.toISOString() : String(value));

/**
 * @param {URLSearchParams} params
 * @param {QueryParams | URLSearchParams | undefined} query
 */
const _appendQuery = (params, query) => {
  if (!query) return;
  if (typeof (/** @type {URLSearchParams} */ (query).append) === "function") {
    for (const [key, value] of /** @type {URLSearchParams} */ (query)) params.append(key, value);
    return;
  }
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      params.delete(key);
      for (const item of value) params.append(key, _queryValue(item));
    } else {
      params.set(key, _queryValue(value));
    }
  }
};

/**
 * @template T
 * @param {T[] | undefined} a
 * @param {T[] | undefined} b
 * @returns {T[] | undefined}
 */
const _concat = (a, b) => (a?.length && b?.length ? [...a, ...b] : b?.length ? b : a);

/**
 * @param {HttpOptions} base
 * @param {HttpOptions} extra
 * @returns {HttpOptions}
 */
const _mergeOptions = (base, extra) => {
  const merged = { ...base, ...extra };
  if (base.headers && extra.headers) merged.headers = { ..._headerRecord(base.headers), ..._headerRecord(extra.headers) };
  if (base.params && extra.params) merged.params = { ...base.params, ...extra.params };
  if (base.query && extra.query) {
    // The client's query stays, the call adds to it or replaces a key.
    const query = new URLSearchParams();
    _appendQuery(query, base.query);
    _appendQuery(query, extra.query);
    merged.query = query;
  }
  if (base.hooks && extra.hooks) {
    merged.hooks = {
      beforeRequest: _concat(base.hooks.beforeRequest, extra.hooks.beforeRequest),
      afterResponse: _concat(base.hooks.afterResponse, extra.hooks.afterResponse),
      beforeRetry: _concat(base.hooks.beforeRetry, extra.hooks.beforeRetry),
    };
  }
  return merged;
};

/**
 * @param {string | URL} input
 * @param {HttpOptions} options
 * @returns {string}
 */
const _buildURL = (input, options) => {
  let url;
  if (typeof input !== "string") {
    url = new URL(String(input));
  } else {
    const params = options.params;
    const path = !params ? input : input.replace(PARAM, (_, name) => {
      const value = Object.hasOwn(params, name) ? params[name] : undefined;
      if (value === undefined || value === null) throw new TypeError(`Missing URL parameter "${name}" for ${input}`);
      return encodeURIComponent(String(value));
    });
    if (ABSOLUTE.test(path)) url = new URL(path);
    else if (options.baseURL) url = new URL(path.replace(/^\/+/, ""), String(options.baseURL).replace(/\/*$/, "/"));
    else throw new TypeError(`Invalid URL "${input}": use an absolute URL or set baseURL`);
  }
  _appendQuery(url.searchParams, options.query);
  return url.href;
};

/** @param {unknown} body */
const _isStream = (body) =>
  body !== null && typeof body === "object" && (typeof (/** @type {any} */ (body).pipe) === "function" || typeof (/** @type {any} */ (body).getReader) === "function");

/**
 * @param {Response} res
 * @param {HttpOptions["responseType"]} type
 * @param {HttpOptions["onDownloadProgress"]} onProgress
 * @returns {Promise<unknown>}
 */
const _readBody = async (res, type = "auto", onProgress) => {
  let buffer;
  if (onProgress && res.body) {
    const total = Number(res.headers.get("content-length")) || undefined;
    /** @type {Buffer[]} */
    const chunks = [];
    let loaded = 0;
    for await (const chunk of /** @type {AsyncIterable<Uint8Array>} */ (/** @type {unknown} */ (res.body))) {
      chunks.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      loaded += chunk.length;
      onProgress({ loaded, total, percent: total ? Math.min(100, (loaded / total) * 100) : undefined });
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
  if (type === "text" || (type === "auto" && (/^text\/|xml|javascript|x-www-form-urlencoded/i.test(contentType) || !contentType))) return text;
  return buffer;
};

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
  const signal = options.signal;
  const hooks = options.hooks;
  const retry = typeof options.retry === "object" && options.retry !== null ? options.retry : {};
  const statuses = retry.statuses ?? RETRY_STATUSES;
  const timeoutMs = _timeout(options.timeout);

  /** @type {Record<string, string>} */
  const headers = { accept: "application/json, text/plain, */*" };
  const given = _headerRecord(options.headers);
  for (const key of Object.keys(given)) {
    const value = given[key];
    if (value === undefined) delete headers[key];
    else headers[key] = value;
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

  // A stream can only be read once, so there's nothing to send a second time.
  const attempts = _isStream(body) || options.retry === false
    ? 1
    : typeof options.retry === "number"
      ? Math.max(1, Math.floor(options.retry))
      : retry.attempts ?? ((retry.methods ?? RETRY_METHODS).some((allowed) => allowed.toUpperCase() === method) ? 3 : 1);

  for (let attempt = 1; ; attempt++) {
    /** @type {HttpRequestConfig} */
    const config = { url: _buildURL(input, options), method, headers: { ...headers }, body, attempt };
    if (hooks?.beforeRequest) for (const hook of hooks.beforeRequest) await hook(config);
    if (signal?.aborted) throw new AbortError(`Request aborted: ${method} ${config.url}`, { cause: signal.reason });

    const controller = new AbortController();
    let timedOut = false;
    const stopTimer = timeoutMs === undefined ? undefined : setLongTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs, true);
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    const release = () => {
      stopTimer?.();
      signal?.removeEventListener("abort", onAbort);
    };

    /** @type {unknown} */
    let failure;
    let retryable = true;
    /** @type {number | undefined} */
    let serverDelay;
    /** @type {Response | undefined} */
    let res;
    /** @type {unknown} */
    let data;
    let streaming = false;
    try {
      const sent = method === "GET" || method === "HEAD" ? undefined : config.body;
      /** @type {any} */
      const init = { method, headers: config.headers, body: sent, signal: controller.signal, redirect: options.redirect ?? "follow" };
      if (_isStream(sent)) init.duplex = "half";
      res = await fetch(config.url, init);
      // An error status is read whole, so the error can show what the server said.
      streaming = options.responseType === "stream" && (res.ok || options.throwHttpErrors === false);
      if (method === "HEAD") {
        data = undefined;
      } else if (streaming) {
        // The headers are in: the time limit was for getting this far, not for reading a body of unknown size.
        stopTimer?.();
        const { Readable } = require("node:stream");
        const stream = res.body ? Readable.fromWeb(/** @type {any} */ (res.body)) : Readable.from([]);
        stream.once("close", release);
        data = stream;
      } else {
        data = await _readBody(res, options.responseType === "stream" ? "auto" : options.responseType, options.onDownloadProgress);
      }
    } catch (error) {
      release();
      if (signal?.aborted) throw new AbortError(`Request aborted: ${method} ${config.url}`, { cause: signal.reason });
      if (timedOut) {
        failure = new TimeoutError(`Request timed out after ${timeoutMs}ms: ${method} ${config.url}`, { timeout: timeoutMs, cause: error });
      } else if (error instanceof HttpError) {
        throw error;
      } else {
        /** @type {any} */
        const cause = error;
        /** @type {string} */
        const reason = cause?.cause?.code ?? cause?.cause?.message ?? cause?.message ?? String(error);
        failure = new HttpError(`Network error (${reason}): ${method} ${config.url}`, { status: 0, url: config.url, method, code: "ERR_NETWORK", cause: error });
      }
    }

    if (res && failure === undefined) {
      if (!streaming) release();
      /** @type {HttpResponse<any>} */
      let result = {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers),
        cookies: res.headers.getSetCookie(),
        data,
        url: res.url || config.url,
        duration: Date.now() - started,
        attempts: attempt,
      };
      if (hooks?.afterResponse) {
        for (const hook of hooks.afterResponse) {
          const replaced = await hook(result, config);
          if (replaced) result = replaced;
        }
      }
      if (result.ok || options.throwHttpErrors === false) {
        if (options.schema && result.ok) result.data = options.schema.parse(result.data);
        return result;
      }
      failure = new HttpError(`Request failed with status ${result.status}${result.statusText ? ` ${result.statusText}` : ""}: ${method} ${config.url}`, {
        status: result.status, statusText: result.statusText, url: result.url, method, headers: result.headers, data: result.data,
      });
      retryable = statuses.includes(result.status);
      serverDelay = _retryAfter(res.headers.get("retry-after"));
    }

    if (!retryable || attempt >= attempts) throw failure;
    const longest = toMs(retry.maxDelay ?? 30_000, "retry.maxDelay");
    let wait = Math.min(serverDelay ?? toMs(retry.delay ?? 300, "retry.delay") * (retry.backoff ?? 2) ** (attempt - 1), longest);
    if (retry.jitter && serverDelay === undefined) wait *= 0.5 + Math.random() / 2;
    if (hooks?.beforeRetry) for (const hook of hooks.beforeRetry) await hook(failure, attempt, wait);
    try {
      await sleep(wait, signal);
    } catch (error) {
      throw new AbortError(`Request aborted: ${method} ${config.url}`, { cause: signal?.reason ?? error });
    }
  }
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
  const merged = (/** @type {HttpOptions | undefined} */ options) => (options ? _mergeOptions(defaults, options) : defaults);
  /** @type {HttpClient} */
  const client = {
    request: (url, options) => _send(url, merged(options)),
    get: (url, options) => _send(url, { ...merged(options), method: "GET" }),
    head: (url, options) => _send(url, { ...merged(options), method: "HEAD" }),
    delete: (url, options) => _send(url, { ...merged(options), method: "DELETE" }),
    post: (url, data, options) => _send(url, { ..._withData(data, merged(options)), method: "POST" }),
    put: (url, data, options) => _send(url, { ..._withData(data, merged(options)), method: "PUT" }),
    patch: (url, data, options) => _send(url, { ..._withData(data, merged(options)), method: "PATCH" }),
    download: (url, destination, options) => download(url, destination, merged(options)),
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
 * @template [T=any] The type of `data`, when no `schema` says it.
 * @template {ResponseSchema} [S={ parse(data: unknown): T }]
 * @param {string | URL} url An absolute URL, or a path when `baseURL` is set.
 * @param {HttpOptionsOf<S>} [options]
 * @returns {Promise<HttpResponse<ReturnType<S["parse"]>>>}
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
 * @template [T=any] The type of `data`, when no `schema` says it.
 * @template {ResponseSchema} [S={ parse(data: unknown): T }]
 * @param {string | URL} url
 * @param {HttpOptionsOf<S>} [options]
 * @returns {Promise<HttpResponse<ReturnType<S["parse"]>>>}
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
 * @template [T=any] The type of `data`, when no `schema` says it.
 * @template {ResponseSchema} [S={ parse(data: unknown): T }]
 * @param {string | URL} url
 * @param {unknown} [data]
 * @param {HttpOptionsOf<S>} [options]
 * @returns {Promise<HttpResponse<ReturnType<S["parse"]>>>}
 */
function post(url, data, options = {}) {
  return _send(url, { ..._withData(data, options), method: "POST" });
}

/**
 * Sends a PUT request. The body works like in `post()`.
 *
 * @template [T=any] The type of `data`, when no `schema` says it.
 * @template {ResponseSchema} [S={ parse(data: unknown): T }]
 * @param {string | URL} url
 * @param {unknown} [data]
 * @param {HttpOptionsOf<S>} [options]
 * @returns {Promise<HttpResponse<ReturnType<S["parse"]>>>}
 */
function put(url, data, options = {}) {
  return _send(url, { ..._withData(data, options), method: "PUT" });
}

/**
 * Sends a PATCH request. The body works like in `post()`.
 *
 * @template [T=any] The type of `data`, when no `schema` says it.
 * @template {ResponseSchema} [S={ parse(data: unknown): T }]
 * @param {string | URL} url
 * @param {unknown} [data]
 * @param {HttpOptionsOf<S>} [options]
 * @returns {Promise<HttpResponse<ReturnType<S["parse"]>>>}
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
 * @template [T=any] The type of `data`, when no `schema` says it.
 * @template {ResponseSchema} [S={ parse(data: unknown): T }]
 * @param {string | URL} url
 * @param {HttpOptionsOf<S>} [options]
 * @returns {Promise<HttpResponse<ReturnType<S["parse"]>>>}
 */
function del(url, options = {}) {
  return _send(url, { ...options, method: "DELETE" });
}

/**
 * Downloads to a file as a stream, so memory stays flat whatever the size.
 * Folders are created. The data goes to a temporary file that takes the
 * final name once complete, so a failed or interrupted download never
 * leaves half a file where you expect a whole one.
 *
 * `timeout` is how long the server gets to start answering; the transfer
 * itself can take as long as it needs. Use `signal` to put a limit on it.
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
  const fs = require("node:fs");
  const nodePath = require("node:path");
  const { Transform } = require("node:stream");
  const { pipeline } = require("node:stream/promises");
  const target = nodePath.resolve(destination);
  fs.mkdirSync(nodePath.dirname(target), { recursive: true });
  const res = await _send(url, { ...options, responseType: "stream", throwHttpErrors: true, onDownloadProgress: undefined, schema: undefined });
  const total = Number(res.headers["content-length"]) || undefined;
  const partial = `${target}.${process.pid}-${Date.now().toString(36)}.part`;
  let size = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      options.onDownloadProgress?.({ loaded: size, total, percent: total ? Math.min(100, (size / total) * 100) : undefined });
      callback(null, chunk);
    },
  });
  try {
    await pipeline(/** @type {import("node:stream").Readable} */ (res.data), counter, fs.createWriteStream(partial), { signal: options.signal });
    fs.renameSync(partial, target);
  } catch (error) {
    fs.rmSync(partial, { force: true });
    if (options.signal?.aborted) throw new AbortError(`Download aborted: ${String(url)}`, { cause: error });
    /** @type {any} */
    const cause = error;
    // What went wrong on the disk names a file and stays as it is; the rest is the connection.
    if (typeof cause?.path === "string") throw error;
    throw new HttpError(`Download interrupted (${cause?.cause?.code ?? cause?.code ?? cause?.message ?? String(error)}): ${res.url}`, { status: 0, url: res.url, method: "GET", code: "ERR_NETWORK", cause: error });
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
