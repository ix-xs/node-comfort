---
title: "Outils en ligne de commande"
description: "`nc.cli` : arguments et sous-commandes, questions et menus, spinners et barres de progression, tableaux, arbres et encadrés."
---

```js
const { cli } = require("@ix-xs/node-comfort");
```

Quand personne n'est au clavier (CI, pipes), les questions lisent de simples lignes sur stdin et les animations n'affichent que leur état final. `cli.isInteractive()` indique dans quel cas vous êtes.

## Arguments

`args` analyse la ligne de commande d'après un schéma. Le résultat est typé : `flags.port` est un `number`.

```js
const { flags, positionals } = cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
  verbose: { type: "boolean", short: "v", description: "Show more logs" },
  tag: { type: "string", multiple: true },
  env: { type: "string", choices: ["dev", "prod"], default: "dev" },
  token: { type: "string", required: true, env: "API_TOKEN" },
}, { description: "Start the server", version: "1.0.0" });
```

```bash
node server.js -p 8080 -v --tag api --tag web --token=abc public/
```

Cela donne `flags = { port: 8080, verbose: true, tag: ["api", "web"], env: "dev", token: "abc" }` et `positionals = ["public/"]`. Les booléens acceptent `--no-verbose` ; tout ce qui suit `--` va dans `positionals`.

| Champ d'une option | |
| --- | --- |
| `type` | `"string"`, `"number"` ou `"boolean"` |
| `short` | Un alias d'une lettre : `"p"` pour `-p` |
| `default` | Quand l'option est absente |
| `multiple` | Peut être répétée ; donne un tableau |
| `required` | Échoue si elle est absente |
| `choices` | Valeurs permises, chaînes ou nombres |
| `env` | Une variable lue quand l'option n'est pas donnée. La ligne de commande l'emporte, puis la variable, puis `default` |
| `description` | Affichée dans `--help` |

Dans une variable, une option répétée est une liste séparée par des virgules (`TAGS=api,web`), et un booléen vaut `1`, `true`, `yes`, `on` ou `y`.

| Option de `args` | Par défaut | |
| --- | --- | --- |
| `argv` | `process.argv.slice(2)` | Ce qui est analysé |
| `name`, `description`, `usage`, `examples` | | Pour l'aide |
| `commands` | | Les sous-commandes, ci-dessous |
| `help` | `true` | Répondre à `--help` et `-h`, puis quitter |
| `version` | | La réponse à `--version` |
| `strict` | `true` | Refuser les options inconnues, avec une suggestion |
| `env` | `process.env` | Où les options `env` sont lues |

Une erreur sur la ligne de commande lève une `TypeError` avec `code: "ERR_CLI_ARGS"` et un message prêt à afficher :

```js
let parsed;
try {
  parsed = cli.args(schema);
} catch (error) {
  if (error.code !== "ERR_CLI_ARGS") throw error;
  console.error(error.message);
  process.exit(2);
}
```

Les messages qu'elle donne :

```text
Unknown option --prot. Did you mean --port?
Missing required option --token
Option --port expects a number, got "abc"
Option --env must be one of: dev, prod (got "staging")
Environment variable PORT expects a number, got "abc"
```

## Sous-commandes

Le premier argument doit être l'une des `commands`, et revient dans `command`. Toutes les commandes partagent les options.

```js
const { command, flags, positionals, help } = cli.args({
  watch: { type: "boolean", short: "w", description: "Rebuild when a file changes" },
  port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port for serve" },
}, {
  name: "tool",
  description: "Build and serve the site",
  commands: { build: "Build the project", serve: "Start the dev server" },
  examples: ["tool build --watch", "tool serve -p 8080"],
  version: "1.0.0",
});

if (command === "build") await build(positionals, flags);
else if (command === "serve") await serve(flags.port);
else console.log(help());
```

`tool build --watch src` donne `command = "build"`, `flags = { watch: true, port: 3000 }`, `positionals = ["src"]`. Un mauvais nom lève `Unknown command "biuld". Did you mean build?` ; aucune commande donne `undefined`. `tool --help` affiche :

