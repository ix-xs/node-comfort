---
title: "Un outil en ligne de commande"
description: "Un outil avec des arguments typés, des questions et une barre de progression, un client d'API qui réessaie et garde en cache, et des ressources qui s'arrêtent d'elles-mêmes avec `using`."
sidebar:
  order: 2
---

Les deux premiers exemples utilisent `await` au plus haut niveau : ce sont des modules ES. Nommez-les `.mjs`, ou mettez `"type": "module"` dans votre package.json.

## Traiter un dossier d'images

```js
#!/usr/bin/env node
// build-images.mjs
import nc from "@ix-xs/node-comfort";

const { cli } = nc;

const { flags, positionals } = cli.args({
  out: { type: "string", short: "o", default: "dist", description: "Output folder" },
  minify: { type: "boolean", description: "Minify the output" },
  concurrency: { type: "number", short: "c", default: 4 },
}, { name: "build-images", usage: "<folder> [options]", version: "1.0.0" });

const source = positionals[0] ?? (await cli.prompt("Folder to process?", { default: "images" }));
const files = nc.glob("**/*.{png,jpg}", { cwd: source, absolute: true });

if (!files.length) {
  nc.warn(`No images in ${source}`);
  process.exit(0);
}
if (cli.isInteractive() && !(await cli.confirm(`Process ${files.length} images?`, { default: true }))) process.exit(0);

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
await nc.async.forEach(files, async (file) => {
  await optimize(file, nc.fs.createPath(`${flags.out}/${nc.str.slugify(file)}`));
  bar.tick(1, file);
}, { concurrency: flags.concurrency });
bar.stop();

nc.box(`${files.length} images written to ${flags.out}`, { title: "done", borderColor: "green" });
```

## Un client d'API avec nouvelles tentatives et cache

```js
// github.mjs
import nc from "@ix-xs/node-comfort";

const { schema: s } = nc;

const github = nc.http.create({
  baseURL: "https://api.github.com/",
  headers: { "x-github-api-version": "2022-11-28" },
  auth: { bearer: process.env.GITHUB_TOKEN },
  timeout: "10s",
  retry: { attempts: 4, jitter: true },
});

// ce que ce programme attend de la réponse, vérifié à son arrivée
const Repo = s.object({ full_name: s.string(), stargazers_count: s.number().int() });
const repos = new nc.Cache({ max: 500, ttl: "10m" });

async function getRepo(owner, repo) {
  return repos.getOrSet(`${owner}/${repo}`, async () => {
    const response = await github.get("repos/:owner/:repo", { params: { owner, repo }, schema: Repo });
    return response.data;
  }, { staleWhileRevalidate: "1h" });
}

const names = [["nodejs", "node"], ["microsoft", "TypeScript"], ["vitejs", "vite"]];
const results = await nc.async.map(names, ([owner, repo]) => getRepo(owner, repo), { concurrency: 2 });
nc.table(results.map((r) => ({ name: r.full_name, stars: nc.num.abbreviate(r.stargazers_count) })));
```

`params` remplit le chemin et encode chaque valeur. `schema` lève une `ValidationError` si le service répond autre chose que ce que vous attendez, et donne son type à `response.data`. Avec `staleWhileRevalidate`, une entrée vieille de plus de dix minutes est encore renvoyée immédiatement, pendant une heure au maximum, tandis qu'une entrée fraîche se charge en arrière-plan.

## Faire le ménage avec `using`

Avec Node.js 24 ou plus récent, une déclaration `using` arrête une ressource à la fin de son bloc, quelle que soit la façon dont le bloc se termine : normalement, avec `return` ou sur une erreur. Pas de `try`/`finally` à écrire, et aucun timer qui continue de tourner parce que quelque chose a levé une erreur :

```js
const nc = require("@ix-xs/node-comfort");

async function build(files) {
  using bar = nc.cli.progress({ total: files.length });
  using heartbeat = nc.time.every("30s", () => nc.info("Still building..."));
  using handler = nc.sys.onShutdown(() => nc.warn("Build interrupted"));

  for (const file of files) {
    await compile(file); // si ceci lève une erreur, les trois s'arrêtent quand même
    bar.tick(1, file);
  }
}
```

Ceux-ci fonctionnent avec `using` :

| Quoi | À la fin du bloc |
| --- | --- |
| `nc.watch()` | le watcher est fermé |
| `time.every()`, `time.cron()` | la planification s'arrête |
| `cli.spinner()` | un spinner encore en cours est arrêté |
| `cli.progress()` | la barre est arrêtée |
| `nc.when()` | la tâche s'arrête |
| `nc.dontCrash()` | ses gestionnaires sont retirés |
| ce que renvoient `emitter.on()`, `once()` et `onAny()` | l'écouteur est retiré |
| ce que renvoie `sys.onShutdown()` | le gestionnaire est retiré |
| `new nc.SQLite()` | la connexion est fermée |

`using` est une nouvelle syntaxe : Node.js 22 ne la comprend pas, appelez donc vous-même `stop()`, `close()` ou la fonction renvoyée sur cette version. Un `watch()` sur un chemin absent renvoie `undefined`, ce que `using` accepte.
