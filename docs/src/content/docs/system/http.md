---
title: "HTTP client"
description: "`nc.http` is a client built on Node's `fetch`. It reads JSON for you, retries what's safe to retry, times out slow requests, and throws errors you can act on."
sidebar:
  order: 1
---

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
res.cookies;  // ["session=abc; Path=/; HttpOnly", "theme=dark; Path=/"]
res.data;     // parsed JSON, text, or a Buffer, depending on the content type
res.attempts; // how many tries it took
res.duration; // total ms, retries included
```

`cookies` lists every `Set-Cookie` header, one string per cookie. `headers` can only hold one of them.

Force a format with `responseType: "json" | "text" | "buffer" | "stream"`. With `"stream"`, `data` is a readable stream that you consume yourself.

## Checking what came back

```js
const s = nc.schema;
const User = s.object({ id: s.number(), name: s.string() });

const { data: user } = await nc.http.get(`${api}/users/42`, { schema: User });
// { id: 42, name: "Ada" }
```

The body of a 2xx response goes through `User.parse()`, and `data` is what it returns. If the API sends something else, the call throws a `ValidationError` that names the field, so bad data stops there instead of travelling through your code. Anything with a `parse()` method works. A [schema](/data/schema/) is the usual choice.

In TypeScript, `data` takes the type the schema describes, here `{ id: number; name: string }`. Without a schema it's `any`, or the type you name: `nc.http.get<Repo>(url)`.

## URLs and query strings

```js
await nc.http.get(`${api}/users/:id/files/:name`, { params: { id: 42, name: "report 2026.pdf" } });
// .../users/42/files/report%202026.pdf
```

`params` fills the `:name` parts of the path and encodes the values. A name that's missing from `params` throws a `TypeError`, and nothing is sent.

Query strings can be objects. `null` and `undefined` are skipped, arrays repeat the key, and dates are sent in ISO format:

```js
await nc.http.get(url, { query: { page: 2, tags: ["a", "b"], since: new Date("2026-01-01"), cursor: undefined } });
// ...?page=2&tags=a&tags=b&since=2026-01-01T00%3A00%3A00.000Z
```

If the URL already has a query string, `query` is added to it.

## Sending data

```js
await nc.http.post(url, { name: "Ada" });        // objects and arrays go as JSON
await nc.http.put(url, "raw text");              // strings, Buffers, streams go as they are
await nc.http.post(url, formData);               // FormData for multipart uploads
await nc.http.request(url, { method: "POST", form: { a: 1, b: "x y" } }); // URL-encoded form
```

`headers` can be an object, a `Headers` instance or a list of `[name, value]` pairs:

```js
await nc.http.post(url, { name: "Ada" }, { headers: { "idempotency-key": nc.id.uuid() } });
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

The body of an error response is always read, even with `responseType: "stream"`, so `error.data` holds what the server said.

## Servers you don't control

`nc.http` uses the `fetch()` built into Node.js, so it depends on the version of Node.js you run. Before 22.23.4, 24.22.1 and 26.12.1, a single malicious response can stop your program ([GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c)): the request fails with an `HttpError` you can catch, then the process crashes anyway. No code in a package can prevent it, and Node.js 25 has no fix.

If your program calls addresses given by your users, webhooks or any server you don't control, use one of these versions or a later one.

## Timeouts and retries

Each attempt has 30 seconds by default. Change it with `timeout: "10s"`, or turn it off with `timeout: false`. With `responseType: "stream"`, the limit only covers the wait for the response headers. Once they're in, reading the body can take as long as it needs.

GET, HEAD, OPTIONS, PUT and DELETE requests get up to 3 attempts in total. They're retried after network errors, timeouts and the statuses 408, 413, 429, 500, 502, 503 and 504, waiting a bit longer each time (300 ms, then 600 ms). A `Retry-After` header is respected. POST and PATCH aren't retried, so nothing gets created twice.

```js
await nc.http.get(url, { retry: 5 });                          // 5 attempts
await nc.http.get(url, { retry: false });                      // none
await nc.http.get(url, { retry: { attempts: 4, delay: "1s", maxDelay: "10s", jitter: true } });
await nc.http.post(url, body, { retry: { attempts: 3, methods: ["POST"] } }); // if your API is idempotent
```

`delay` is the wait before the first retry. It doubles after each attempt (change that with `backoff`) and never goes past `maxDelay`, which is 30 seconds by default. `jitter: true` shortens each wait by a random amount, up to half of it, so that many clients don't all come back at the same instant.

A number of attempts that you give yourself, as `retry: 5` or as `attempts`, applies to every method, POST and PATCH included. A request whose body is a stream is sent only once, whatever `retry` says, because a stream can't be read a second time.

## Clients

`create()` makes a client with defaults that every call inherits:

```js
const api = nc.http.create({
  baseURL: "https://api.example.com/v1/",
  headers: { "x-app": "my-app" },
  query: { locale: "en" },
  auth: { bearer: process.env.API_TOKEN },
  timeout: "10s",
});

const { data: users } = await api.get("users", { query: { page: 2 } });
// GET https://api.example.com/v1/users?locale=en&page=2, with the x-app header

const { data: user } = await api.get("users/:id", { params: { id: 42 } });
const admin = api.extend({ headers: { "x-admin": "1" } });
```

What a call passes is added to the client's defaults. Its `query` and `headers` join the client's, and a key given again replaces the default one. To leave a default header out of one call, set it to `undefined`.

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

Hooks given to a call run after the client's.

## Downloads

```js
const bar = nc.cli.progress({ total: 100 });
const { path, size } = await nc.http.download("https://example.com/video.mp4", "./downloads/video.mp4", {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
});
bar.stop();
```

The file is streamed, so memory stays flat whatever its size. Folders are created. The data goes to a temporary file next to the destination, which takes the final name once the download is complete. If the download fails, the temporary file is removed, and a file that was already there is left as it was.

`timeout` is how long the server gets to start answering, 30 seconds by default. The transfer itself has no limit. To set one, pass a `signal`:

```js
await nc.http.download(url, "./downloads/video.mp4", { signal: AbortSignal.timeout(10 * 60_000) });
```

## Cancelling

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await nc.http.get(url, { signal: controller.signal });
```

The call rejects with an `AbortError`, also when it was waiting between two retries.

Every option is listed in the [reference](/reference/http/).
