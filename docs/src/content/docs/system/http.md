---
title: "HTTP client"
description: "`nc.http`: a client on the `fetch` of Node.js. It reads the body, retries what is safe to retry, times out slow requests and throws errors with a `code`."
---

```js
const nc = require("@ix-xs/node-comfort");
const { http } = nc;
```

```js
const { data } = await http.get("https://api.example.com/users/42");
await http.post("https://api.example.com/users", { name: "Ada" });
```

| Member | Does |
| --- | --- |
| `request(url, options?)` | Any method, `GET` by default |
| `get`, `head`, `delete` | `(url, options?)` |
| `post`, `put`, `patch` | `(url, data?, options?)`: objects, arrays, numbers and booleans go as JSON |
| `download(url, destination, options?)` | Streams a response to a file |
| `create(defaults?)` | A client with defaults |

## Responses

Every call resolves once the body is read:

```js
const res = await http.get("https://api.example.com/users/42");
res.status;   // 200
res.ok;       // true
res.data;     // { id: 42, name: "Ada" }
res.cookies;  // ["session=abc; Path=/; HttpOnly", "theme=dark; Path=/"]
res.attempts; // 1
```

| Field | |
| --- | --- |
| `status`, `statusText`, `ok` | `ok` is `true` for 2xx |
| `headers` | Lower-cased names, one value each |
| `cookies` | Every `Set-Cookie` header, one string per cookie |
| `data` | The body, read according to `responseType` |
| `url` | The final URL, after redirects |
| `duration` | In ms, retries included |
| `attempts` | How many attempts it took |

| `responseType` | `data` is |
| --- | --- |
| `"auto"` (default) | Parsed JSON or text, from the content type; a `Buffer` otherwise |
| `"json"`, `"text"`, `"buffer"` | That format |
| `"stream"` | A readable stream, consumed by you |

## Checking the body

`schema` runs `parse()` on the body of a 2xx response, and `data` is its result. Any object with a `parse()` method works, usually a [schema](/data/schema/):

```js
const s = nc.schema;
const User = s.object({ id: s.number(), name: s.string() });

const { data: user } = await http.get("https://api.example.com/users/42", { schema: User });
// { id: 42, name: "Ada" }
```

A body that does not match throws a `ValidationError` naming each field. In TypeScript, `data` gets the type of the schema; without one it is `any`, or the type you name: `http.get<Repo>(url)`.

## URLs and query strings

```js
await http.get("https://api.example.com/users/:id/files/:name", { params: { id: 42, name: "report 2026.pdf" } });
// https://api.example.com/users/42/files/report%202026.pdf

await http.get("https://api.example.com/posts", { query: { page: 2, tags: ["a", "b"], since: new Date("2026-01-01"), cursor: undefined } });
// https://api.example.com/posts?page=2&tags=a&tags=b&since=2026-01-01T00%3A00%3A00.000Z
```

| Option | |
| --- | --- |
| `params` | Fills the `:name` parts of the path, encoded. A missing name, `"."` or `".."` throws a `TypeError` before anything is sent |
| `query` | Object or `URLSearchParams`, added to the query string of the URL. `null` and `undefined` are skipped, arrays repeat the key, dates are sent in ISO format |

## Sending data

```js
await http.post(url, { name: "Ada" });                                        // JSON
await http.put(url, "raw text");                                              // as is
await http.post(url, formData);                                               // multipart
await http.request(url, { method: "POST", form: { a: 1, b: "x y" } });        // a=1&b=x+y
await http.post(url, { name: "Ada" }, { headers: { "idempotency-key": key } });
```

| Option | Sent as |
| --- | --- |
| `json` | JSON |
| `form` | `application/x-www-form-urlencoded` |
| `body` | As is: string, `Buffer`, `FormData`, `Blob`, stream |
| `headers` | Object, `Headers` or `[name, value]` pairs |
| `auth` | `{ bearer }` or `{ username, password }`: the `authorization` header |

## Errors

A status outside 2xx throws an `HttpError` holding the response:

