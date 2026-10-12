---
title: "Outils en ligne de commande"
description: "`nc.cli` réunit ce dont un outil en ligne de commande a besoin : arguments, sous-commandes, prompts, menus, spinners, barres de progression, tableaux, arbres et encadrés."
sidebar:
  order: 3
---

```js
const { cli } = require("@ix-xs/node-comfort");

const { flags } = cli.args({ port: { type: "number", short: "p", default: 3000 } });
const name = await cli.prompt("Project name?", { default: "my-app" });
const spin = cli.spinner("Installing").start();
await install();
spin.succeed("Installed");
```

Quand personne n'est au clavier (CI, pipes), les prompts lisent de simples lignes sur stdin et les animations n'affichent que leur état final. `cli.isInteractive()` vous dit dans quel cas vous êtes. Toutes les options sont listées dans la [référence](/reference/cli/).

## Arguments

`args` analyse la ligne de commande à partir d'un schéma, et le résultat est typé : `flags.port` est un `number`.

```js
const { flags, positionals } = cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
  verbose: { type: "boolean", short: "v", description: "Show more logs" },
  tag: { type: "string", multiple: true },
  env: { type: "string", choices: ["dev", "prod"], default: "dev" },
  token: { type: "string", required: true },
}, { description: "Start the server", version: "1.0.0" });
```

```bash
node server.js -p 8080 -v --tag api --tag web --token=abc public/
```

Cela donne `flags = { port: 8080, verbose: true, tag: ["api", "web"], env: "dev", token: "abc" }` et `positionals = ["public/"]`. Les booléens acceptent `--no-verbose`. Tout ce qui suit `--` va dans `positionals` sans être modifié.

`choices` fonctionne aussi avec les nombres : `level: { type: "number", choices: [1, 2, 3] }` accepte `--level 2` et donne le nombre `2`.

`--help` (ou `-h`) affiche une aide générée puis quitte, et `--version` affiche la version. Une erreur de saisie lève une `TypeError` dont le message est prêt à être affiché, avec une suggestion en cas de faute de frappe :

```text
Unknown option --prot. Did you mean --port?
Missing required option --token
Option --port expects a number, got "abc"
Option --env must be one of: dev, prod (got "staging")
```

Interceptez-la pour afficher le message sans trace de pile :

```js
let parsed;
try {
  parsed = cli.args(schema);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
```

Une option peut se rabattre sur une variable d'environnement avec `env`. La ligne de commande l'emporte, puis la variable, puis `default`.

```js
const { flags } = cli.args({
  port: { type: "number", default: 3000, env: "PORT" },
  token: { type: "string", required: true, env: "API_TOKEN" },
  tag: { type: "string", multiple: true, env: "TAGS" },
});
```

```bash
PORT=8080 API_TOKEN=abc TAGS=api,web node server.js
```

Cela donne `flags = { port: 8080, token: "abc", tag: ["api", "web"] }`. Dans une variable, une option répétée est une liste séparée par des virgules, et un booléen vaut `1`, `true`, `yes`, `on` ou `y` (`0`, `false`, `no`, `off`, `n` ou rien pour faux). Les variables sont vérifiées comme les options : `PORT=abc` échoue avec `Environment variable PORT expects a number, got "abc"`.

## Sous-commandes

Donnez à `commands` le nom des sous-commandes et ce qu'elles font. Le premier argument doit être l'une d'elles, et il revient dans `command`.

```js
const { command, flags, positionals, help } = cli.args({
  watch: { type: "boolean", short: "w", description: "Rebuild when a file changes" },
  port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port for serve" },
}, {
  description: "Build and serve the site",
  commands: { build: "Build the project", serve: "Start the dev server" },
  examples: ["tool build --watch", "tool serve -p 8080"],
  version: "1.0.0",
});

if (command === "build") await build(positionals, flags);
else if (command === "serve") await serve(flags.port);
else console.log(help());
```

`node tool.js build --watch src` donne `command = "build"`, `flags = { watch: true, port: 3000 }` et `positionals = ["src"]`. Toutes les commandes partagent les mêmes options. Un nom erroné lève une erreur, comme le fait une option erronée : `Unknown command "biuld". Did you mean build?`. Sans aucune commande, `command` vaut `undefined`, et c'est pourquoi l'exemple se termine en affichant `help()`.

Les commandes et les `examples` apparaissent tous dans l'aide. Voici ce qu'affiche `node tool.js --help` :

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

