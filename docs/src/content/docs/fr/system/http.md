---
title: "Client HTTP"
description: "`nc.http` est un client construit sur le `fetch` de Node. Il lit le JSON pour vous, relance ce qui peut l'être sans risque, interrompt les requêtes trop lentes et lève des erreurs exploitables."
sidebar:
  order: 1
---

```js
const { data } = await nc.http.get("https://api.github.com/repos/nodejs/node");
await nc.http.post("https://api.example.com/users", { name: "Ada" });
```

## Réponses

Chaque appel se résout avec une réponse dont le corps est déjà lu :

```js
const res = await nc.http.get(url);
res.status;   // 200
res.ok;       // true pour les 2xx
res.headers;  // noms en minuscules
res.cookies;  // ["session=abc; Path=/; HttpOnly", "theme=dark; Path=/"]
res.data;     // JSON analysé, texte ou Buffer, selon le type de contenu
res.attempts; // nombre de tentatives qu'il a fallu
res.duration; // total en ms, nouvelles tentatives comprises
```

`cookies` liste tous les en-têtes `Set-Cookie`, à raison d'une chaîne par cookie. `headers` ne peut en contenir qu'un seul.

Imposez un format avec `responseType: "json" | "text" | "buffer" | "stream"`. Avec `"stream"`, `data` est un stream lisible que vous consommez vous-même.

## Vérifier ce que vous recevez

```js
const s = nc.schema;
const User = s.object({ id: s.number(), name: s.string() });

const { data: user } = await nc.http.get(`${api}/users/42`, { schema: User });
// { id: 42, name: "Ada" }
```

Le corps d'une réponse 2xx passe par `User.parse()`, et `data` contient ce que cette méthode renvoie. Si l'API envoie autre chose, l'appel lève une `ValidationError` qui nomme le champ en cause : les mauvaises données s'arrêtent là au lieu de circuler dans votre code. Tout objet doté d'une méthode `parse()` convient. Un [schéma](/data/schema/) est le choix habituel.

En TypeScript, `data` prend le type que décrit le schéma, ici `{ id: number; name: string }`. Sans schéma, c'est `any`, ou le type que vous indiquez : `nc.http.get<Repo>(url)`.

## URL et chaînes de requête

```js
await nc.http.get(`${api}/users/:id/files/:name`, { params: { id: 42, name: "report 2026.pdf" } });
// .../users/42/files/report%202026.pdf
```

`params` remplit les parties `:name` du chemin et encode les valeurs. Un nom absent de `params` lève une `TypeError`, et rien n'est envoyé.

Une chaîne de requête peut être un objet. `null` et `undefined` sont ignorés, les tableaux répètent la clé et les dates sont envoyées au format ISO :

```js
await nc.http.get(url, { query: { page: 2, tags: ["a", "b"], since: new Date("2026-01-01"), cursor: undefined } });
// ...?page=2&tags=a&tags=b&since=2026-01-01T00%3A00%3A00.000Z
```

Si l'URL contient déjà une chaîne de requête, `query` s'y ajoute.

## Envoyer des données

```js
await nc.http.post(url, { name: "Ada" });        // les objets et les tableaux partent en JSON
await nc.http.put(url, "raw text");              // les chaînes, Buffers et streams partent tels quels
await nc.http.post(url, formData);               // FormData pour les envois multipart
await nc.http.request(url, { method: "POST", form: { a: 1, b: "x y" } }); // formulaire encodé en URL
```

`headers` peut être un objet, une instance de `Headers` ou une liste de paires `[name, value]` :

```js
await nc.http.post(url, { name: "Ada" }, { headers: { "idempotency-key": nc.id.uuid() } });
```

## Erreurs

Un statut hors 2xx lève une `HttpError` qui porte le statut, les en-têtes et le corps :