```js
try {
  await http.get("https://api.example.com/users/42");
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

| Failure | Thrown | `code` | Retried |
| --- | --- | --- | --- |
| Status outside 2xx | `HttpError` with `status`, `headers`, `data`, `url`, `method` | `ERR_HTTP` | 408, 413, 429, 5xx |
| No answer | `HttpError` with `status: 0` | `ERR_NETWORK` | Yes |
| Slow attempt | `TimeoutError` | `ETIMEDOUT` | Yes |
| Cancelled | `AbortError` | `ABORT_ERR` | No |
| Body over `maxResponseSize` | `HttpError` | `ERR_RESPONSE_TOO_LARGE` | No |
| Redirect refused | `HttpError` | `ERR_REDIRECT` | No |
| More than 20 redirects | `HttpError` | `ERR_TOO_MANY_REDIRECTS` | No |

`throwHttpErrors: false` returns the response instead of throwing. The body of an error response is always read, even with `responseType: "stream"`, so `error.data` holds what the server said. [Errors](/basics/errors/) lists every class.

## Servers you don't control

`nc.http` uses the `fetch` of Node.js. Before 22.23.4, 24.22.1 and 26.12.1, a single malicious response can crash the process ([GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c)): the request fails with an `HttpError`, then the process stops anyway. No package can prevent it, and Node.js 25 has no fix. A program that calls addresses given by users, webhooks or any server you don't control needs one of these versions or a later one.

## Limits

```js
await http.get(url, { timeout: "10s", maxResponseSize: "5MB" });
await http.get(url, { timeout: false, maxResponseSize: false }); // no limit
```

| Option | Default | |
| --- | --- | --- |
| `timeout` | 30 seconds | Per attempt, in ms or text. `false` or `Infinity`: none. With `responseType: "stream"`, only the wait for the headers |
| `maxResponseSize` | `"100MB"` | Body read into memory, counted once decompressed. `false` or `Infinity`: none. Streams and `download()` are not limited |
| `signal` | | An `AbortSignal`; rejects with an `AbortError`, also while waiting between retries |

## Retries

`GET`, `HEAD`, `OPTIONS`, `PUT` and `DELETE` get 3 attempts in total, after a network error, a timeout or a status 408, 413, 429, 500, 502, 503 or 504. The wait doubles from 300 ms, and `Retry-After` is respected. `POST` and `PATCH` are not retried.

```js
await http.get(url, { retry: 5 });      // 5 attempts
await http.get(url, { retry: false });  // 1 attempt
await http.get(url, { retry: { attempts: 4, delay: "1s", maxDelay: "10s", jitter: true } });
await http.post(url, body, { retry: { attempts: 3 } }); // a number of attempts applies to POST too
```

| `retry` option | Default | |
| --- | --- | --- |
| `attempts` | `3` for the safe methods, `1` for the others | First attempt included; applies to every method when given |
| `delay` | `300` | Wait before the first retry, ms or text |
| `backoff` | `2` | Multiplies the wait after each attempt |
| `maxDelay` | 30 seconds | Longest wait, `Retry-After` included |
| `jitter` | `false` | `true` takes up to half of each wait off at random; a number from `0` to `1` up to that share |
| `statuses` | 408, 413, 429, 500, 502, 503, 504 | Statuses worth retrying |
| `methods` | `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE` | Methods retried when no `attempts` is given |

A request whose body is a stream is sent once, whatever `retry` says.

## Redirects

Up to 20 redirects are followed. On a move to another origin (`https` to `http` counts), `authorization`, `cookie`, `proxy-authorization` and the `sensitiveHeaders` are dropped.

| Option | Default | |
| --- | --- | --- |
| `redirect` | `"follow"` | `"manual"` returns the 3xx response; `"error"` throws `ERR_REDIRECT` |
| `sensitiveHeaders` | `["x-api-key", "x-auth-token", "api-key"]` | A list you give replaces this one |

A redirect to a scheme other than `http:` or `https:`, or one that would send a stream body again, throws `ERR_REDIRECT`.

## Clients

`create()` returns a client whose calls inherit its defaults. It has the same methods, plus `extend()` and `defaults`:

```js
const api = http.create({
  baseURL: "https://api.example.com/v1/",
  headers: { "x-app": "my-app" },
  query: { locale: "en" },
  auth: { bearer: process.env.API_TOKEN },
  timeout: "10s",
});

const { data: users } = await api.get("users", { query: { page: 2 } });
// GET https://api.example.com/v1/users?locale=en&page=2

const admin = api.extend({ headers: { "x-admin": "1" } });
```

The `query` and `headers` of a call join those of the client; a header set to `undefined` removes a default one.

`baseURL` is a boundary: a path that leaves it throws a `TypeError` before anything is sent, so a path built from user input cannot carry the client's `auth` to another host.

```js
await api.get("../admin");              // TypeError
await api.get("https://evil.example/"); // TypeError
await api.get("https://cdn.example.com/logo.png", { allowAbsoluteUrls: true, responseType: "buffer" });
```

With `allowAbsoluteUrls: true`, only what the call gives goes to the other host: the client's `auth`, `headers` and `query` stay with its base origin.

## Hooks

```js
const api = http.create({
  hooks: {
    beforeRequest: [(config) => { config.headers["x-request-id"] = nc.id.uuid(); }],
    afterResponse: [(res) => nc.logger.debug(res.status, res.url)],
    beforeRetry: [(error, attempt, delay) => nc.logger.warn(`Retry ${attempt} in ${delay}ms`)],
  },
});
```

| Hook | Arguments | Can |
| --- | --- | --- |
| `beforeRequest` | `config`: `url`, `method`, `headers`, `body`, `attempt` | Change the URL, headers or body |
| `afterResponse` | `response`, `config` | Return another response |
| `beforeRetry` | `error`, `attempt`, `delay` | Log, wait |

The hooks of a call run after those of the client.

## Downloads

```js
const bar = nc.cli.progress({ total: 100 });
const { path, size } = await http.download("https://example.com/video.mp4", nc.fs.resolve("./downloads/video.mp4"), {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
  signal: AbortSignal.timeout(10 * 60_000),
});
bar.stop();
```

The body is streamed to a temporary file next to the destination, which takes the final name once complete; folders are created. A failed download leaves no partial file and keeps a file that was already there. `timeout` covers the wait for the answer only: limit the transfer with `signal`. A relative destination is read from the working directory, so pass `nc.fs.resolve()` for a path next to your file ([Conventions](/basics/conventions/)). `path` is absolute and `size` in bytes. `onDownloadProgress` works on every call, with `loaded`, `total` and `percent`.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.http.HttpError` | `nc.errors.HttpError` |

It is the same class: `instanceof` gives the same answer with either name.
