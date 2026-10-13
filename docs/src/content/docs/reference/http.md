---
title: "nc.http"
description: "An HTTP client on top of `fetch`: JSON by default, query objects, base URLs, timeouts, safe retries that respect `Retry-After`, typed errors, hooks, reusable clients and downloads with progress."
sidebar:
  label: "http"
  order: 18
---

```js
const { http } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const http = require("@ix-xs/node-comfort/http");
```

This page lists everything `nc.http` has, as your editor shows it. For explanations and longer examples, read [the guide](/system/http/).

```js
const { data } = await http.get("https://api.github.com/repos/nodejs/node");

const api = http.create({ baseURL: "https://api.example.com/v1/", auth: { bearer: process.env.TOKEN } });
const { data: users } = await api.get("users", { query: { page: 2 } });
```

## request

```ts
request<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Sends a request and resolves with the response, body already read.
Throws an `HttpError` for error statuses, a `TimeoutError` when it's too
slow and an `AbortError` when cancelled.

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | `string \| ``URL` | An absolute URL, or a path when `baseURL` is set. |
| `options?` | [`HttpOptionsOf`](#httpoptionsof)`<``S``>` |  |

**Throws** `HttpError | TimeoutError | AbortError`

```js
const res = await http.request("https://api.example.com/items/42", {
  method: "PUT",
  json: { name: "Lamp" },
  timeout: "10s",
  retry: { attempts: 5, statuses: [429, 503] },
});
res.data; // parsed JSON
```

## get

```ts
get<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Sends a GET request.

```js
const { data } = await http.get("https://api.example.com/users", { query: { page: 2, tags: ["a", "b"] } });
```

## head

```ts
head<T = undefined>(url: string | URL, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a HEAD request: headers only, no body.

```js
const { headers } = await http.head("https://example.com/big.zip");
headers["content-length"];
```

## post

```ts
post<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Sends a POST request. Objects, arrays, numbers and booleans go as JSON;
strings, Buffers, `FormData`, Blobs and streams go as they are.

```js
const { data: user } = await http.post("https://api.example.com/users", { name: "Ada" });
await http.post(uploadUrl, formData);
```

## put

```ts
put<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Sends a PUT request. The body works like in `post()`.

## patch

```ts
patch<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Sends a PATCH request. The body works like in `post()`.

## delete

```ts
delete<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Sends a DELETE request.

```js
await http.delete(`https://api.example.com/users/${id}`);
```

## download

```ts
download(url: string | URL, destination: string, options?: HttpOptions): Promise<{ path: string; size: number; }>
```

Downloads to a file as a stream, so memory stays flat whatever the size.
Folders are created. The data goes to a temporary file that takes the
final name once complete, so a failed or interrupted download never
leaves half a file where you expect a whole one.

`timeout` is how long the server gets to start answering; the transfer
itself can take as long as it needs. Use `signal` to put a limit on it.

**Returns** `Promise``<{ path: string, size: number }>`: The absolute path and size in bytes.

**Throws** `HttpError | TimeoutError | AbortError`

```js
await http.download("https://example.com/video.mp4", "./downloads/video.mp4", {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
});
```

## create

```ts
create(defaults?: HttpOptions): HttpClient
```

Creates a client with default options. Options passed to each call are
merged on top.

```js
const github = http.create({
  baseURL: "https://api.github.com",
  auth: { bearer: process.env.GITHUB_TOKEN },
  hooks: { afterResponse: [(res) => nc.debug(res.status, res.url)] },
});
const { data: repo } = await github.get("/repos/nodejs/node");
```

## HttpError

```ts
HttpError: typeof HttpError
```

Thrown by `nc.http` when the response status isn't 2xx (unless you pass
`throwHttpErrors: false`), and for network failures (`status` 0).

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { HttpBody } from "@ix-xs/node-comfort"`.

### HttpBody

A request body.

```ts
type HttpBody = string | Buffer | Uint8Array | ArrayBuffer | URLSearchParams | FormData | Blob | ReadableStream | Readable
```

### HttpClient

A client with its own defaults, from `create()`.

