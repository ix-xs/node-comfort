---
title: "Client HTTP"
description: "`nc.http` : un client sur le `fetch` de Node.js. Il lit le corps, relance ce qui peut l'être sans risque, limite la durée des requêtes et lève des erreurs avec un `code`."
---

```js
const nc = require("@ix-xs/node-comfort");
const { http } = nc;
```

```js
const { data } = await http.get("https://api.example.com/users/42");
await http.post("https://api.example.com/users", { name: "Ada" });
```

| Membre | Rôle |
| --- | --- |
| `request(url, options?)` | N'importe quelle méthode, `GET` par défaut |
| `get`, `head`, `delete` | `(url, options?)` |
| `post`, `put`, `patch` | `(url, data?, options?)` : objets, tableaux, nombres et booléens partent en JSON |
| `download(url, destination, options?)` | Écrit une réponse dans un fichier, en flux |
| `create(defaults?)` | Un client avec des valeurs par défaut |

## Réponses

Chaque appel se résout une fois le corps lu :

```js
const res = await http.get("https://api.example.com/users/42");
res.status;   // 200
res.ok;       // true
res.data;     // { id: 42, name: "Ada" }
res.cookies;  // ["session=abc; Path=/; HttpOnly", "theme=dark; Path=/"]
res.attempts; // 1
```

| Champ | |
| --- | --- |
| `status`, `statusText`, `ok` | `ok` vaut `true` pour un 2xx |
| `headers` | Noms en minuscules, une valeur chacun |
| `cookies` | Chaque en-tête `Set-Cookie`, une chaîne par cookie |
| `data` | Le corps, lu selon `responseType` |
| `url` | L'URL finale, après les redirections |
| `duration` | En ms, relances comprises |
| `attempts` | Le nombre de tentatives |

| `responseType` | `data` est |
| --- | --- |
| `"auto"` (par défaut) | Du JSON analysé ou du texte, selon le type de contenu ; un `Buffer` sinon |
| `"json"`, `"text"`, `"buffer"` | Ce format |
| `"stream"` | Un flux lisible, que vous consommez |

## Vérifier le corps

`schema` appelle `parse()` sur le corps d'une réponse 2xx, et `data` reçoit son résultat. Tout objet doté d'une méthode `parse()` convient, en général un [schéma](/data/schema/) :

```js
const s = nc.schema;
const User = s.object({ id: s.number(), name: s.string() });

const { data: user } = await http.get("https://api.example.com/users/42", { schema: User });
// { id: 42, name: "Ada" }
```

Un corps non conforme lève une `ValidationError` qui nomme chaque champ. En TypeScript, `data` prend le type du schéma ; sans schéma il vaut `any`, ou le type que vous indiquez : `http.get<Repo>(url)`.

## URL et paramètres de requête

```js
await http.get("https://api.example.com/users/:id/files/:name", { params: { id: 42, name: "report 2026.pdf" } });
// https://api.example.com/users/42/files/report%202026.pdf

await http.get("https://api.example.com/posts", { query: { page: 2, tags: ["a", "b"], since: new Date("2026-01-01"), cursor: undefined } });
// https://api.example.com/posts?page=2&tags=a&tags=b&since=2026-01-01T00%3A00%3A00.000Z
```

| Option | |
| --- | --- |
| `params` | Remplit les parties `:nom` du chemin, encodées. Un nom absent, `"."` ou `".."` lève une `TypeError` avant tout envoi |
| `query` | Objet ou `URLSearchParams`, ajouté à la chaîne de requête de l'URL. `null` et `undefined` sont ignorés, un tableau répète la clé, une date part au format ISO |

## Envoyer des données

```js
await http.post(url, { name: "Ada" });                                        // JSON
await http.put(url, "raw text");                                              // tel quel
await http.post(url, formData);                                               // multipart
await http.request(url, { method: "POST", form: { a: 1, b: "x y" } });        // a=1&b=x+y
await http.post(url, { name: "Ada" }, { headers: { "idempotency-key": key } });
```