## Prompts

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", { validate: (a) => /^\d+$/.test(a) || "Please enter a number" });
const token = await cli.password("API token?");       // les caractères saisis s'affichent en *
const ok = await cli.confirm("Deploy to production?"); // y, yes, o, oui...
```

Quand stdin est un pipe et qu'il n'a plus de lignes à fournir, un prompt est rejeté avec une erreur au lieu d'attendre indéfiniment.

## Menus

```js
const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);

const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
  { label: "Enterprise", value: "ent", disabled: true },
]);

const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

Les flèches pour se déplacer, Entrée pour choisir. Début et Fin sautent au premier et au dernier choix, Page précédente et Page suivante avancent d'une page à la fois (10 choix, à changer avec `pageSize`). Pour `multiselect`, Espace coche ou décoche et `a` sélectionne tout.

Dans un menu ou un prompt de mot de passe, Ctrl+C ou Échap annule : la promesse est rejetée avec une `AbortError`, et c'est donc vous qui décidez ce qu'annuler veut dire.

```js
try {
  const plan = await cli.select("Plan?", ["Free", "Pro"]);
  await subscribe(plan);
} catch (error) {
  if (error.name !== "AbortError") throw error;
  console.log("Nothing changed.");
}
```

## Spinners et barres de progression

`spin` affiche un spinner pendant qu'un travail s'exécute, puis le termine par `✔` ou `✖`. Il se résout avec le résultat du travail, ou est rejeté avec son erreur.

```js
const users = await cli.spin("Loading users", () => db.getAll("users"));

await cli.spin("Deploying", deploy(), {
  success: (url) => `Deployed to ${url}`,
  fail: (error) => `Deploy failed: ${error.message}`,
});
```

Le travail est une promesse ou une fonction. Une fonction reçoit le spinner et peut donc changer le texte en cours de route :

```js
await cli.spin("Installing", async (spinner) => {
  for (const name of packages) {
    spinner.text = `Installing ${name}`;
    await install(name);
  }
}, { success: "Installed" });
```

Pour plus de contrôle, pilotez le spinner vous-même. Il peut aussi se terminer par `warn()`, `info()` ou un simple `stop()`.

```js
const spin = cli.spinner("Downloading").start();
try {
  await download();
  spin.succeed("Downloaded 12 files");
} catch (error) {
  spin.fail(`Download failed: ${error.message}`);
}

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
for (const file of files) {
  await upload(file);
  bar.tick(1, file.name);
}
bar.stop();
```

Les spinners et les barres de progression écrivent sur stderr : ils ne se mélangent donc pas aux données que vous affichez sur stdout. Le format de progression peut utiliser `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}` et `{label}`.

## Tableaux et encadrés

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

Choisissez les colonnes, les en-têtes et l'alignement avec `columns`, et l'apparence avec `border` : `"rounded"`, `"single"`, `"double"`, `"heavy"`, `"ascii"`, `"none"` ou `"markdown"`. Les couleurs, les emoji et les caractères CJK s'alignent correctement. Une liste vide donne une chaîne vide.

Une cellule peut contenir plusieurs lignes de texte, et sa ligne dans le tableau s'agrandit pour leur faire place :

```js
console.log(cli.table([
  { package: "left-pad", notes: "Deprecated\nUse padStart instead" },
  { package: "chalk", notes: "Up to date" },
]));
```

```text
╭──────────┬──────────────────────╮
│ package  │ notes                │
├──────────┼──────────────────────┤
│ left-pad │ Deprecated           │
│          │ Use padStart instead │
│ chalk    │ Up to date           │
╰──────────┴──────────────────────╯
```

`border: "markdown"` donne un tableau à coller dans un README ou une pull request. Dans ce cas, un saut de ligne devient `<br>` et un `|` est échappé.

```js
console.log(cli.table(users, { border: "markdown" }));
```

```text
| name | role  | logins |
| ---- | ----- | -----: |
| Ada  | admin |     42 |
| Bob  | user  |      7 |
```

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
```

## Arbres

`tree` dessine des données imbriquées comme la commande `tree` dessine les dossiers.

```js
console.log(cli.tree({
  src: { "index.js": null, lib: ["a.js", "b.js"] },
  "package.json": "1.2 kB",
}));
```

```text
├── src
│   ├── index.js
│   └── lib
│       ├── a.js
│       └── b.js
└── package.json: 1.2 kB
```

Les clés sont des branches. Un objet ou un tableau ouvre un niveau, `null` ou `true` donne une simple feuille, et toute autre valeur s'affiche après la clé. Passez `{ ascii: true }` pour dessiner avec `+`, `|` et `-` là où les caractères de dessin de boîtes s'affichent mal.

## Terminal

```js
cli.size();  // { columns: 120, rows: 40 }
cli.clear();
```