| Property | Type | Description |
| --- | --- | --- |
| `request` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Sends a request. |
| `get` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Sends a GET request. |
| `head` | `<``T`` = any>(url: string \| ``URL``, options?: `[`HttpOptions`](#httpoptions)`) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``T``>>` | Sends a HEAD request. |
| `delete` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Sends a DELETE request. |
| `post` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, data?: unknown, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Sends a POST request. Objects, arrays, numbers and booleans go as JSON. |
| `put` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, data?: unknown, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Sends a PUT request. Objects, arrays, numbers and booleans go as JSON. |
| `patch` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, data?: unknown, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Sends a PATCH request. Objects, arrays, numbers and booleans go as JSON. |
| `download` | `(url: string \| ``URL``, destination: string, options?: `[`HttpOptions`](#httpoptions)`) => ``Promise``<{ path: string; size: number; }>` | Saves a response to a file. |
| `extend` | `(defaults: `[`HttpOptions`](#httpoptions)`) => `[`HttpClient`](#httpclient) | A new client with these defaults added. |
| `defaults` | `Readonly``<`[`HttpOptions`](#httpoptions)`>` |  |

### HttpHeaders

Request headers: an object, a `Headers` instance or a list of pairs.

```ts
type HttpHeaders = Record<string, string | undefined> | Headers | Array<[string, string]>
```

### HttpHooks

Hooks to watch or change requests.

| Property | Type | Description |
| --- | --- | --- |
| `beforeRequest?` | `((config: `[`HttpRequestConfig`](#httprequestconfig)`) => void \| ``Promise``<void>)[]` | Runs before each attempt. It can change the URL, headers or body. |
| `afterResponse?` | `((response: `[`HttpResponse`](#httpresponse)`<any>, config: `[`HttpRequestConfig`](#httprequestconfig)`) => void \| `[`HttpResponse`](#httpresponse)`<any> \| ``Promise``<void \| `[`HttpResponse`](#httpresponse)`<any>>)[]` | Runs after each response, before errors are thrown. It can return another response. |
| `beforeRetry?` | `((error: unknown, attempt: number, delay: number) => void \| ``Promise``<void>)[]` | Runs before waiting for a retry. |

### HttpMethod

An HTTP method.

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | (string & {})
```

### HttpOptions

Request options.

| Property | Type | Description |
| --- | --- | --- |
| `method?` | [`HttpMethod`](#httpmethod) | Defaults to `"GET"`. |
| `baseURL?` | `string` | Prefix for relative URLs. |
| `headers?` | [`HttpHeaders`](#httpheaders) | Set a header to `undefined` to remove a default one. |
| `params?` | `Record``<string, string \| number \| boolean>` | Values for the `:name` parts of the URL: `"users/:id"` with `{ id: 42 }` gives `users/42`. They're encoded for you. |
| `query?` | `URLSearchParams`` \| `[`QueryParams`](#queryparams) | Added to the URL's own query string, and to the client's default query. |
| `json?` | `unknown` | Sent as JSON. |
| `form?` | `Record``<string, string \| number \| boolean>` | Sent as a URL-encoded form. |
| `body?` | [`HttpBody`](#httpbody) | Sent as is: string, Buffer, `FormData`, stream... |
| `auth?` | `{ bearer: string; } \| { username: string; password: string; }` | Sets the `authorization` header. |
| `timeout?` | `string \| number \| false` | Time limit per attempt, like `"10s"`. `false` turns it off. Defaults to 30 seconds. With `responseType: "stream"`, it only covers the wait for the response headers. |
| `retry?` | `number \| false \| `[`HttpRetryOptions`](#httpretryoptions) | Number of attempts, `false`, or retry settings. A request whose body is a stream is never retried. |
| `responseType?` | `"json" \| "buffer" \| "auto" \| "text" \| "stream"` | How to read the body. `"auto"` reads JSON or text based on the content type, a Buffer otherwise. |
| `schema?` | `{ parse(data: unknown): unknown; }` | Checks the body of a 2xx response, and replaces it with the result: pass a `nc.schema` and bad data from an API stops at the door, with a `ValidationError`. `data` takes the type the schema describes. |
| `throwHttpErrors?` | `boolean` | Throw an `HttpError` when the status isn't 2xx. Defaults to `true`. |
| `signal?` | `AbortSignal` | Cancels the request. |
| `hooks?` | [`HttpHooks`](#httphooks) |  |
| `onDownloadProgress?` | `((progress: { loaded: number; total: number \| undefined; percent: number \| undefined; }) => void)` | Called while the body downloads. |
| `redirect?` | `"error" \| "follow" \| "manual"` | Defaults to `"follow"`. |

### HttpOptionsOf

Request options, where `schema` gives `response.data` its type.

```ts
type HttpOptionsOf = Omit<HttpOptions, "schema"> & { schema?: S; }
```

### HttpRequestConfig

A request as hooks see it.

| Property | Type | Description |
| --- | --- | --- |
| `url` | `string` | The final URL, base URL and query included. |
| `method` | [`HttpMethod`](#httpmethod) |  |
| `headers` | `Record``<string, string>` | Lower-cased names. |
| `body` | [`HttpBody`](#httpbody) |  |
| `attempt` | `number` | 1 for the first try. |

### HttpResponse

A response.

| Property | Type | Description |
| --- | --- | --- |
| `status` | `number` |  |
| `statusText` | `string` |  |
| `ok` | `boolean` | `true` for 2xx statuses. |
| `headers` | `Record``<string, string>` | Lower-cased names. |
| `cookies` | `string[]` | The `Set-Cookie` headers, one per cookie. `headers` can only hold one of them. |
| `data` | `T` | The body, already read (see `responseType`). |
| `url` | `string` | The final URL, after redirects. |
| `duration` | `number` | In ms, retries included. |
| `attempts` | `number` | How many attempts it took. |

### HttpRetryOptions

Retry settings.

| Property | Type | Description |
| --- | --- | --- |
| `attempts?` | `number` | Total attempts, the first included. Defaults to `3` for methods that are safe to repeat, `1` for the others. A number you give applies to every method, POST included. |
| `delay?` | `string \| number` | Wait before the first retry, in ms or like `"1s"`. Defaults to `300`. |
| `backoff?` | `number` | Multiplies the wait after each attempt. Defaults to `2`. |
| `maxDelay?` | `string \| number` | Longest wait, `Retry-After` included. Defaults to 30 seconds. |
| `jitter?` | `boolean` | Shorten each wait by a random amount, up to half of it, so many clients don't all come back at the same instant. |
| `statuses?` | `number[]` | Statuses worth retrying. Defaults to 408, 413, 429, 500, 502, 503 and 504. |
| `methods?` | [`HttpMethod`](#httpmethod)`[]` | Methods retried when you give no number of attempts. POST and PATCH aren't, by default, so nothing gets created twice. |

### QueryParams

Query string values. `null` and `undefined` are skipped, arrays repeat the key, dates are sent in ISO format.

```ts
type QueryParams = Record<string, string | number | boolean | Date | null | undefined | Array<string | number | boolean | Date>>
```

### ResponseSchema

What the `schema` option takes: a `nc.schema`, or anything else with a
`parse()` method that returns the checked value or throws.

| Property | Type | Description |
| --- | --- | --- |
| `parse` | `(data: unknown) => unknown` |  |
