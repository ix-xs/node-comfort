---
title: "nc.cli"
description: "Ce qu'il vous faut pour les outils en ligne de commande : des arguments typés avec un `--help` généré, des questions, des menus pilotés aux flèches, des spinners, des barres de progression, des tableaux et des cadres. Quand personne n'est au clavier (CI, pipes), les questions lisent de simples lignes et les animations n'affichent que leur état final."
sidebar:
  label: "cli"
  order: 20
---

```js
const { cli } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const cli = require("@ix-xs/node-comfort/cli");
```

Cette page liste tout ce que contient `nc.cli`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/system/cli/).

```js
const { flags } = cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
});
const name = await cli.prompt("Project name?", { default: "my-app" });
const spin = cli.spinner("Installing").start();
spin.succeed("Installed");
```

## table

```ts
table(rows: Record<string, unknown>[] | unknown[][], options?: TableOptions): string
```

Dessine un tableau à partir d'un tableau d'objets (les clés deviennent les colonnes) ou d'un tableau de tableaux. Les couleurs, les emoji et les caractères CJK s'alignent correctement.

```js
console.log(cli.table([
  { name: "Ada", role: "admin", logins: 42 },
  { name: "Bob", role: "user", logins: 7 },
]));
// ╭──────┬───────┬────────╮
// │ name │ role  │ logins │
// ├──────┼───────┼────────┤
// │ Ada  │ admin │     42 │
// │ Bob  │ user  │      7 │
// ╰──────┴───────┴────────╯
```

## box

```ts
box(text: string, options?: BoxOptions): string
```

Dessine un cadre autour d'un texte.

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
// ╭─ my-app ────────────────╮
// │  Server ready           │
// │  http://localhost:3000  │
// ╰─────────────────────────╯
```

## tree

```ts
tree(data: unknown[] | Record<string, unknown>, options?: TreeOptions): string
```

Dessine des données imbriquées sous forme d'arbre, comme la commande `tree` le fait pour les dossiers. Les clés sont les branches. Une valeur qui est un objet ou un tableau ouvre un niveau, `null` ou `true` donne une simple feuille, toute autre valeur est affichée après la clé.

```js
console.log(cli.tree({
  src: { "index.js": null, lib: ["a.js", "b.js"] },
  "package.json": "1.2 kB",
}));
// ├── src
// │   ├── index.js
// │   └── lib
// │       ├── a.js
// │       └── b.js
// └── package.json: 1.2 kB
```

## spinner

```ts
spinner(text?: string, options?: SpinnerOptions): Spinner
```

Un spinner pour un travail en cours. Appelez `.start()`, puis terminez avec `.succeed()`, `.fail()`, `.warn()`, `.info()` ou `.stop()`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `text?` | `string` | Par défaut : `""`. |
| `options?` | [`SpinnerOptions`](#spinneroptions) |  |

**Renvoie** [`Spinner`](#spinner) : Pas encore démarré.

```js
const spin = cli.spinner("Downloading").start();
try {
  await download();
  spin.succeed("Downloaded 12 files");
} catch (error) {
  spin.fail(`Download failed: ${error.message}`);
}
```

## spin

```ts
spin<T>(text: string, task: Promise<T> | ((spinner: Spinner) => T | Promise<T>), options?: SpinOptions<T>): Promise<T>
```

Affiche un spinner pendant qu'un travail s'exécute, puis `✔` ou `✖` selon la façon dont il s'est terminé. Résout avec le résultat du travail, ou rejette avec son erreur.

| Paramètre | Type | Description |
| --- | --- | --- |
| `text` | `string` |  |
| `task` | `Promise``<``T``> \| ((spinner: `[`Spinner`](#spinner)`) => ``T`` \| ``Promise``<``T``>)` | Une promesse, ou une fonction qui reçoit le spinner pour pouvoir mettre à jour le texte. |
| `options?` | [`SpinOptions`](#spinoptions)`<``T``>` |  |

```js
const users = await cli.spin("Loading users", () => db.getAll("users"));
await cli.spin("Deploying", deploy(), {
  success: (url) => `Deployed to ${url}`,
  fail: (error) => `Deploy failed: ${error.message}`,
});
```

## progress

```ts
progress(options: ProgressOptions): ProgressBar
```

Une barre de progression avec pourcentage, ETA et vitesse. Elle se redessine au plus toutes les 50 ms : appeler `tick()` dans une boucle serrée ne pose donc aucun problème.

```js
const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
for (const file of files) {
  await upload(file);
  bar.tick(1, file.name);
}
bar.stop();
```

## prompt

```ts
prompt(question: string, options?: PromptOptions): Promise<string>
```

Pose une question et renvoie la réponse. Avec `validate`, la question est reposée jusqu'à ce que la réponse soit valide.

**Renvoie** `Promise``<string>` : Sans les espaces de début et de fin.

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", {
  validate: (answer) => /^\d+$/.test(answer) || "Please enter a number",
});
```