```js
try {
  await nc.http.get(`${api}/users/42`);
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

Passez `throwHttpErrors: false` pour recevoir la réponse à la place. Une panne réseau donne une `HttpError` avec `status: 0` et le code `ERR_NETWORK`. Une requête trop lente lève une `TimeoutError`, et une requête annulée une `AbortError`.

Le corps d'une réponse d'erreur est toujours lu, même avec `responseType: "stream"` : `error.data` contient donc ce que le serveur a répondu.

## Timeouts et nouvelles tentatives

Chaque tentative dispose de 30 secondes par défaut. Changez cette durée avec `timeout: "10s"`, ou désactivez-la avec `timeout: false`. Avec `responseType: "stream"`, la limite ne couvre que l'attente des en-têtes de la réponse. Une fois ceux-ci reçus, la lecture du corps peut prendre le temps qu'il faut.

Les requêtes GET, HEAD, OPTIONS, PUT et DELETE ont droit à 3 tentatives au maximum, en tout. Elles sont relancées après une erreur réseau, un timeout ou l'un des statuts 408, 413, 429, 500, 502, 503 et 504, avec une attente un peu plus longue à chaque fois (300 ms, puis 600 ms). Un en-tête `Retry-After` est respecté. POST et PATCH ne sont pas relancés : rien n'est donc créé en double.

```js
await nc.http.get(url, { retry: 5 });                          // 5 tentatives
await nc.http.get(url, { retry: false });                      // aucune
await nc.http.get(url, { retry: { attempts: 4, delay: "1s", maxDelay: "10s", jitter: true } });
await nc.http.post(url, body, { retry: { attempts: 3, methods: ["POST"] } }); // si votre API est idempotente
```

`delay` est l'attente avant la première nouvelle tentative. Elle double après chaque tentative (ce que vous changez avec `backoff`) et ne dépasse jamais `maxDelay`, fixé à 30 secondes par défaut. `jitter: true` raccourcit chaque attente d'une durée aléatoire, jusqu'à la moitié, pour que de nombreux clients ne reviennent pas tous au même instant.

Un nombre de tentatives que vous fixez vous-même, avec `retry: 5` ou avec `attempts`, s'applique à toutes les méthodes, POST et PATCH compris. Une requête dont le corps est un stream n'est envoyée qu'une fois, quelle que soit la valeur de `retry`, car un stream ne se lit pas une seconde fois.

## Clients

`create()` crée un client avec des valeurs par défaut dont chaque appel hérite :

```js
const api = nc.http.create({
  baseURL: "https://api.example.com/v1/",
  headers: { "x-app": "my-app" },
  query: { locale: "en" },
  auth: { bearer: process.env.API_TOKEN },
  timeout: "10s",
});

const { data: users } = await api.get("users", { query: { page: 2 } });
// GET https://api.example.com/v1/users?locale=en&page=2, avec l'en-tête x-app

const { data: user } = await api.get("users/:id", { params: { id: 42 } });
const admin = api.extend({ headers: { "x-admin": "1" } });
```

Ce qu'un appel passe s'ajoute aux valeurs par défaut du client. Ses `query` et ses `headers` rejoignent ceux du client, et une clé donnée à nouveau remplace celle par défaut. Pour écarter un en-tête par défaut le temps d'un appel, donnez-lui la valeur `undefined`.

`auth` accepte aussi `{ username, password }` pour l'authentification basique.

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

Les hooks passés à un appel s'exécutent après ceux du client.

## Téléchargements

```js
const bar = nc.cli.progress({ total: 100 });
const { path, size } = await nc.http.download("https://example.com/video.mp4", "./downloads/video.mp4", {
  onDownloadProgress: ({ percent }) => bar.update(percent ?? 0),
});
bar.stop();
```

Le fichier est écrit en flux, donc la mémoire reste stable quelle que soit sa taille. Les dossiers sont créés. Les données vont dans un fichier temporaire à côté de la destination, qui prend son nom définitif une fois le téléchargement terminé. Si le téléchargement échoue, le fichier temporaire est supprimé, et un fichier déjà présent reste tel qu'il était.

`timeout` est le délai dont dispose le serveur pour commencer à répondre, 30 secondes par défaut. Le transfert lui-même n'a pas de limite. Pour en fixer une, passez un `signal` :

```js
await nc.http.download(url, "./downloads/video.mp4", { signal: AbortSignal.timeout(10 * 60_000) });
```

## Annuler

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await nc.http.get(url, { signal: controller.signal });
```

L'appel est rejeté avec une `AbortError`, y compris s'il attendait entre deux tentatives.

Toutes les options sont listées dans la [référence](/reference/http/).
