---
title: "nc.http"
description: "Un client HTTP construit sur `fetch` : JSON par défaut, objets pour la chaîne de requête, URL de base, timeouts, nouvelles tentatives sûres qui respectent `Retry-After`, erreurs typées, hooks, clients réutilisables et téléchargements avec progression."
sidebar:
  label: "http"
  order: 18
---

```js
const { http } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const http = require("@ix-xs/node-comfort/http");
```

Cette page liste tout ce que contient `nc.http`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/system/http/).

```js
const { data } = await http.get("https://api.github.com/repos/nodejs/node");

const api = http.create({ baseURL: "https://api.example.com/v1/", auth: { bearer: process.env.TOKEN } });
const { data: users } = await api.get("users", { query: { page: 2 } });
```

## request

```ts
request<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Envoie une requête et se résout avec la réponse, corps déjà lu. Lève une `HttpError` pour les statuts d'erreur, une `TimeoutError` quand elle est trop lente et une `AbortError` quand elle est annulée.

| Paramètre | Type | Description |
| --- | --- | --- |
| `url` | `string \| ``URL` | Une URL absolue, ou un chemin quand `baseURL` est défini. |
| `options?` | [`HttpOptionsOf`](#httpoptionsof)`<``S``>` |  |

**Lève** `HttpError | TimeoutError | AbortError`

```js
const res = await http.request("https://api.example.com/items/42", {
  method: "PUT",
  json: { name: "Lamp" },
  timeout: "10s",
  retry: { attempts: 5, statuses: [429, 503] },
});
res.data; // JSON analysé
```

## get

```ts
get<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Envoie une requête GET.

```js
const { data } = await http.get("https://api.example.com/users", { query: { page: 2, tags: ["a", "b"] } });
```

## head

```ts
head<T = undefined>(url: string | URL, options?: HttpOptions): Promise<HttpResponse<T>>
```

Envoie une requête HEAD : les en-têtes seulement, sans corps.

```js
const { headers } = await http.head("https://example.com/big.zip");
headers["content-length"];
```

## post

```ts
post<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Envoie une requête POST. Les objets, tableaux, nombres et booléens partent en JSON ; les chaînes, Buffers, `FormData`, Blobs et streams partent tels quels.

```js
const { data: user } = await http.post("https://api.example.com/users", { name: "Ada" });
await http.post(uploadUrl, formData);
```

## put

```ts
put<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Envoie une requête PUT. Le corps fonctionne comme dans `post()`.

## patch

```ts
patch<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, data?: unknown, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Envoie une requête PATCH. Le corps fonctionne comme dans `post()`.

## delete

```ts
delete<T = any, S extends ResponseSchema = { parse(data: unknown): T; }>(url: string | URL, options?: HttpOptionsOf<S>): Promise<HttpResponse<ReturnType<S["parse"]>>>
```

Envoie une requête DELETE.

```js
await http.delete(`https://api.example.com/users/${id}`);
```

## download

```ts
download(url: string | URL, destination: string, options?: HttpOptions): Promise<{ path: string; size: number; }>
```

Télécharge vers un fichier en stream, la mémoire reste donc stable quelle que soit la taille. Les dossiers sont créés. Les données vont dans un fichier temporaire qui prend le nom final une fois complet : un téléchargement échoué ou interrompu ne laisse donc jamais une moitié de fichier là où vous en attendez un entier.

`timeout` est le temps dont dispose le serveur pour commencer à répondre ; le transfert lui-même peut durer aussi longtemps que nécessaire. Utilisez `signal` pour lui fixer une limite.

**Renvoie** `Promise``<{ path: string, size: number }>` : Le chemin absolu et la taille en octets.

**Lève** `HttpError | TimeoutError | AbortError`

```js
await http.download("https://example.com/video.mp4", "./downloads/video.mp4", {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
});
```

## create

```ts
create(defaults?: HttpOptions): HttpClient
```

Crée un client avec des options par défaut. Les options passées à chaque appel sont fusionnées par-dessus.

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

Levée par `nc.http` quand le statut de la réponse n'est pas 2xx (sauf si vous passez `throwHttpErrors: false`), et pour les échecs réseau (`status` 0).

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { HttpBody } from "@ix-xs/node-comfort"`.

### HttpBody

Un corps de requête.

```ts
type HttpBody = string | Buffer | Uint8Array | ArrayBuffer | URLSearchParams | FormData | Blob | ReadableStream | Readable
```

### HttpClient

