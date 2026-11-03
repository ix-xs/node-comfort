"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const nodeHttp = require("node:http");
const zlib = require("node:zlib");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const nc = require("..");

/** @type {import("node:http").Server} */
let api;
/** @type {import("node:http").Server} */
let evil;
let base = "";
let evilBase = "";
/** @type {Array<{ method: string, url: string, headers: import("node:http").IncomingHttpHeaders }>} */
let evilHits = [];
let flaky = 0;
/** @type {Promise<void> | undefined} */
let hangClosed;
const bomb = zlib.gzipSync(Buffer.alloc(16 * 1024 * 1024));

/** @param {import("node:http").Server} server */
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}`)));

before(async () => {
  api = nodeHttp.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let body = "";
    for await (const chunk of req) body += chunk;
    const json = (/** @type {number} */ status, /** @type {unknown} */ data, headers = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(JSON.stringify(data));
    };
    const size = Number(url.searchParams.get("size") ?? 0);
    switch (url.pathname) {
      case "/admin":
        return json(200, { admin: true });
      case "/bomb":
        res.writeHead(200, { "content-type": "application/octet-stream", "content-encoding": "gzip", "content-length": String(bomb.length) });
        return res.end(bomb);
      case "/huge-length":
        res.writeHead(200, { "content-type": "application/octet-stream", "content-length": String(200 * 1024 * 1024) });
        return void res.write("x");
      case "/big":
        res.writeHead(Number(url.searchParams.get("status") ?? 200), { "content-type": "text/plain", "content-length": String(size) });
        return res.end(Buffer.alloc(size, "a"));
      case "/redirect":
        res.writeHead(Number(url.searchParams.get("status") ?? 302), { location: url.searchParams.get("to") ?? "/" });
        return res.end();
      case "/loop":
        res.writeHead(302, { location: "/loop" });
        return res.end();
      case "/flaky":
        return ++flaky < 2 ? json(503, { error: "busy" }) : json(200, { ok: true });
      case "/hang":
        // Starts a body and never ends it: only the client can close the connection.
        hangClosed = new Promise((resolve) => res.once("close", () => resolve()));
        res.writeHead(200, { "content-type": "application/octet-stream" });
        return void res.write(Buffer.alloc(1024));
      case "/user":
        return json(200, { id: 7, name: "Ada" });
      case "/slow":
        return void setTimeout(() => json(200, { late: true }), 500);
      case "/fail":
        return json(500, size ? { blob: "z".repeat(size) } : { error: "boom" }, {
          "set-cookie": ["session=abc; HttpOnly"],
          "www-authenticate": "Bearer realm=x",
          "x-request-id": "r1",
        });
      default:
        if (url.pathname === "/v1" || url.pathname.startsWith("/v1/")) return json(200, { method: req.method, url: req.url, headers: req.headers, body });
        return json(404, { error: "not found" });
    }
  });
  evil = nodeHttp.createServer((req, res) => {
    evilHits.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers });
    req.resume();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ evil: true, headers: req.headers, url: req.url }));
  });
  base = /** @type {string} */ (await listen(api));
  evilBase = /** @type {string} */ (await listen(evil));
});

after(() => {
  for (const server of [api, evil]) {
    server.closeAllConnections();
    server.close();
  }
});

describe("http security: baseURL is a boundary", () => {
  const client = () => nc.http.create({ baseURL: `${base}/v1/`, auth: { bearer: "s3cret" }, headers: { "x-app": "nc" }, query: { key: "k" }, retry: false });

  it("a path can't take the client's credentials to another host", async () => {
    const host = evilBase.slice("http://".length);
    const api = client();
    evilHits = [];
    for (const input of [`${evilBase}/x`, `\\\\${host}/x`, `\t//${host}/x`, ` ${evilBase}/`, `//${host}/x`, `/\\${host}/x`]) {
      const outcome = await api.get(input).then((res) => res, (error) => error);
      if (outcome instanceof Error) assert.ok(outcome instanceof TypeError, `${JSON.stringify(input)} throws a TypeError, not ${outcome}`);
      else assert.ok(new URL(outcome.url).pathname.startsWith("/v1/"), `${JSON.stringify(input)} stays under the base, went to ${outcome.url}`);
    }
    assert.equal(evilHits.length, 0, "nothing reached the other host");
  });

  it("a path can't climb out of the base path", async () => {
    const api = client();
    await assert.rejects(api.get("../../admin"), TypeError);
    await assert.rejects(api.get("%2e%2e/admin"), TypeError);
    await assert.rejects(api.get(new URL(`${evilBase}/x`)), TypeError);
  });

  it("relative paths under the base still work, with the client's credentials", async () => {
    const api = client();
    for (const input of ["users/1", "/users/1", `${base}/v1/users/1`]) {
      const { data } = await api.get(input);
      assert.equal(data.url, "/v1/users/1?key=k");
      assert.equal(data.headers.authorization, "Bearer s3cret");
      assert.equal(data.headers["x-app"], "nc");
    }
  });

  it("the base URL itself is under the base, with or without its slash, but a longer segment isn't", async () => {
    const api = nc.http.create({ baseURL: `${base}/v1`, retry: false });
    assert.equal((await api.get(`${base}/v1`)).data.url, "/v1");
    assert.equal((await api.get(`${base}/v1?page=2`)).data.url, "/v1?page=2");
    assert.equal((await api.get(`${base}/v1`, { allowAbsoluteUrls: true })).data.url, "/v1");
    assert.equal((await api.get("")).data.url, "/v1/");
    assert.equal((await api.get("?page=2")).data.url, "/v1/?page=2");
    for (const input of [`${base}/v10`, `${base}/v10/x`, `${base}/v1x`, "../v10"]) await assert.rejects(api.get(input), TypeError, input);
    await assert.rejects(nc.http.create({ baseURL: `${base}/v1/` }).get(`${base}/v10`), TypeError);
  });

  it("allowAbsoluteUrls sends an absolute URL elsewhere, without the client's credentials", async () => {
    const api = client();
    evilHits = [];
    const { data } = await api.get(`${evilBase}/files?x=1`, { allowAbsoluteUrls: true, headers: { "x-call": "c" } });
    assert.equal(data.evil, true);
    assert.equal(data.url, "/files?x=1", "the client's query stays home");
    assert.equal(data.headers.authorization, undefined);
    assert.equal(data.headers["x-app"], undefined);
    assert.equal(data.headers["x-call"], "c");
    const same = await api.get(`${base}/v1/me`, { allowAbsoluteUrls: true });
    assert.equal(same.data.headers.authorization, "Bearer s3cret");
    const own = await nc.http.get(`${evilBase}/own`, { baseURL: `${base}/v1/`, allowAbsoluteUrls: true, auth: { bearer: "mine" } });
    assert.equal(own.data.headers.authorization, "Bearer mine", "a call's own auth goes where the call says");
    await assert.rejects(api.get("../../admin", { allowAbsoluteUrls: true }), TypeError, "a relative path still can't climb out");
  });
});

