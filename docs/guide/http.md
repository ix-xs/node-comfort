# HTTP client

`nc.http` is a client built on Node's `fetch`. It reads JSON for you, retries what's safe to retry, times out slow requests, and throws errors you can act on.

```js
const { data } = await nc.http.get("https://api.github.com/repos/nodejs/node");
await nc.http.post("https://api.example.com/users", { name: "Ada" });
```

## Responses

Every call resolves with a response whose body is already read:

```js
const res = await nc.http.get(url);
res.status;   // 200
res.ok;       // true for 2xx
res.headers;  // lower-cased names
res.data;     // parsed JSON, text, or a Buffer, depending on the content type
res.attempts; // how many tries it took
res.duration; // total ms, retries included
```

Force a format with `responseType: "json" | "text" | "buffer" | "stream"`.

## Sending data

```js
await nc.http.post(url, { name: "Ada" });        // objects and arrays go as JSON
await nc.http.put(url, "raw text");              // strings, Buffers, streams go as they are
await nc.http.post(url, formData);               // FormData for multipart uploads
await nc.http.request(url, { method: "POST", form: { a: 1, b: "x y" } }); // URL-encoded form
```

Query strings can be objects. `null` and `undefined` are skipped, arrays repeat the key:

```js
await nc.http.get(url, { query: { page: 2, tags: ["a", "b"], cursor: undefined } });
// ...?page=2&tags=a&tags=b
```

## Errors

A status outside 2xx throws an `HttpError` with the status, headers and body:

```js
try {
  await nc.http.get(`${api}/users/42`);
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

Pass `throwHttpErrors: false` to get the response instead. A network failure is an `HttpError` with `status: 0` and code `ERR_NETWORK`. A slow request throws a `TimeoutError`, and a cancelled one an `AbortError`.

## Timeouts and retries

Each attempt has 30 seconds by default. Change it with `timeout: "10s"`, or turn it off with `timeout: false`.

GET, HEAD, OPTIONS, PUT and DELETE requests get up to 3 attempts in total. They're retried after network errors, timeouts and the statuses 408, 413, 429, 500, 502, 503 and 504, waiting a bit longer each time (300 ms, then 600 ms). A `Retry-After` header is respected. POST and PATCH aren't retried, so nothing gets created twice.

```js
await nc.http.get(url, { retry: 5 });                          // 5 attempts
await nc.http.get(url, { retry: false });                      // none
await nc.http.post(url, body, { retry: { attempts: 3, methods: ["POST"] } }); // if your API is idempotent
```

## Clients

`create()` makes a client with defaults that every call inherits:

```js
const api = nc.http.create({
  baseURL: "https://api.example.com/v1/",
  headers: { "x-app": "my-app" },
  auth: { bearer: process.env.API_TOKEN },
  timeout: "10s",
});

const { data: users } = await api.get("users", { query: { page: 2 } });
const admin = api.extend({ headers: { "x-admin": "1" } });
```

`auth` also takes `{ username, password }` for basic authentication.

## Hooks

```js
const api = nc.http.create({
  hooks: {
    beforeRequest: [(config) => { config.headers["x-request-id"] = nc.id.uuid(); }],
    afterResponse: [(res) => nc.debug(res.status, res.url)],
    beforeRetry: [(error, attempt, delay) => nc.warn(`Retry ${attempt} in ${delay}ms`)],
  },
});
```

## Downloads

```js
const bar = nc.cli.progress({ total: 100 });
await nc.http.download("https://example.com/video.mp4", "./downloads/video.mp4", {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
});
bar.stop();
```

The file is streamed, so memory stays flat whatever its size. Folders are created, and a partial file is removed if the download fails.

## Cancelling

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await nc.http.get(url, { signal: controller.signal });
```