Un client avec ses propres valeurs par défaut, créé par `create()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `request` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Envoie une requête. |
| `get` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Envoie une requête GET. |
| `head` | `<``T`` = any>(url: string \| ``URL``, options?: `[`HttpOptions`](#httpoptions)`) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``T``>>` | Envoie une requête HEAD. |
| `delete` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Envoie une requête DELETE. |
| `post` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, data?: unknown, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Envoie une requête POST. Les objets, les tableaux, les nombres et les booléens partent en JSON. |
| `put` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, data?: unknown, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Envoie une requête PUT. Les objets, les tableaux, les nombres et les booléens partent en JSON. |
| `patch` | `<``T`` = any, ``S`` extends `[`ResponseSchema`](#responseschema)` = { parse(data: unknown): ``T``; }>(url: string \| ``URL``, data?: unknown, options?: `[`HttpOptionsOf`](#httpoptionsof)`<``S``>) => ``Promise``<`[`HttpResponse`](#httpresponse)`<``ReturnType``<``S``["parse"]>>>` | Envoie une requête PATCH. Les objets, les tableaux, les nombres et les booléens partent en JSON. |
| `download` | `(url: string \| ``URL``, destination: string, options?: `[`HttpOptions`](#httpoptions)`) => ``Promise``<{ path: string; size: number; }>` | Enregistre une réponse dans un fichier. |
| `extend` | `(defaults: `[`HttpOptions`](#httpoptions)`) => `[`HttpClient`](#httpclient) | Un nouveau client avec ces valeurs par défaut en plus. |
| `defaults` | `Readonly``<`[`HttpOptions`](#httpoptions)`>` |  |

### HttpHeaders

En-têtes de requête : un objet, une instance de `Headers` ou une liste de paires.

```ts
type HttpHeaders = Record<string, string | undefined> | Headers | Array<[string, string]>
```

### HttpHooks

Hooks pour observer ou modifier les requêtes.

| Propriété | Type | Description |
| --- | --- | --- |
| `beforeRequest?` | `((config: `[`HttpRequestConfig`](#httprequestconfig)`) => void \| ``Promise``<void>)[]` | S'exécute avant chaque tentative. Il peut modifier l'URL, les en-têtes ou le corps. |
| `afterResponse?` | `((response: `[`HttpResponse`](#httpresponse)`<any>, config: `[`HttpRequestConfig`](#httprequestconfig)`) => void \| `[`HttpResponse`](#httpresponse)`<any> \| ``Promise``<void \| `[`HttpResponse`](#httpresponse)`<any>>)[]` | S'exécute après chaque réponse, avant que les erreurs soient levées. Il peut renvoyer une autre réponse. |
| `beforeRetry?` | `((error: unknown, attempt: number, delay: number) => void \| ``Promise``<void>)[]` | S'exécute avant l'attente d'une nouvelle tentative. |

### HttpMethod

Une méthode HTTP.

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | (string & {})
```

### HttpOptions

Options de requête.