describe("http security: response size", () => {
  it("a zip bomb stops at maxResponseSize", async () => {
    await assert.rejects(nc.http.get(`${base}/bomb`, { maxResponseSize: "1MB", retry: false }), (error) => {
      assert.ok(error instanceof nc.errors.HttpError);
      assert.equal(error.code, "ERR_RESPONSE_TOO_LARGE");
      return true;
    });
  });

  it("a content-length above the limit is rejected before reading", async () => {
    const startedAt = Date.now();
    await assert.rejects(nc.http.get(`${base}/huge-length`, { timeout: "5s", retry: false }), { code: "ERR_RESPONSE_TOO_LARGE" });
    assert.ok(Date.now() - startedAt < 3000);
  });

  it("an error body is cut at 1 MB in stream and download mode", async () => {
    const error = await nc.http.get(`${base}/big?size=${3 * 1024 * 1024}&status=404`, { responseType: "stream" }).catch((e) => e);
    assert.equal(error.status, 404);
    assert.equal(error.data.length, 1024 * 1024);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-sec-"));
    try {
      const failed = await nc.http.download(`${base}/big?size=${3 * 1024 * 1024}&status=404`, path.join(dir, "x.bin")).catch((e) => e);
      assert.equal(failed.status, 404);
      assert.equal(failed.data.length, 1024 * 1024);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("large but allowed bodies are read whole, and download() isn't limited", async () => {
    const size = 2 * 1024 * 1024;
    const { data } = await nc.http.get(`${base}/big?size=${size}`, { maxResponseSize: "3MB", responseType: "buffer" });
    assert.equal(data.length, size);
    assert.equal((await nc.http.get(`${base}/big?size=${size}`, { maxResponseSize: Infinity })).data.length, size);
    assert.equal((await nc.http.get(`${base}/big?size=${size}`)).data.length, size, "under the default 100 MB");
    const progress = [];
    await nc.http.get(`${base}/big?size=${size}`, { maxResponseSize: size, onDownloadProgress: (p) => progress.push(p.loaded) });
    assert.equal(progress.at(-1), size);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-sec-"));
    try {
      const done = await nc.http.download(`${base}/big?size=${size}`, path.join(dir, "big.bin"), { maxResponseSize: 1000 });
      assert.equal(done.size, size);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    await assert.rejects(nc.http.get(`${base}/big?size=10`, { maxResponseSize: "lots" }), TypeError);
  });
});

describe("http security: reading the body", () => {
  it("a download progress callback that throws cancels the read and closes the connection", async () => {
    const failure = new Error("callback failed");
    const error = await nc.http.get(`${base}/hang`, { retry: false, responseType: "buffer", onDownloadProgress: () => { throw failure; } }).catch((e) => e);
    assert.ok(error === failure || error.cause === failure, String(error));
    /** @type {NodeJS.Timeout | undefined} */
    let timer;
    const open = new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("the connection stayed open")), 2000)));
    try {
      await Promise.race([hangClosed, open]);
    } finally {
      clearTimeout(timer);
    }
  });
});

