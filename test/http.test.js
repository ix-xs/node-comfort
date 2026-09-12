"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const nc = require("..");

let server;
let base;
const hits = new Map();
const hit = (key) => hits.set(key, (hits.get(key) ?? 0) + 1) && hits.get(key);

before(async () => {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let body = "";
    for await (const chunk of req) body += chunk;
    const send = (status, data, headers = {}) => {
      const isText = typeof data === "string";
      res.writeHead(status, { "content-type": isText ? "text/plain" : "application/json", ...headers });
      res.end(isText ? data : JSON.stringify(data));
    };
    switch (url.pathname) {
      case "/echo":
        return send(200, { method: req.method, query: Object.fromEntries(url.searchParams), tags: url.searchParams.getAll("tag"), headers: req.headers, body, type: req.headers["content-type"] ?? null });
      case "/text":
        return send(200, "plain text");
      case "/missing":
        return send(404, { error: "not found" });
      case "/flaky":
        return hit("flaky") < 3 ? send(503, { error: "busy" }) : send(200, { ok: true, attempts: hits.get("flaky") });
      case "/rate":
        return hit("rate") < 2 ? send(429, "slow down", { "retry-after": "0" }) : send(200, "ok");
      case "/post-fail":
        hit("post-fail");
        return send(503, "busy");
      case "/slow":
        return setTimeout(() => send(200, "late"), 500);
      case "/binary":
        res.writeHead(200, { "content-type": "application/octet-stream", "content-length": "4" });
        return res.end(Buffer.from([1, 2, 3, 4]));
      case "/file": {
        const data = Buffer.alloc(100_000, 7);
        res.writeHead(200, { "content-type": "application/octet-stream", "content-length": String(data.length) });
        return res.end(data);
      }
      default:
        return send(500, "unexpected");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

describe("http: requests", () => {
  it("GET with query parsing JSON", async () => {
    const res = await nc.http.get(`${base}/echo?x=1`, { query: { page: 2, tag: ["a", "b"], skip: undefined } });
    assert.equal(res.status, 200);
    assert.equal(res.ok, true);
    assert.deepEqual(res.data.query, { x: "1", page: "2", tag: "b" });
    assert.deepEqual(res.data.tags, ["a", "b"]);
    assert.equal(res.headers["content-type"], "application/json");
    assert.equal(res.attempts, 1);
  });

  it("POST/PUT/PATCH send JSON, forms and raw bodies", async () => {
    let res = await nc.http.post(`${base}/echo`, { name: "Ada" });
    assert.equal(res.data.body, '{"name":"Ada"}');
    assert.equal(res.data.type, "application/json");
    res = await nc.http.put(`${base}/echo`, "raw text");
    assert.equal(res.data.body, "raw text");
    res = await nc.http.patch(`${base}/echo`, [1, 2]);
    assert.equal(res.data.method, "PATCH");
    res = await nc.http.request(`${base}/echo`, { method: "POST", form: { a: 1, b: "x y" } });
    assert.equal(res.data.body, "a=1&b=x+y");
    res = await nc.http.delete(`${base}/echo`);
    assert.equal(res.data.method, "DELETE");
    res = await nc.http.head(`${base}/echo`);
    assert.equal(res.data, undefined);
  });

  it("response types", async () => {
    assert.equal((await nc.http.get(`${base}/text`)).data, "plain text");
    const bin = await nc.http.get(`${base}/binary`);
    assert.ok(Buffer.isBuffer(bin.data));
    assert.deepEqual([...bin.data], [1, 2, 3, 4]);
    assert.equal((await nc.http.get(`${base}/text`, { responseType: "buffer" })).data.toString(), "plain text");
  });

  it("auth headers", async () => {
    let res = await nc.http.get(`${base}/echo`, { auth: { bearer: "t0k" } });
    assert.equal(res.data.headers.authorization, "Bearer t0k");
    res = await nc.http.get(`${base}/echo`, { auth: { username: "ada", password: "pw" } });
    assert.equal(res.data.headers.authorization, `Basic ${Buffer.from("ada:pw").toString("base64")}`);
  });
});

describe("http: errors and resilience", () => {
  it("throws HttpError with status and data", async () => {
    await assert.rejects(nc.http.get(`${base}/missing`), (e) => e instanceof nc.errors.HttpError && e.status === 404 && e.data.error === "not found");
    const res = await nc.http.get(`${base}/missing`, { throwHttpErrors: false });
    assert.equal(res.status, 404);
  });

  it("retries idempotent requests on 5xx and honours Retry-After", async () => {
    const retries = [];
    const res = await nc.http.get(`${base}/flaky`, { retry: { delay: 5 }, hooks: { beforeRetry: [(error, attempt) => retries.push(attempt)] } });
    assert.equal(res.data.ok, true);
    assert.equal(res.attempts, 3);
    assert.deepEqual(retries, [1, 2]);
    assert.equal((await nc.http.get(`${base}/rate`)).data, "ok");
  });

  it("never retries POST by default", async () => {
    await assert.rejects(nc.http.post(`${base}/post-fail`, {}), (e) => e.status === 503);
    assert.equal(hits.get("post-fail"), 1);
  });

  it("timeouts, aborts and network errors", async () => {
    await assert.rejects(nc.http.get(`${base}/slow`, { timeout: 50, retry: false }), (e) => e instanceof nc.errors.TimeoutError);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);
    await assert.rejects(nc.http.get(`${base}/slow`, { signal: controller.signal }), (e) => e.name === "AbortError");
    await assert.rejects(nc.http.get("http://127.0.0.1:1/", { retry: false }), (e) => e instanceof nc.errors.HttpError && e.status === 0 && e.code === "ERR_NETWORK");
    await assert.rejects(nc.http.get("/relative"), TypeError);
  });
});

describe("http: clients, hooks, download", () => {
  it("create, extend, baseURL and hooks", async () => {
    const seen = [];
    const api = nc.http.create({
      baseURL: `${base}/`,
      headers: { "x-app": "nc" },
      hooks: {
        beforeRequest: [(config) => { config.headers["x-request"] = "1"; }],
        afterResponse: [(res) => { seen.push(res.status); }],
      },
    });
    const res = await api.get("/echo");
    assert.equal(res.data.headers["x-app"], "nc");
    assert.equal(res.data.headers["x-request"], "1");
    assert.deepEqual(seen, [200]);
    const admin = api.extend({ headers: { "x-admin": "yes" } });
    const res2 = await admin.post("echo", { a: 1 });
    assert.equal(res2.data.headers["x-app"], "nc");
    assert.equal(res2.data.headers["x-admin"], "yes");
    assert.equal(api.defaults.baseURL, `${base}/`);
  });

  it("download streams to a file with progress", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-http-"));
    try {
      const progress = [];
      const result = await nc.http.download(`${base}/file`, path.join(dir, "sub", "file.bin"), { onDownloadProgress: (p) => progress.push(p.percent) });
      assert.equal(result.size, 100_000);
      assert.equal(fs.statSync(result.path).size, 100_000);
      assert.equal(progress.at(-1), 100);
      await assert.rejects(nc.http.download(`${base}/missing`, path.join(dir, "missing.bin")), (e) => e.status === 404);
      assert.equal(fs.existsSync(path.join(dir, "missing.bin")), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("onDownloadProgress on regular requests", async () => {
    const progress = [];
    await nc.http.get(`${base}/file`, { onDownloadProgress: (p) => progress.push(p.loaded) });
    assert.equal(progress.at(-1), 100_000);
  });
});