| Propriété | Type | Description |
| --- | --- | --- |
| `method?` | [`HttpMethod`](#httpmethod) | Par défaut : `"GET"`. |
| `baseURL?` | `string` | Préfixe pour les URL relatives. |
| `headers?` | [`HttpHeaders`](#httpheaders) | Mettez un en-tête à `undefined` pour retirer un en-tête par défaut. |
| `params?` | `Record``<string, string \| number \| boolean>` | Valeurs pour les parties `:name` de l'URL : `"users/:id"` avec `{ id: 42 }` donne `users/42`. Elles sont encodées pour vous. |
| `query?` | `URLSearchParams`` \| `[`QueryParams`](#queryparams) | Ajouté à la chaîne de requête de l'URL elle-même, et à celle par défaut du client. |
| `json?` | `unknown` | Envoyé en JSON. |
| `form?` | `Record``<string, string \| number \| boolean>` | Envoyé sous forme de formulaire encodé en URL. |
| `body?` | [`HttpBody`](#httpbody) | Envoyé tel quel : chaîne, Buffer, `FormData`, stream... |
| `auth?` | `{ bearer: string; } \| { username: string; password: string; }` | Définit l'en-tête `authorization`. |
| `timeout?` | `string \| number \| false` | Limite de temps par tentative, comme `"10s"`. `false` la désactive. Par défaut : 30 secondes. Avec `responseType: "stream"`, elle ne couvre que l'attente des en-têtes de la réponse. |
| `retry?` | `number \| false \| `[`HttpRetryOptions`](#httpretryoptions) | Nombre de tentatives, `false`, ou réglages des nouvelles tentatives. Une requête dont le corps est un stream n'est jamais retentée. |
| `responseType?` | `"json" \| "buffer" \| "auto" \| "text" \| "stream"` | Comment lire le corps. `"auto"` lit du JSON ou du texte selon le type de contenu, un Buffer sinon. |
| `schema?` | `{ parse(data: unknown): unknown; }` | Vérifie le corps d'une réponse 2xx, et le remplace par le résultat : passez un `nc.schema` et les mauvaises données d'une API s'arrêtent à la porte, avec une `ValidationError`. `data` prend le type que décrit le schéma. |
| `throwHttpErrors?` | `boolean` | Lever une `HttpError` quand le statut n'est pas 2xx. Par défaut : `true`. |
| `signal?` | `AbortSignal` | Annule la requête. |
| `hooks?` | [`HttpHooks`](#httphooks) |  |
| `onDownloadProgress?` | `((progress: { loaded: number; total: number \| undefined; percent: number \| undefined; }) => void)` | Appelé pendant le téléchargement du corps. |
| `redirect?` | `"error" \| "follow" \| "manual"` | Par défaut : `"follow"`. |

### HttpOptionsOf

Options de requête, où `schema` donne son type à `response.data`.

```ts
type HttpOptionsOf = Omit<HttpOptions, "schema"> & { schema?: S; }
```

### HttpRequestConfig

Une requête telle que la voient les hooks.

| Propriété | Type | Description |
| --- | --- | --- |
| `url` | `string` | L'URL finale, URL de base et chaîne de requête comprises. |
| `method` | [`HttpMethod`](#httpmethod) |  |
| `headers` | `Record``<string, string>` | Noms en minuscules. |
| `body` | [`HttpBody`](#httpbody) |  |
| `attempt` | `number` | 1 pour le premier essai. |

### HttpResponse

Une réponse.

| Propriété | Type | Description |
| --- | --- | --- |
| `status` | `number` |  |
| `statusText` | `string` |  |
| `ok` | `boolean` | `true` pour les statuts 2xx. |
| `headers` | `Record``<string, string>` | Noms en minuscules. |
| `cookies` | `string[]` | Les en-têtes `Set-Cookie`, un par cookie. `headers` ne peut en contenir qu'un seul. |
| `data` | `T` | Le corps, déjà lu (voir `responseType`). |
| `url` | `string` | L'URL finale, après les redirections. |
| `duration` | `number` | En ms, nouvelles tentatives comprises. |
| `attempts` | `number` | Le nombre de tentatives qu'il a fallu. |

### HttpRetryOptions

Réglages des nouvelles tentatives.

| Propriété | Type | Description |
| --- | --- | --- |
| `attempts?` | `number` | Nombre total de tentatives, la première comprise. Par défaut : `3` pour les méthodes que l'on peut répéter sans risque, `1` pour les autres. Un nombre que vous donnez s'applique à toutes les méthodes, POST compris. |
| `delay?` | `string \| number` | Attente avant la première nouvelle tentative, en ms ou sous la forme `"1s"`. Par défaut : `300`. |
| `backoff?` | `number` | Multiplie l'attente après chaque tentative. Par défaut : `2`. |
| `maxDelay?` | `string \| number` | Attente la plus longue, `Retry-After` compris. Par défaut : 30 secondes. |
| `jitter?` | `boolean` | Raccourcir chaque attente d'une durée aléatoire, jusqu'à la moitié, pour que de nombreux clients ne reviennent pas tous au même instant. |
| `statuses?` | `number[]` | Statuts qui méritent une nouvelle tentative. Par défaut : 408, 413, 429, 500, 502, 503 et 504. |
| `methods?` | [`HttpMethod`](#httpmethod)`[]` | Méthodes retentées quand vous ne donnez pas de nombre de tentatives. POST et PATCH ne le sont pas, par défaut, pour que rien ne soit créé deux fois. |

### QueryParams

Valeurs de la chaîne de requête. `null` et `undefined` sont ignorés, les tableaux répètent la clé, les dates sont envoyées au format ISO.

```ts
type QueryParams = Record<string, string | number | boolean | Date | null | undefined | Array<string | number | boolean | Date>>
```

### ResponseSchema

Ce qu'accepte l'option `schema` : un `nc.schema`, ou tout autre objet doté d'une méthode `parse()` qui renvoie la valeur vérifiée ou lève une erreur.

| Propriété | Type | Description |
| --- | --- | --- |
| `parse` | `(data: unknown) => unknown` |  |