describe("http security: params", () => {
  it("a param can't be a dot segment", async () => {
    const api = nc.http.create({ baseURL: `${base}/v1/` });
    await assert.rejects(api.get("users/:id/sessions", { params: { id: ".." } }), TypeError);
    await assert.rejects(api.get("users/:id/sessions", { params: { id: "." } }), TypeError);
    const { data } = await api.get("users/:id/sessions", { params: { id: "..." } });
    assert.equal(data.url, "/v1/users/.../sessions");
  });
});

describe("http security: download temporary file", () => {
  it("has a name nobody can guess, and is only ever created, never reused", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-sec-"));
    const original = fs.createWriteStream;
    /** @type {Array<{ file: string, options: any }>} */
    const opened = [];
    fs.createWriteStream = /** @type {any} */ ((/** @type {any} */ file, /** @type {any} */ options) => {
      opened.push({ file: String(file), options });
      return original(file, options);
    });
    try {
      const done = await nc.http.download(`${base}/big?size=10`, path.join(dir, "file.bin"));
      assert.equal(done.size, 10);
      assert.equal(opened.length, 1);
      assert.match(path.basename(opened[0].file), /^file\.bin\.[0-9a-f]{16}\.part$/);
      assert.equal(opened[0].options?.flags, "wx");
      assert.equal(opened[0].options?.mode, 0o600);
      assert.deepEqual(fs.readdirSync(dir), ["file.bin"]);
    } finally {
      fs.createWriteStream = original;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("http security: redirects", () => {
  const secrets = { "x-api-key": "k", "X-Auth-Token": "t", cookie: "a=1", "x-custom": "c" };

  it("secret headers don't follow a redirect to another origin", async () => {
    evilHits = [];
    const { data, url } = await nc.http.get(`${base}/redirect?to=${encodeURIComponent(`${evilBase}/landing`)}`, { headers: secrets, auth: { bearer: "s3cret" } });
    assert.equal(data.evil, true);
    assert.equal(url, `${evilBase}/landing`);
    const seen = evilHits[0].headers;
    for (const name of ["x-api-key", "x-auth-token", "cookie", "authorization"]) assert.equal(seen[name], undefined, name);
    assert.equal(seen["x-custom"], "c");
    evilHits = [];
    await nc.http.get(`${base}/redirect?to=${encodeURIComponent(`${evilBase}/landing`)}`, { headers: secrets, sensitiveHeaders: ["X-Custom"] });
    assert.equal(evilHits[0].headers["x-custom"], undefined);
    assert.equal(evilHits[0].headers.cookie, undefined, "cookie is always dropped");
  });

  it("the client's auth never follows a redirect elsewhere", async () => {
    const api = nc.http.create({ baseURL: `${base}/`, auth: { bearer: "s3cret" } });
    evilHits = [];
    await api.get(`redirect?to=${encodeURIComponent(`${evilBase}/landing`)}`);
    assert.equal(evilHits[0].headers.authorization, undefined);
  });

  it("a same-origin redirect keeps the headers and gives the final URL", async () => {
    const api = nc.http.create({ baseURL: `${base}/`, auth: { bearer: "s3cret" }, headers: secrets });
    const res = await api.get("redirect?to=/v1/echo");
    assert.equal(res.url, `${base}/v1/echo`);
    assert.equal(res.data.headers.authorization, "Bearer s3cret");
    assert.equal(res.data.headers["x-api-key"], "k");
    assert.equal(res.data.headers.cookie, "a=1");
  });

  it("methods and bodies change like fetch does", async () => {
    let res = await nc.http.post(`${base}/redirect?status=303&to=/v1/echo`, { a: 1 });
    assert.equal(res.data.method, "GET");
    assert.equal(res.data.body, "");
    assert.equal(res.data.headers["content-type"], undefined);
    res = await nc.http.post(`${base}/redirect?status=301&to=/v1/echo`, { a: 1 });
    assert.equal(res.data.method, "GET");
    res = await nc.http.post(`${base}/redirect?status=307&to=/v1/echo`, { a: 1 });
    assert.equal(res.data.method, "POST");
    assert.equal(res.data.body, '{"a":1}');
    res = await nc.http.put(`${base}/redirect?status=308&to=/v1/echo`, "again");
    assert.equal(res.data.method, "PUT");
    assert.equal(res.data.body, "again");
    await assert.rejects(nc.http.post(`${base}/redirect?status=307&to=/v1/echo`, Readable.from(["a"])), { code: "ERR_REDIRECT" });
  });

  it("redirect modes, and loops stop", async () => {
    const manual = await nc.http.get(`${base}/redirect?to=/v1/echo`, { redirect: "manual", throwHttpErrors: false });
    assert.equal(manual.status, 302);
    assert.equal(manual.headers.location, "/v1/echo");
    await assert.rejects(nc.http.get(`${base}/redirect?to=/v1/echo`, { redirect: "error" }), { code: "ERR_REDIRECT" });
    await assert.rejects(nc.http.get(`${base}/loop`), { code: "ERR_TOO_MANY_REDIRECTS" });
  });

  it("retries, timeouts, hooks and schema work across redirects", async () => {
    flaky = 0;
    const statuses = [];
    const res = await nc.http.get(`${base}/redirect?to=/flaky`, { retry: { delay: 1 }, hooks: { afterResponse: [(r) => void statuses.push(r.status)] } });
    assert.equal(res.attempts, 2);
    assert.deepEqual(statuses, [503, 200]);
    assert.equal(res.url, `${base}/flaky`);
    await assert.rejects(nc.http.get(`${base}/redirect?to=/slow`, { timeout: 100, retry: false }), { name: "TimeoutError" });
    const User = nc.schema.object({ id: nc.schema.number(), name: nc.schema.string() });
    assert.deepEqual((await nc.http.get(`${base}/redirect?to=/user`, { schema: User })).data, { id: 7, name: "Ada" });
  });
});

describe("http security: HttpError doesn't leak", () => {
  it("masks secret query values and keeps secrets out of toJSON()", async () => {
    const error = await nc.http.get(`${base}/fail?api_key=SECRET1&access_token=SECRET2&page=2`, { retry: false }).catch((e) => e);
    assert.ok(error instanceof nc.errors.HttpError);
    assert.equal(error.status, 500);
    assert.doesNotMatch(error.message, /SECRET/);
    assert.match(error.message, /api_key=\*\*\*&access_token=\*\*\*&page=2/);
    assert.equal(error.url, `${base}/fail?api_key=***&access_token=***&page=2`);
    const json = JSON.parse(JSON.stringify(error));
    assert.doesNotMatch(JSON.stringify(json), /SECRET|session=abc|realm/);
    assert.equal(json.headers["set-cookie"], undefined);
    assert.equal(json.headers["www-authenticate"], undefined);
    assert.equal(json.headers["x-request-id"], "r1");
    assert.deepEqual(json.data, { error: "boom" }, "a small body stays");
    assert.equal(json.status, 500);
    assert.equal(json.method, "GET");
    assert.equal(json.code, "ERR_HTTP");
    assert.equal(error.headers["set-cookie"], "session=abc; HttpOnly", "the error itself keeps everything");
  });

  it("leaves a large body out of toJSON(), but keeps it on the error", async () => {
    const error = await nc.http.get(`${base}/fail?size=10000`, { retry: false }).catch((e) => e);
    assert.equal(error.data.blob.length, 10000);
    const json = JSON.parse(JSON.stringify(error));
    assert.equal("data" in json, false);
    assert.equal(json.status, 500);
  });

  it("the constructor masks on its own", () => {
    const error = new nc.errors.HttpError("Failed: GET https://a.example/x?sig=abc&q=1 and https://b.example/?password=p", { url: "https://a.example/x?sig=abc&q=1#top" });
    assert.equal(error.message, "Failed: GET https://a.example/x?sig=***&q=1 and https://b.example/?password=***");
    assert.equal(error.url, "https://a.example/x?sig=***&q=1#top");
  });

  it("masking costs linear time, even on a long status text from the server", () => {
    const started = performance.now();
    new nc.errors.HttpError(`Request failed with status 500 ${"a.".repeat(32 * 1024)}`);
    assert.ok(performance.now() - started < 50);
    const error = new nc.errors.HttpError("GET http://a.example/?token=t then (https://b.example/?api_key=k");
    assert.equal(error.message, "GET http://a.example/?token=*** then (https://b.example/?api_key=***");
  });
});