| Option | Envoyé comme |
| --- | --- |
| `json` | JSON |
| `form` | `application/x-www-form-urlencoded` |
| `body` | Tel quel : chaîne, `Buffer`, `FormData`, `Blob`, flux |
| `headers` | Objet, `Headers` ou paires `[nom, valeur]` |
| `auth` | `{ bearer }` ou `{ username, password }` : l'en-tête `authorization` |

## Erreurs

Un statut hors 2xx lève une `HttpError` qui contient la réponse :

```js
try {
  await http.get("https://api.example.com/users/42");
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

| Échec | Levée | `code` | Relancé |
| --- | --- | --- | --- |
| Statut hors 2xx | `HttpError` avec `status`, `headers`, `data`, `url`, `method` | `ERR_HTTP` | 408, 413, 429, 5xx |
| Pas de réponse | `HttpError` avec `status: 0` | `ERR_NETWORK` | Oui |
| Tentative trop lente | `TimeoutError` | `ETIMEDOUT` | Oui |
| Annulé | `AbortError` | `ABORT_ERR` | Non |
| Corps au-delà de `maxResponseSize` | `HttpError` | `ERR_RESPONSE_TOO_LARGE` | Non |
| Redirection refusée | `HttpError` | `ERR_REDIRECT` | Non |
| Plus de 20 redirections | `HttpError` | `ERR_TOO_MANY_REDIRECTS` | Non |

`throwHttpErrors: false` renvoie la réponse au lieu de lever. Le corps d'une réponse en erreur est toujours lu, même avec `responseType: "stream"` : `error.data` contient ce que le serveur a répondu. [Erreurs](/basics/errors/) liste toutes les classes.

## Les serveurs que vous ne maîtrisez pas

`nc.http` utilise le `fetch` de Node.js. Avant 22.23.4, 24.22.1 et 26.12.1, une seule réponse malveillante peut faire planter le processus ([GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c)) : la requête échoue avec une `HttpError`, puis le processus s'arrête quand même. Aucun paquet ne peut l'empêcher, et Node.js 25 n'a pas de correctif. Un programme qui appelle des adresses données par des utilisateurs, des webhooks ou tout serveur que vous ne maîtrisez pas doit tourner sur l'une de ces versions ou une version ultérieure.

## Limites

```js
await http.get(url, { timeout: "10s", maxResponseSize: "5MB" });
await http.get(url, { timeout: false, maxResponseSize: false }); // aucune limite
```

| Option | Par défaut | |
| --- | --- | --- |
| `timeout` | 30 secondes | Par tentative, en ms ou en texte. `false` ou `Infinity` : aucune. Avec `responseType: "stream"`, seulement l'attente des en-têtes |
| `maxResponseSize` | `"100MB"` | Corps lu en mémoire, compté une fois décompressé. `false` ou `Infinity` : aucune. Les flux et `download()` ne sont pas limités |
| `signal` | | Un `AbortSignal` ; rejette avec une `AbortError`, y compris pendant l'attente entre deux relances |

## Relances

`GET`, `HEAD`, `OPTIONS`, `PUT` et `DELETE` ont 3 tentatives au total, après une erreur réseau, un dépassement de délai ou un statut 408, 413, 429, 500, 502, 503 ou 504. L'attente double à partir de 300 ms, et `Retry-After` est respecté. `POST` et `PATCH` ne sont pas relancés.

```js
await http.get(url, { retry: 5 });      // 5 tentatives
await http.get(url, { retry: false });  // 1 tentative
await http.get(url, { retry: { attempts: 4, delay: "1s", maxDelay: "10s", jitter: true } });
await http.post(url, body, { retry: { attempts: 3 } }); // un nombre de tentatives vaut aussi pour POST
```

| Option de `retry` | Par défaut | |
| --- | --- | --- |
| `attempts` | `3` pour les méthodes sûres, `1` pour les autres | Première tentative comprise ; vaut pour toutes les méthodes quand il est donné |
| `delay` | `300` | Attente avant la première relance, en ms ou en texte |
| `backoff` | `2` | Multiplie l'attente après chaque tentative |
| `maxDelay` | 30 secondes | Attente la plus longue, `Retry-After` compris |
| `jitter` | `false` | `true` retire au hasard jusqu'à la moitié de chaque attente ; un nombre de `0` à `1`, jusqu'à cette part |
| `statuses` | 408, 413, 429, 500, 502, 503, 504 | Statuts qui valent une relance |
| `methods` | `GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE` | Méthodes relancées quand `attempts` n'est pas donné |

Une requête dont le corps est un flux part une seule fois, quoi que dise `retry`.

## Redirections

Jusqu'à 20 redirections sont suivies. Vers une autre origine (passer de `https` à `http` compte), `authorization`, `cookie`, `proxy-authorization` et les `sensitiveHeaders` sont retirés.

| Option | Par défaut | |
| --- | --- | --- |
| `redirect` | `"follow"` | `"manual"` renvoie la réponse 3xx ; `"error"` lève `ERR_REDIRECT` |
| `sensitiveHeaders` | `["x-api-key", "x-auth-token", "api-key"]` | Une liste donnée remplace celle-ci |

Une redirection vers un autre schéma que `http:` ou `https:`, ou qui obligerait à renvoyer un corps en flux, lève `ERR_REDIRECT`.

## Clients

`create()` renvoie un client dont les appels héritent des valeurs par défaut. Il a les mêmes méthodes, plus `extend()` et `defaults` :

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

Les `query` et `headers` d'un appel s'ajoutent à ceux du client ; un en-tête mis à `undefined` retire celui par défaut.

`baseURL` est une frontière : un chemin qui en sort lève une `TypeError` avant tout envoi, si bien qu'un chemin construit à partir d'une saisie ne peut pas emporter l'`auth` du client vers un autre hôte.

```js
await api.get("../admin");              // TypeError
await api.get("https://evil.example/"); // TypeError
await api.get("https://cdn.example.com/logo.png", { allowAbsoluteUrls: true, responseType: "buffer" });
```

Avec `allowAbsoluteUrls: true`, seul ce que donne l'appel part vers l'autre hôte : `auth`, `headers` et `query` du client restent sur son origine.

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

| Hook | Arguments | Peut |
| --- | --- | --- |
| `beforeRequest` | `config` : `url`, `method`, `headers`, `body`, `attempt` | Modifier l'URL, les en-têtes ou le corps |
| `afterResponse` | `response`, `config` | Renvoyer une autre réponse |
| `beforeRetry` | `error`, `attempt`, `delay` | Journaliser, attendre |

Les hooks d'un appel passent après ceux du client.

## Téléchargements

```js
const bar = nc.cli.progress({ total: 100 });
const { path, size } = await http.download("https://example.com/video.mp4", nc.fs.resolve("./downloads/video.mp4"), {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
  signal: AbortSignal.timeout(10 * 60_000),
});
bar.stop();
```

Le corps est écrit en flux dans un fichier temporaire à côté de la destination, qui prend le nom final une fois complet ; les dossiers sont créés. Un téléchargement raté ne laisse aucun fichier partiel et garde le fichier déjà présent. `timeout` ne couvre que l'attente de la réponse : limitez le transfert avec `signal`. Une destination relative se lit depuis le dossier de travail : passez `nc.fs.resolve()` pour un chemin à côté de votre fichier ([Conventions](/basics/conventions/)). `path` est absolu et `size` en octets. `onDownloadProgress` fonctionne sur tous les appels, avec `loaded`, `total` et `percent`.

## Avant 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.http.HttpError` | `nc.errors.HttpError` |

C'est la même classe : `instanceof` répond de même avec l'un ou l'autre nom.
