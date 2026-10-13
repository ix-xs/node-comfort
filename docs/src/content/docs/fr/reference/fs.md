---
title: "nc.fs"
description: "Fichiers et dossiers sans try/catch : lire et écrire du texte ou du JSON (de façon atomique), copier, déplacer, supprimer, lister, rechercher par motif glob, surveiller, calculer un hash."
sidebar:
  label: "fs"
  order: 2
---

Chemins : les chemins absolus sont utilisés tels quels. Les chemins qui commencent par `./` ou `../` partent du fichier qui appelle la fonction, de sorte qu'un script fonctionne quel que soit l'endroit d'où il est lancé. Les autres chemins relatifs partent du répertoire de travail, comme avec le module `fs` de Node.

Les échecs courants ne lèvent pas d'erreur : vous obtenez `undefined` quand quelque chose n'existe pas et `false` quand une opération échoue.

```js
const { fs } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const fs = require("@ix-xs/node-comfort/fs");
```

Ces fonctions existent aussi à la racine : `nc.getEnv()` équivaut à `nc.fs.getEnv()`.

Cette page liste tout ce que contient `nc.fs`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/essentials/fs/).

```js
nc.writeJSON("./data/settings.json", { theme: "dark" });
const settings = nc.readJSON("./data/settings.json", {});
const sources = nc.glob("src/**/*.{js,ts}");
```

## getEnv

```ts
getEnv(name: string, fallback?: string): string | undefined
```

Lit une variable d'environnement. Pour des valeurs typées et vérifiées, voir `nc.env`.

```js
nc.getEnv("REGION", "eu-west-1");
```

## createPath

```ts
createPath(path?: string): string
```

La version absolue d'un chemin, qu'il existe ou non.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Par défaut : le répertoire de travail. |

```js
nc.createPath("./config/app.json"); // à côté du fichier appelant
nc.createPath("logs/app.log");      // depuis le répertoire de travail
```

## getFolder

```ts
getFolder(path?: string): string | undefined
```

Le chemin absolu d'un dossier, ou `undefined` s'il n'existe pas.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Par défaut : le répertoire de travail. |

```js
if (!nc.getFolder("./uploads")) nc.createFolder("./uploads");
```

## getFile

```ts
getFile(path: string): string | undefined
```

Le chemin absolu d'un fichier, ou `undefined` s'il n'existe pas.

## getFoldersIn

```ts
getFoldersIn(path?: string, recursive?: boolean | ListOptions): string[] | undefined
```