## password

```ts
password(question: string, options?: { mask?: string; input?: ReadStream; output?: WriteStream; } | undefined): Promise<string>
```

Demande un secret sans l'afficher ; chaque caractère apparaît sous la forme `*`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `question` | `string` |  |
| `options?` | `{ mask?: string, input?: ``NodeJS``.``ReadStream``, output?: ``NodeJS``.``WriteStream`` }` | `mask: ""` n'affiche rien du tout. |

```js
const token = await cli.password("API token?");
```

## confirm

```ts
confirm(question: string, options?: ConfirmOptions): Promise<boolean>
```

Pose une question oui/non. Comprend `y`, `yes`, `o`, `oui`, `true`, `1` et leurs contraires ; une réponse vide donne la valeur par défaut.

```js
if (await cli.confirm("Delete 42 files?")) await cleanup();
```

## select

```ts
select<V = string>(question: string, choices: Choice<V>[], options?: SelectOptions): Promise<V>
```

Laisse l'utilisateur sélectionner un choix avec les flèches et Entrée. Sans terminal interactif, affiche une liste numérotée et lit un numéro.

```js
const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);
const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
]);
```

## multiselect

```ts
multiselect<V = string>(question: string, choices: Choice<V>[], options?: SelectOptions): Promise<V[]>
```

Laisse l'utilisateur sélectionner plusieurs choix : les flèches pour se déplacer, Espace pour cocher ou décocher, `a` pour tout sélectionner, Entrée pour valider.

**Renvoie** `Promise``<``V``[]>` : Dans l'ordre de la liste.

```js
const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

## args

```ts
args<S extends Record<string, FlagSpec>>(schema: S, options?: ArgsOptions): ParsedArgs<S>
```

Analyse les arguments de la ligne de commande à partir d'un schéma, et type le résultat : `flags.port` est un `number`. Gère les alias courts, les valeurs par défaut, les options obligatoires, les valeurs autorisées, les options répétées, `--no-flag`, les variables d'environnement en solution de repli et les sous-commandes, et génère `--help`. Une faute de frappe reçoit une suggestion « Did you mean...? ».

**Lève** `TypeError` : Pour des options ou des commandes inconnues, des nombres invalides, des options obligatoires manquantes ou des valeurs absentes de `choices`. Le message est prêt à être affiché.

```js
// node server.js --port 8080 -v --tag api --tag web public/
const { flags, positionals } = cli.args({
  port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port to listen on" },
  verbose: { type: "boolean", short: "v" },
  tag: { type: "string", multiple: true },
  env: { type: "string", choices: ["dev", "prod"], default: "dev" },
}, { description: "Start the web server", version: "1.0.0" });
// flags: { port: 8080, verbose: true, tag: ["api", "web"], env: "dev" }

// node tool.js build --watch
const { command, flags: buildFlags } = cli.args({ watch: { type: "boolean" } }, {
  commands: { build: "Build the project", serve: "Start the dev server" },
});
// command: "build"
```

## isInteractive

```ts
isInteractive(): boolean
```

Y a-t-il quelqu'un au clavier ? Vrai quand stdin et stdout sont des terminaux et que nous ne sommes pas en CI.

```js
const name = cli.isInteractive() ? await cli.prompt("Name?") : "default";
```

## size

```ts
size(): { columns: number; rows: number; }
```

La taille du terminal, ou 80x24 quand elle est inconnue.

## clear

```ts
clear(): void
```

Efface l'écran. Ne fait rien quand stdout n'est pas un terminal.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { ArgsOptions } from "@ix-xs/node-comfort"`.

### ArgsOptions