```text
Build and serve the site

Usage: tool <command> [options]

Commands:
  build  Build the project
  serve  Start the dev server

Options:
  -w, --watch          Rebuild when a file changes
  -p, --port <number>  Port for serve [default: 3000] [env: PORT]
  -h, --help           Show this help
      --version        Show the version

Examples:
  tool build --watch
  tool serve -p 8080
```

## Questions et menus

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", { validate: (answer) => /^\d+$/.test(answer) || "Please enter a number" });
const token = await cli.password("API token?");        // affiché en *
const ok = await cli.confirm("Deploy to production?"); // y, yes, o, oui...

const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);
const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
  { label: "Enterprise", value: "ent", disabled: true },
]);
const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

| Fonction | Renvoie | Options |
| --- | --- | --- |
| `prompt(question, options)` | La réponse | `default`, `validate` (renvoie `true` ou un message pour reposer la question) |
| `password(question, options)` | La réponse | |
| `confirm(question, options)` | `true` ou `false` | `default` (`false`) |
| `select(question, choices, options)` | La valeur choisie | `default` (un indice), `pageSize` (`10`) |
| `multiselect(question, choices, options)` | Un tableau de valeurs | `default`, `pageSize`, `min` |

Chaque question prend aussi `input`, `output` et `signal`. Dans un menu : les flèches pour se déplacer, Entrée pour choisir, Début et Fin, Page précédente et Page suivante ; dans `multiselect`, Espace coche ou décoche et `a` sélectionne tout.

| La question se termine par | Elle rejette avec |
| --- | --- |
| Ctrl+C ou Échap (menu, mot de passe) | `AbortError`, code `ABORT_ERR` |
| Le `signal` annulé | `AbortError`, code `ABORT_ERR` |
| L'entrée fermée avant une réponse | `AbortError`, code `ERR_INPUT_CLOSED` |

```js
try {
  const plan = await cli.select("Plan?", ["Free", "Pro"], { signal: AbortSignal.timeout(60_000) });
  await subscribe(plan);
} catch (error) {
  if (error.name !== "AbortError") throw error;
  console.log("Nothing changed.");
}
```

## Spinners et barres de progression

`spin` affiche un spinner pendant qu'une promesse ou une fonction s'exécute, puis le termine par `✔` ou `✖`. Il renvoie le résultat, ou rejette avec l'erreur.

```js
const users = await cli.spin("Loading users", () => db.getAll("users"));

await cli.spin("Installing", async (spinner) => {
  for (const name of packages) {
    spinner.text = `Installing ${name}`;
    await install(name);
  }
}, { success: "Installed", fail: (error) => `Install failed: ${error.message}` });
```

`spinner` et `progress` se pilotent à la main :

```js
const spinner = cli.spinner("Downloading", { interval: "80ms" }).start();
spinner.succeed("Downloaded 12 files");

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
for (const file of files) {
  await upload(file);
  bar.tick(1, file.name);
}
bar.stop();
```

| Spinner | |
| --- | --- |
| `start(text?)`, `stop()` | `stop()` efface la ligne |
| `succeed`, `fail`, `warn`, `info` | Arrêtent avec `✔`, `✖`, `⚠` ou `ℹ` |
| `text`, `isSpinning` | |
| Options | `frames`, `interval` (`80` ou `"80ms"`), `color` (`"cyan"`), `stream` |
| Options de `spin` | Celles du spinner, `success`, `fail` (texte ou fonction), `signal` |

| Barre de progression | |
| --- | --- |
| `tick(amount = 1, label?)`, `update(value, label?)` | Font avancer la barre |
| `stop()` | Dessine l'état final et libère la ligne |
| `value`, `total`, `percent` | `total` peut changer en cours de route |
| Options | `total`, `width` (`30`), `format`, `complete` (`"█"`), `incomplete` (`"░"`), `label`, `stream` |
| Emplacements de `format` | `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}`, `{label}` |

Les deux écrivent sur stderr : stdout reste propre pour les données. Les deux se déclarent avec `using` ([Ressources](/basics/resources/)).

## Tableaux, encadrés et arbres