Les dossiers contenus dans un dossier, dossiers imbriqués compris par défaut. `node_modules` est ignoré.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Par défaut : le répertoire de travail. |
| `recursive?` | `boolean \| `[`ListOptions`](#listoptions) | Par défaut : `true`. |

**Renvoie** `string[] | undefined` : Des chemins absolus, ou `undefined` si le dossier n'existe pas.

```js
nc.getFoldersIn("./src");        // tout
nc.getFoldersIn("./src", false); // enfants directs uniquement
```

## getFilesIn

```ts
getFilesIn(path?: string, recursive?: boolean | ListOptions): string[] | undefined
```

Les fichiers contenus dans un dossier, fichiers des dossiers imbriqués compris par défaut. `node_modules` est ignoré.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Par défaut : le répertoire de travail. |
| `recursive?` | `boolean \| `[`ListOptions`](#listoptions) | Par défaut : `true`. |

**Renvoie** `string[] | undefined` : Des chemins absolus, ou `undefined` si le dossier n'existe pas.

```js
nc.getFilesIn("./src").filter((file) => file.endsWith(".js"));
```

## glob

```ts
glob(pattern: string | string[], options?: GlobOptions): string[]
```

Trouve les chemins qui correspondent à un motif glob : `*` (tout sauf `/`), `**` (toute profondeur), `?`, `[abc]` et `{js,ts}`.

Un motif qui part de la racine du disque cherche à cet endroit, et ses résultats sont absolus.

| Paramètre | Type | Description |
| --- | --- | --- |
| `pattern` | `string \| string[]` | Un ou plusieurs motifs. |
| `options?` | [`GlobOptions`](#globoptions) |  |

**Renvoie** `string[]` : Triés, relatifs à `cwd` avec `/` comme séparateur, sauf si le motif est absolu ou si `absolute` est activé.

```js
nc.glob("src/**/*.js");                           // ["src/index.js", "src/lib/a.js"]
nc.glob("**/*.{png,jpg}", { cwd: "./assets", absolute: true });
nc.glob("packages/*", { type: "folders" });
nc.glob(`${folder}/**/*.json`);                   // motif absolu, résultats absolus
```

## find

```ts
find(name: string, options?: FindOptions): string | undefined
```

Cherche dans une arborescence de dossiers le premier fichier ou dossier portant ce nom, en commençant par le plus proche.

**Renvoie** `string | undefined` : Le chemin absolu.

```js
nc.find("config.json");
nc.find("fixtures", { type: "folder", cwd: "./test" });
```

## findUp

```ts
findUp(name: string | string[], options?: { cwd?: string; type?: "file" | "folder" | "any"; stopAt?: string; } | undefined): string | undefined
```

Cherche un fichier ou un dossier dans un dossier, puis dans son parent, et ainsi de suite jusqu'à la racine. C'est ainsi que l'on trouve le `package.json` ou le `.git` auquel un fichier appartient.

| Paramètre | Type | Description |
| --- | --- | --- |
| `name` | `string \| string[]` | Un nom, ou plusieurs à essayer dans chaque dossier, dans cet ordre. |
| `options?` | `{ cwd?: string, type?: "file" \| "folder" \| "any", stopAt?: string }` | Où commencer (le répertoire de travail par défaut), quoi chercher (`"any"` par défaut), et un dossier au-dessus duquel ne pas remonter. |

**Renvoie** `string | undefined` : Le chemin absolu.

```js
nc.findUp("package.json");                         // le plus proche au-dessus du répertoire de travail
nc.findUp(".git", { type: "folder", cwd: __dirname });
nc.findUp(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"]);
```

## readFile

```ts
readFile(path: string, encoding: "buffer"): Buffer<ArrayBufferLike> | undefined
readFile(path: string, encoding?: BufferEncoding): string | undefined
```

Lit un fichier sous forme de texte, ou de Buffer avec `"buffer"`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `encoding?` | `BufferEncoding` | Par défaut : `"utf8"`. |

**Renvoie** `string | undefined` : `undefined` s'il ne peut pas être lu.

```js
const text = nc.readFile("./README.md");
const bytes = nc.readFile("./logo.png", "buffer");
```

## readLines

```ts
readLines(path: string): string[] | undefined
```

Lit un fichier texte sous forme de lignes. Un saut de ligne final n'ajoute pas de ligne vide.

**Renvoie** `string[] | undefined` : `undefined` s'il ne peut pas être lu.

```js
for (const url of nc.readLines("./urls.txt") ?? []) await check(url);
```

## readJSON

```ts
readJSON<T = any>(path: string, fallback?: T, options?: ReadJSONOptions): T
```

Lit un fichier JSON. S'il est absent ou invalide, vous obtenez `fallback`, jamais une erreur.

```js
const settings = nc.readJSON("./settings.json", { theme: "light" });
const tsconfig = nc.readJSON("./tsconfig.json", {}, { comments: true });
```

## writeFile

```ts
writeFile(path: string, data: string | object | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: WriteFileOptions): boolean
```

Écrit un fichier de façon atomique, en créant ses dossiers. Les objets sont écrits en JSON.

**Renvoie** `boolean` : `false` en cas d'échec.

```js
nc.writeFile("./dist/index.html", html);
nc.writeFile("./.secrets/token", token, { mode: 0o600 });
```

## writeJSON

```ts
writeJSON(path: string, data: unknown, options?: WriteJSONOptions): boolean
```

Écrit une valeur en JSON, de façon atomique, en créant les dossiers.

**Renvoie** `boolean` : `false` en cas d'échec, par exemple sur une structure circulaire.

```js
nc.writeJSON("./data/users.json", users);
```

## appendFile

```ts
appendFile(path: string, data: string | Buffer<ArrayBufferLike>): boolean
```

Ajoute à la fin d'un fichier, en le créant avec ses dossiers si nécessaire.

```js
nc.appendFile("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
```

## createFile

```ts
createFile(path: string, force?: boolean, data?: string | object | Buffer<ArrayBufferLike> | null): boolean | undefined
```

Crée un fichier et ses dossiers.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `force?` | `boolean` | Remplace le fichier s'il existe. Par défaut : `false`. |
| `data?` | `string \| ``Buffer`` \| object \| null` | Les objets sont écrits en JSON. |

**Renvoie** `boolean | undefined` : `false` s'il existait déjà ou en cas d'échec.

```js
nc.createFile("./notes.txt", false, "hello");    // seulement s'il n'existe pas
nc.createFile("./data.json", true, { ok: true }); // le remplace
```

## createFolder

```ts
createFolder(path: string, force?: boolean): boolean | undefined
```

Crée un dossier et ses parents.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `force?` | `boolean` | Le supprime et le recrée s'il existe. Par défaut : `false`. |

**Renvoie** `boolean | undefined` : `false` s'il existait déjà ou en cas d'échec.

```js
nc.createFolder("./uploads");
nc.createFolder("./cache", true); // repartir d'un dossier vide
```

## ensureFolder

```ts
ensureFolder(path: string): string
```

S'assure qu'un dossier existe et renvoie son chemin absolu.

**Lève** `Error` : S'il ne peut pas être créé.

```js
const dir = nc.ensureFolder("./storage/uploads");
```

## ensureFile

```ts
ensureFile(path: string): string
```

S'assure qu'un fichier existe (vide si nécessaire) et renvoie son chemin absolu. Un fichier existant est laissé tel quel.

**Lève** `Error` : S'il ne peut pas être créé.

## touch

```ts
touch(path: string): boolean
```

Met à jour la date de modification d'un fichier, en le créant si nécessaire, comme la commande Unix `touch`.

## deleteFolder

```ts
deleteFolder(path: string): boolean | undefined
```

Supprime un dossier et tout son contenu.

**Renvoie** `boolean | undefined` : `undefined` s'il n'existe pas.

## deleteFile

```ts
deleteFile(path: string): boolean | undefined
```

Supprime un fichier.

**Renvoie** `boolean | undefined` : `undefined` s'il n'existe pas.

## remove

```ts
remove(path: string): boolean
```

Supprime un fichier ou un dossier, selon le cas. Rien ne se passe si le chemin n'existe pas.

**Renvoie** `boolean` : `true` si quelque chose a été supprimé.

```js
nc.remove("./dist");
```

## deleteFoldersIn

```ts
deleteFoldersIn(path?: string, filter?: ((folder: string) => boolean) | undefined): number | undefined
```

Supprime, dans un dossier, les dossiers qui passent un test.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Par défaut : le répertoire de travail. |
| `filter?` | `(folder: string) => boolean` | Reçoit des chemins absolus. Par défaut : tous les dossiers. |

**Renvoie** `number | undefined` : Le nombre d'éléments supprimés.

```js
nc.deleteFoldersIn("./packages", (folder) => folder.endsWith("dist"));
```

## deleteFilesIn

```ts
deleteFilesIn(path?: string, recursive?: boolean, filter?: ((file: string) => boolean) | undefined): number | undefined
```

Supprime, dans un dossier, les fichiers qui passent un test.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Par défaut : le répertoire de travail. |
| `recursive?` | `boolean` | Par défaut : `false`. |
| `filter?` | `(file: string) => boolean` | Reçoit des chemins absolus. Par défaut : tous les fichiers. |

**Renvoie** `number | undefined` : Le nombre d'éléments supprimés.

```js
nc.deleteFilesIn("./logs", false, (file) => file.endsWith(".log"));
```

## emptyFolder

```ts
emptyFolder(path: string): boolean | undefined
```

Supprime tout le contenu d'un dossier, en conservant le dossier.

**Renvoie** `boolean | undefined` : `undefined` s'il n'existe pas.

## copy

```ts
copy(source: string, destination: string, options?: CopyOptions): boolean
```

Copie un fichier ou un dossier entier, comme `cp -r`.

**Renvoie** `boolean` : `false` si la source est absente ou si la copie a échoué.

```js
nc.copy("./templates", "./dist/templates");
nc.copy("./.env.example", "./.env", { overwrite: false });
```

## move

```ts
move(source: string, destination: string, options?: { overwrite?: boolean; } | undefined): boolean
```

Déplace ou renomme un fichier ou un dossier, y compris d'un disque à un autre.

| Paramètre | Type | Description |
| --- | --- | --- |
| `source` | `string` |  |
| `destination` | `string` |  |
| `options?` | `{ overwrite?: boolean }` | `overwrite` remplace une destination existante. Par défaut : `true`. |

```js
nc.move("./report.pdf", "./archive/2024/report.pdf");
```

## copyFoldersIn

```ts
copyFoldersIn(options: CopyFoldersOptions): number | undefined
```

Copie les dossiers contenus dans un dossier vers un autre. `copy()` est plus simple dans la plupart des cas.

**Renvoie** `number | undefined` : Le nombre d'éléments copiés.

## copyFolder

```ts
copyFolder(options: CopyFolderOptions): boolean | undefined
```

Copie un dossier. Sans `recursive` ni `withFiles`, seul le dossier vide est créé ; `copy()` copie tout en un seul appel.

## copyFilesIn

```ts
copyFilesIn(options: CopyFilesOptions): number | undefined
```

Copie les fichiers contenus dans un dossier vers un autre, en conservant l'arborescence.

**Renvoie** `number | undefined` : Le nombre d'éléments copiés.

```js
nc.copyFilesIn({ path: "./src", dest: "./dist", filter: (file) => file.endsWith(".css") });
```

## copyFile

```ts
copyFile(options: CopyFileOptions): boolean | undefined
```

Copie un fichier. Si `dest` se termine par `/`, le fichier garde son nom dans ce dossier.

```js
nc.copyFile({ path: "./src/index.js", dest: "./dist/" });
```

## moveFoldersIn

```ts
moveFoldersIn(options: CopyFoldersOptions): number | undefined
```

Déplace les dossiers contenus dans un dossier.

**Renvoie** `number | undefined` : Le nombre d'éléments déplacés.

## moveFolder

```ts
moveFolder(options: CopyFolderOptions & { path: string; }): boolean | undefined
```

Déplace un dossier.

## moveFilesIn

```ts
moveFilesIn(options: CopyFilesOptions): number | undefined
```

Déplace les fichiers contenus dans un dossier.

**Renvoie** `number | undefined` : Le nombre d'éléments déplacés.

## moveFile

```ts
moveFile(options: CopyFileOptions): boolean | undefined
```

Déplace un fichier.

```js
nc.moveFile({ path: "./logs/app.log", dest: "./logs/archive/" });
```

## exists

```ts
exists(path: string): boolean
```

Un fichier ou un dossier existe-t-il à ce chemin ?

## isFile

```ts
isFile(path: string): boolean
```

Est-ce un fichier existant ?

## isFolder

```ts
isFolder(path: string): boolean
```

Est-ce un dossier existant ?

## stat

```ts
stat(path: string): Stats | undefined
```

Taille, dates et type d'un chemin.

**Renvoie** `fs.``Stats`` | undefined` : `undefined` s'il n'existe pas.

```js
nc.stat("./video.mp4")?.mtime;
```

## fileSize

```ts
fileSize(path: string): number | undefined
```

La taille d'un fichier en octets.

**Renvoie** `number | undefined` : `undefined` s'il n'existe pas.

```js
nc.num.formatBytes(nc.fileSize("./backup.zip") ?? 0); // "1.2 GB"
```

## folderSize

```ts
folderSize(path: string): number | undefined
```

La taille totale de tous les fichiers d'un dossier.

**Renvoie** `number | undefined` : `undefined` s'il n'existe pas.

## hashFile

```ts
hashFile(path: string, options?: { algorithm?: string; encoding?: "base64" | "base64url" | "hex"; } | undefined): string | undefined
```

Calcule le hash d'un fichier par morceaux, les très gros fichiers ne posent donc pas de problème.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `options?` | `{ algorithm?: string, encoding?: "hex" \| "base64" \| "base64url" }` | L'algorithme et la façon d'écrire le hash. Par défaut : sha256 en hexadécimal. |

**Renvoie** `string | undefined` : `undefined` s'il ne peut pas être lu.

```js
nc.hashFile("./release.zip");                     // sha256, hex
nc.hashFile("./release.zip", { algorithm: "md5" });
```

## tempFolder

```ts
tempFolder(prefix?: string): string
```

Crée un nouveau dossier unique dans le répertoire temporaire du système.

| Paramètre | Type | Description |
| --- | --- | --- |
| `prefix?` | `string` | Par défaut : `"nc-"`. |

```js
const dir = nc.tempFolder("export-");
try { await exportTo(dir); } finally { nc.remove(dir); }
```

## sanitizeFilename

```ts
sanitizeFilename(name: string, options?: { replacement?: string; } | undefined): string
```

Transforme n'importe quel texte en un nom de fichier valide sous Windows, macOS et Linux : les caractères interdits sont remplacés, les noms réservés comme `CON` sont préfixés, et la longueur est plafonnée.

| Paramètre | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `options?` | `{ replacement?: string }` | `replacement` prend la place de chaque caractère retiré. Par défaut : `"_"`. |

```js
nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'); // "Report_ Q1_Q2 _final__.pdf"
nc.sanitizeFilename("CON.txt");                    // "_CON.txt"
```

## watch

```ts
watch(options?: WatchOptions): Watcher | undefined
```

Surveille les modifications d'un fichier ou d'un dossier.

**Renvoie** [`Watcher`](#watcher)` | undefined` : `undefined` si le chemin n'existe pas.

```js
const watcher = nc.watch({ path: "./src", recursive: true, debounce: 100 })
  .on("change", (file) => nc.info(`Changed: ${file}`))
  .on("rename", (file) => nc.info(`Added or removed: ${file}`));
watcher.stop();
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { CopyFileOptions } from "@ix-xs/node-comfort"`.

### CopyFileOptions

Options de `copyFile()` et `moveFile()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `path` | `string` | Fichier source. |
| `dest` | `string` | Fichier de destination, ou un dossier s'il se termine par `/`. |
| `force?` | `boolean` | Supprime d'abord la destination. |

### CopyFilesOptions

Options de `copyFilesIn()` et `moveFilesIn()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `dest` | `string` | Dossier de destination. |
| `path?` | `string` | Dossier source. Par défaut : le répertoire de travail. |
| `recursive?` | `boolean` | Inclut les fichiers des dossiers imbriqués, en conservant l'arborescence. Par défaut : `true`. |
| `force?` | `boolean` | Supprime d'abord les fichiers de destination existants. |
| `filter?` | `((file: string) => boolean)` | Conserve un fichier quand le filtre renvoie `true`. Reçoit des chemins absolus. |

### CopyFolderOptions

Options de `copyFolder()` et `moveFolder()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `dest` | `string` | Dossier de destination. |
| `path?` | `string` | Dossier source. Par défaut : le répertoire de travail. |
| `recursive?` | `boolean` | Copie aussi les dossiers imbriqués. |
| `withFiles?` | `boolean` | Copie aussi les fichiers. `copy()` fait tout cela en un seul appel. |
| `force?` | `boolean` | Supprime d'abord une destination existante. |

### CopyFoldersOptions

Options de `copyFoldersIn()` et `moveFoldersIn()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `dest` | `string` | Dossier de destination. |
| `path?` | `string` | Dossier source. Par défaut : le répertoire de travail. |
| `recursive?` | `boolean` | Inclut les dossiers imbriqués. Par défaut : `true`. |
| `withFiles?` | `boolean` | Copie aussi les fichiers de chaque dossier. |
| `force?` | `boolean` | Supprime d'abord un dossier de destination existant. |
| `filter?` | `((folder: string) => boolean)` | Conserve un dossier quand le filtre renvoie `true`. Reçoit des chemins absolus. |

### CopyOptions

Options de `copy()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `overwrite?` | `boolean` | Remplace les fichiers existants. Par défaut : `true`. |
| `filter?` | `((source: string, destination: string) => boolean)` | Renvoyez `false` pour ignorer un fichier ou un dossier. |
| `preserveTimestamps?` | `boolean` | Conserve les dates de modification. |

### FindOptions

Options de `find()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `cwd?` | `string` | Où commencer. Par défaut : le répertoire de travail. |
| `type?` | `"file" \| "folder" \| "any"` | Par défaut : `"file"`. |
| `ignore?` | `string[]` | Noms de dossiers à ignorer. Par défaut : `node_modules` et `.git`. |

### GlobOptions

Options de `glob()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `cwd?` | `string` | D'où part le motif. Par défaut : le répertoire de travail. |
| `absolute?` | `boolean` | Renvoie des chemins absolus. |
| `dot?` | `boolean` | Permet à `*` et `**` de correspondre aux noms qui commencent par un point. |
| `ignore?` | `string[]` | Motifs à exclure. Par défaut : `node_modules` et `.git`. |
| `type?` | `"files" \| "folders" \| "all"` | Par défaut : `"files"`. |

### ListOptions

Options de `getFilesIn()` et `getFoldersIn()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `recursive?` | `boolean` | Descend dans les dossiers imbriqués. Par défaut : `true`. |
| `hidden?` | `boolean` | Inclut les noms qui commencent par un point. Par défaut : `true`. |
| `ignore?` | `string[]` | Noms de dossiers à ignorer. Par défaut : `["node_modules"]`. |

### ReadJSONOptions

Options de `readJSON()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `comments?` | `boolean` | Autorise les commentaires et les virgules finales, comme dans `tsconfig.json`. |
| `reviver?` | `((key: string, value: any) => any)` | Passé à `JSON.parse`. |

### Watcher

Renvoyé par `watch()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `on` | `<``E`` extends "change" \| "rename" \| "all" \| "error">(event: ``E``, callback: ``E`` extends "all" ? (event: "rename" \| "change", file: string) => void : ``E`` extends "error" ? (error: ``Error``) => void : (file: string) => void) => `[`Watcher`](#watcher) | Écoute les modifications. `"all"` reçoit aussi le nom de l'événement. `"error"` vous signale que la surveillance s'est interrompue, par exemple parce que le dossier a été supprimé. |
| `stop` | `() => void` | Arrête la surveillance. |
| `pause` | `() => `[`Watcher`](#watcher) | Ignore les événements jusqu'à `resume()`. |
| `resume` | `() => `[`Watcher`](#watcher) |  |

### WatchOptions

Options de `watch()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Ce qu'il faut surveiller. Par défaut : le répertoire de travail. |
| `recursive?` | `boolean` | Surveille aussi les dossiers imbriqués. |
| `filter?` | `((event: "rename" \| "change", file: string) => boolean)` | Renvoyez `false` pour ignorer un événement. |
| `debounce?` | `string \| number` | Fusionne les événements qui touchent le même fichier pendant cette durée, en ms ou sous la forme `"100ms"`. Les éditeurs enregistrent souvent en plusieurs étapes. |

### WriteFileOptions

Options de `writeFile()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `atomic?` | `boolean` | Écrit dans un fichier temporaire puis le renomme, pour que personne ne lise un fichier à moitié écrit et qu'un plantage ne puisse pas le corrompre. Par défaut : `true`. |
| `encoding?` | `BufferEncoding` | Par défaut : `"utf8"`. |
| `mode?` | `number` | Permissions, comme `0o600` pour les secrets. Un fichier qui existe déjà conserve les siennes. |
| `fsync?` | `boolean` | Attend que les données soient sur le disque avant de rendre la main. Plus lent, pour les fichiers qui doivent survivre à une coupure de courant. |
| `spaces?` | `number` | Indentation lors de l'écriture d'un objet en JSON. Par défaut : `2`. |

### WriteJSONOptions

Options de `writeJSON()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `spaces?` | `number` | Par défaut : `2`. |
| `atomic?` | `boolean` | Par défaut : `true`. |
| `replacer?` | `((key: string, value: unknown) => unknown)` | Passé à `JSON.stringify`. |
| `mode?` | `number` | Permissions, comme `0o600` pour les secrets. Un fichier qui existe déjà conserve les siennes. |
| `fsync?` | `boolean` | Attend que les données soient sur le disque avant de rendre la main. |