Options de `args()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `argv?` | `string[]` | Ce qu'il faut analyser. Par défaut : `process.argv.slice(2)`. |
| `name?` | `string` | Nom du programme dans l'aide. Par défaut : le nom du script. |
| `description?` | `string` | Affichée en haut de l'aide. |
| `usage?` | `string` | Une ligne d'utilisation, comme `"<file> [options]"`. |
| `commands?` | `Record``<string, string>` | Les sous-commandes et ce qu'elles font, comme `{ build: "Build the project" }`. Le premier argument, quand il y en a un, doit être l'une d'elles et revient dans `command`. Elles partagent les options du programme. |
| `examples?` | `string[]` | Lignes de commande affichées à la fin de l'aide. |
| `help?` | `boolean` | Répond à `--help` et `-h` en affichant l'aide puis en quittant. Par défaut : `true`. |
| `version?` | `string` | Répond à `--version` avec cette version. |
| `strict?` | `boolean` | Refuse les options inconnues, avec une suggestion. Par défaut : `true`. |
| `env?` | `Record``<string, string \| undefined>` | D'où sont lues les options `env`. Par défaut : `process.env`. |

### BorderStyle

Styles de bordure pour `table()` et `box()`.

```ts
type BorderStyle = "rounded" | "single" | "double" | "heavy" | "ascii" | "none"
```

### BoxOptions

Options de `box()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `title?` | `string` | Affiché dans la bordure du haut. |
| `border?` | [`BorderStyle`](#borderstyle) | Par défaut : `"rounded"`. |
| `padding?` | `number \| { x?: number; y?: number; }` | Espace autour du texte. Par défaut : `{ x: 2, y: 0 }`. |
| `align?` | `"left" \| "center" \| "right"` | Par défaut : `"left"`. |
| `borderColor?` | `string` | Un nom de style comme `"green"`, ou un code hexadécimal. |
| `width?` | `number` | Largeur intérieure fixe. Par défaut : la ligne la plus longue. |
| `colors?` | `boolean` | Automatique par défaut. |

### Choice

Un choix pour `select()` et `multiselect()` : une chaîne, ou un libellé avec une valeur de n'importe quel type.

```ts
type Choice = string | { label: string; value: V; hint?: string; disabled?: boolean; }
```

### ConfirmOptions

Options de `confirm()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `default?` | `boolean` | La réponse quand l'utilisateur appuie simplement sur Entrée. Par défaut : `false`. |
| `input?` | `ReadableStream` | Par défaut : stdin. |
| `output?` | `WritableStream` | Par défaut : stdout. |

### FlagSpec

Une option pour `args()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `type` | `"string" \| "number" \| "boolean"` | Les nombres sont vérifiés. Les booléens acceptent aussi `--no-name`. |
| `short?` | `string` | Alias d'une lettre, comme `"p"` pour `-p`. |
| `default?` | `unknown` | Sert quand l'option est absente. |
| `multiple?` | `boolean` | Peut être répétée (`--tag a --tag b`) ; vous obtenez un tableau. |
| `required?` | `boolean` | Échoue si elle est absente. |
| `choices?` | `readonly string[] \| readonly number[]` | Valeurs autorisées. |
| `env?` | `string` | Une variable d'environnement à lire quand l'option n'est pas donnée, comme `"PORT"`. La ligne de commande l'emporte, puis la variable, puis `default`. |
| `description?` | `string` | Affichée dans `--help`. |

### FlagValue

Le type de la valeur d'une option.

```ts
type FlagValue = F["type"] extends "boolean" ? boolean : F extends { choices: readonly (infer C)[]; } ? C : F["type"] extends "number" ? number : string
```

### ParsedArgs

Ce que renvoie `args()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `flags` | [`ParsedFlags`](#parsedflags)`<``S``>` |  |
| `positionals` | `string[]` | Les arguments qui ne sont pas des options. |
| `command` | `string` | La sous-commande, quand `commands` a été donné. |
| `help` | `() => string` | Le texte d'aide généré. |

### ParsedFlags

Les options analysées, typées d'après le schéma.

```ts
type ParsedFlags = { [K in keyof S]: S[K] extends { multiple: true; } ? Array<FlagValue<S[K]>> : S[K] extends { default: any; } | { required: true; } | { type: "boolean"; } ? FlagValue<S[K]> : FlagValue<S[K]> | undefined; }
```

### ProgressBar

Une barre de progression.

| Propriété | Type | Description |
| --- | --- | --- |
| `tick` | `(amount?: number, label?: string) => `[`ProgressBar`](#progressbar) | Ajoute à la valeur, 1 par défaut. |
| `update` | `(value: number, label?: string) => `[`ProgressBar`](#progressbar) | Définit la valeur. |
| `stop` | `() => `[`ProgressBar`](#progressbar) | Dessine l'état final et libère la ligne. |
| `value` | `number` |  |
| `total` | `number` | Vous pouvez le modifier en cours de route. |
| `percent` | `number` | De 0 à 100. |

### ProgressOptions

Options de `progress()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `total` | `number` | La valeur qui correspond à 100 %. |
| `width?` | `number` | Largeur de la barre en caractères. Par défaut : `30`. |
| `format?` | `string` | Peut utiliser `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}` et `{label}`. |
| `complete?` | `string` | Caractère plein. Par défaut : `"█"`. |
| `incomplete?` | `string` | Caractère vide. Par défaut : `"░"`. |
| `label?` | `string` | Texte pour `{label}`. |
| `stream?` | `WriteStream` | Par défaut : stderr. |

### PromptOptions

Options de `prompt()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `default?` | `string` | Sert quand la réponse est vide. |
| `validate?` | `((answer: string) => string \| true \| ``Promise``<string \| true>)` | Renvoyez `true` pour accepter, ou un message pour reposer la question. |
| `input?` | `ReadableStream` | Par défaut : stdin. |
| `output?` | `WritableStream` | Par défaut : stdout. |

### SelectOptions

Options de `select()` et `multiselect()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `default?` | `number` | Index du choix mis en évidence au départ. Par défaut : `0`. |
| `pageSize?` | `number` | Nombre de choix visibles à la fois. Par défaut : `10`. |
| `min?` | `number` | `multiselect()` uniquement : nombre minimal de choix. |
| `input?` | `ReadStream` | Par défaut : stdin. |
| `output?` | `WriteStream` | Par défaut : stdout. |

### Spinner

Un spinner. Chaque méthode le renvoie.

| Propriété | Type | Description |
| --- | --- | --- |
| `start` | `(text?: string) => `[`Spinner`](#spinner) | Démarre l'animation, éventuellement avec un nouveau texte. |
| `stop` | `() => `[`Spinner`](#spinner) | S'arrête et efface la ligne. |
| `succeed` | `(text?: string) => `[`Spinner`](#spinner) | S'arrête avec un `✔` vert. |
| `fail` | `(text?: string) => `[`Spinner`](#spinner) | S'arrête avec un `✖` rouge. |
| `warn` | `(text?: string) => `[`Spinner`](#spinner) | S'arrête avec un `⚠` jaune. |
| `info` | `(text?: string) => `[`Spinner`](#spinner) | S'arrête avec un `ℹ` bleu. |
| `text` | `string` | Le texte à côté du spinner. Modifiez-le à tout moment. |
| `isSpinning` | `boolean` |  |

### SpinnerOptions

Options de `spinner()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `frames?` | `string[]` | Images de l'animation. Par défaut : des points braille. |
| `interval?` | `number` | Millisecondes par image. Par défaut : `80`. |
| `color?` | `string` | Un nom de style ou un code hexadécimal. Par défaut : `"cyan"`. |
| `stream?` | `WriteStream` | Par défaut : stderr, ce qui garde stdout propre pour les données. |

### SpinOptions

Options de `spin()` : celles du spinner, plus ce qu'il faut dire à la fin.

```ts
type SpinOptions = SpinnerOptions & { success?: string | ((result: T) => string); fail?: string | ((error: unknown) => string); }
```

### TableColumn

Une colonne de `table()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `key` | `string \| number` | Nom de la propriété pour les lignes objets, index pour les lignes tableaux. |
| `header?` | `string` | Par défaut : la clé. |
| `align?` | `"left" \| "center" \| "right"` | Par défaut : à droite pour les nombres, à gauche sinon. |
| `maxWidth?` | `number` | Les valeurs plus longues sont coupées avec `…`. |
| `format?` | `((value: unknown, row: any) => unknown)` | Modifie la valeur avant son affichage. |

### TableOptions

Options de `table()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `columns?` | `(string \| `[`TableColumn`](#tablecolumn)`)[]` | Quelles colonnes, et dans quel ordre. Par défaut : toutes les clés trouvées. |
| `border?` | [`BorderStyle`](#borderstyle)` \| "markdown"` | `"markdown"` donne un tableau Markdown. Par défaut : `"rounded"`. |
| `header?` | `boolean` | Affiche la ligne d'en-tête. Par défaut : `true`. |
| `colors?` | `boolean` | En-tête en gras et bordures atténuées. Automatique par défaut. |
| `padding?` | `number` | Espaces autour du contenu des cellules. Par défaut : `1`. |

### TreeOptions

Options de `tree()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `ascii?` | `boolean` | Dessine avec `\|`, `+` et `-` au lieu des caractères de cadre. |