Ces fonctions construisent du texte ; affichez-le vous-même. `nc.logger.table()` construit et affiche en un appel.

```js
const users = [
  { name: "Ada", role: "admin", logins: 42 },
  { name: "Bob", role: "user", logins: 7 },
];
console.log(cli.table(users));
```

```text
╭──────┬───────┬────────╮
│ name │ role  │ logins │
├──────┼───────┼────────┤
│ Ada  │ admin │     42 │
│ Bob  │ user  │      7 │
╰──────┴───────┴────────╯
```

| Option de `table` | Par défaut | |
| --- | --- | --- |
| `columns` | toutes les clés | Des noms, ou `{ key, header, align, maxWidth, format }` |
| `border` | `"rounded"` | `"single"`, `"double"`, `"heavy"`, `"ascii"`, `"none"`, `"markdown"` |
| `header` | `true` | |
| `padding` | `1` | |
| `colors` | automatique | |

Une cellule peut tenir sur plusieurs lignes. Les couleurs, les emoji et les caractères CJK restent alignés. Avec `border: "markdown"`, un saut de ligne devient `<br>` et `|` est échappé :

```text
| name | role  | logins |
| ---- | ----- | -----: |
| Ada  | admin |     42 |
| Bob  | user  |      7 |
```

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));

console.log(cli.tree({
  src: { "index.js": null, lib: ["a.js", "b.js"] },
  "package.json": "1.2 kB",
}));
```

```text
╭─ my-app ────────────────╮
│  Server ready           │
│  http://localhost:3000  │
╰─────────────────────────╯
├── src
│   ├── index.js
│   └── lib
│       ├── a.js
│       └── b.js
└── package.json: 1.2 kB
```

| Option de `box` | Par défaut |
| --- | --- |
| `title`, `width` | |
| `border` | `"rounded"` |
| `padding` | `{ x: 2, y: 0 }` |
| `align` | `"left"` |
| `borderColor` | Un nom de style ou un code hexadécimal |
| `colors` | automatique |

Dans un `tree`, un objet ou un tableau ouvre un niveau, `null` ou `true` donne une simple feuille, toute autre valeur s'affiche après la clé. `{ ascii: true }` dessine avec `+`, `|` et `-`.

## Terminal

| Fonction | Renvoie |
| --- | --- |
| `isInteractive()` | `true` quand stdin et stdout sont un terminal |
| `size()` | `{ columns, rows }`, `{ columns: 80, rows: 24 }` sans terminal |
| `clear()` | Efface l'écran |

## Une commande complète

`clean logs` liste les fichiers `.log` d'un dossier, demande avant de les supprimer et affiche la progression. Un chemin tapé par l'utilisateur est lu depuis le dossier de travail avec `path.resolve()` : `nc.fs` lit `./` depuis le fichier appelant.

```js
const path = require("node:path");
const { cli, fs, logger } = require("@ix-xs/node-comfort");

async function main() {
  const { flags, positionals } = cli.args({
    yes: { type: "boolean", short: "y", description: "Do not ask for confirmation" },
  }, { name: "clean", usage: "<folder> [options]", description: "Removes the log files of a folder" });

  // Lu depuis le dossier de travail, comme on s'y attend en ligne de commande.
  const folder = path.resolve(positionals[0] ?? "");
  const files = fs.list(folder, { filter: (file) => file.endsWith(".log") }) ?? [];
  if (files.length === 0) return logger.info("Nothing to remove");

  console.log(cli.table(files.map((file) => ({ file: path.relative(folder, file), size: fs.size(file) }))));
  if (!flags.yes && !(await cli.confirm(`Remove ${files.length} files?`))) return;

  const bar = cli.progress({ total: files.length });
  for (const file of files) bar.tick(1, fs.remove(file) ? path.basename(file) : `${path.basename(file)} (kept)`);
  bar.stop();
}

main().catch((error) => {
  if (error.code === "ERR_CLI_ARGS" || error.code === "ERR_INPUT_CLOSED") console.error(error.message);
  else logger.error(error);
  process.exitCode = 1;
});
```
