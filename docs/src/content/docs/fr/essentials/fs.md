---
title: "Fichiers et dossiers"
description: "`nc.fs` : lire et écrire du texte et du JSON, lister, trouver, copier, déplacer, supprimer et surveiller, de façon synchrone, avec des chemins relatifs au fichier appelant et sans try/catch pour les échecs courants."
---

```js
const { fs } = require("@ix-xs/node-comfort");
```

```js
const settings = fs.readJSON("./settings.json", { theme: "light" });
fs.writeJSON("./settings.json", { ...settings, theme: "dark" });
```

## Valeurs de retour

Un fichier manquant ou une opération ratée ne lève pas d'erreur. Les lectures renvoient `undefined` (ou la valeur de repli), les écritures et les opérations renvoient `false` :

```js
fs.read("./notes.txt");           // undefined s'il manque
fs.readJSON("./config.json", {}); // {} s'il manque ou s'il est invalide
if (!fs.write("/root/x", "data")) logger.warn("Could not write");
```

Seules `ensureFile` et `ensureFolder`, qui doivent réussir, lèvent une erreur.

## Chemins

| Chemin | Part de |
| --- | --- |
| Absolu | Utilisé tel quel |
| `./x`, `../x` | Le fichier qui appelle la fonction, d'où que le script soit lancé |
| `x`, `logs/x` | Le dossier de travail, comme avec `node:fs` |

`fs.resolve(path)` renvoie le chemin absolu qu'utiliserait une fonction de `nc.fs` ; `fs.resolve()` est le dossier de travail. `fs.remove(".")` est le dossier du fichier appelant.

Seul `nc.fs` lit `./` depuis le fichier appelant. `nc.sqlite.open()`, le `file.path` du logger, `nc.http.download()`, `nc.env.load()`, `nc.sys.open()` et `fs.glob()` le lisent depuis le dossier de travail : passez-leur `fs.resolve("./x")` pour un chemin à côté de votre fichier.

## Lire

```js
fs.read("./README.md");                              // string
fs.read("./logo.png", "buffer");                     // Buffer
fs.readLines("./urls.txt");                          // ["https://a.com", "https://b.com"]
fs.readJSON("./settings.json", { theme: "light" });  // la valeur de repli s'il manque ou s'il est invalide
fs.readJSON("./tsconfig.json", {}, { comments: true });
```

| Fonction | Renvoie quand la lecture échoue |
| --- | --- |
| `read(path, encoding = "utf8")` | `undefined`. `"buffer"` renvoie un `Buffer` |
| `readLines(path)` | `undefined`. Un retour à la ligne final n'ajoute pas de ligne vide |
| `readJSON(path, fallback?, { comments, reviver })` | `fallback`. `comments` accepte les commentaires et les virgules finales |

## Écrire

```js
fs.write("./dist/index.html", html);
fs.write("./.secrets/token", token, { mode: 0o600 });
fs.write("./data/ledger.json", ledger, { fsync: true }); // un objet est écrit en JSON
fs.writeJSON("./data/users.json", users, { spaces: 2 });
fs.append("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
```

L'écriture passe par un fichier temporaire, ensuite renommé : un lecteur ne voit jamais un fichier à moitié écrit, et un plantage ne peut pas le corrompre. Les dossiers manquants sont créés. Un fichier qui existe déjà garde ses permissions.

| Option de `write` / `writeJSON` | Par défaut | |
| --- | --- | --- |
| `atomic` | `true` | Fichier temporaire, puis renommage |
| `mode` | celui du système | Permissions d'un nouveau fichier, comme `0o600` |
| `fsync` | `false` | Attend que les données soient sur le disque |
| `spaces` | `2` | Indentation du JSON |
| `encoding` | `"utf8"` | `write` seulement |
| `replacer` | aucun | `writeJSON` seulement, passé à `JSON.stringify` |

`append(path, data)` ajoute à la fin d'un fichier et le crée si besoin.

## Créer

```js
fs.ensureFolder("./storage/uploads"); // son chemin absolu
fs.ensureFile("./logs/app.log");      // un fichier vide si besoin, un fichier existant n'est pas touché
fs.touch("./.last-run");              // true, et la date de modification est maintenant
const dir = fs.temp("export-");       // un nouveau dossier dans le dossier temporaire du système
```

| Fonction | Renvoie | En cas d'échec |
| --- | --- | --- |
| `ensureFolder(path)` | Chemin absolu | Lève une erreur |
| `ensureFile(path)` | Chemin absolu | Lève une erreur |
| `touch(path)` | `true` | `false` |
| `temp(prefix = "nc-")` | Chemin absolu d'un nouveau dossier unique | Lève une erreur |

## Vérifier et mesurer

```js
fs.exists("./.env");               // true
fs.isFile("./logs/audit.log");     // true
fs.isFolder("./logs");             // true
fs.size("./logs/audit.log");       // 14, en octets
fs.size("./data");                 // 57, tous les fichiers du dossier
fs.hash("./release.zip");          // sha256 en hexadécimal, lu par morceaux
fs.hash("./release.zip", { algorithm: "md5", encoding: "base64" });
fs.stat("./video.mp4")?.mtime;
```

`size`, `hash` et `stat` renvoient `undefined` quand le chemin n'existe pas.

## Lister et trouver

```js
fs.list("./");                                             // tous les fichiers, récursivement, chemins absolus
fs.list("./", { type: "folders" });
fs.list("./", { recursive: false });
fs.list("./", { filter: (file) => file.endsWith(".json") });

fs.glob("src/**/*.{js,ts}");                               // ["src/index.js", "src/lib/a.ts"]
fs.glob("**/*.test.js", { ignore: ["**/fixtures/**"] });
fs.find("package.json");                                   // le plus proche, en descendant
fs.findUp("package.json");                                 // le plus proche, en remontant
fs.findUp(["pnpm-lock.yaml", "package-lock.json"], { stopAt: repoRoot });
```

| Option de `list(folder, options)` | Par défaut | |
| --- | --- | --- |
| `type` | `"files"` | `"files"`, `"folders"` ou `"all"` |
| `recursive` | `true` | Entre dans les sous-dossiers |
| `hidden` (ou `dot`) | `true` | Inclut les noms qui commencent par un point |
| `ignore` | `["node_modules"]` | Noms de dossiers ignorés avec tout leur contenu |
| `filter` | aucun | Garde un chemin quand il renvoie `true`. Un dossier écarté est quand même parcouru |

`list` renvoie `undefined` quand le dossier n'existe pas.

| Option de `glob(pattern, options)` | Par défaut | |
| --- | --- | --- |
| `cwd` | dossier de travail | Point de départ du motif |
| `absolute` | `false` | Chemins absolus. Un motif qui part de la racine du disque les renvoie toujours |
| `dot` | `false` | `*` et `**` couvrent les noms qui commencent par un point |
| `ignore` | `node_modules`, `.git` | Motifs écartés |
| `type` | `"files"` | `"files"`, `"folders"` ou `"all"` |

Les motifs comprennent `*`, `**`, `?`, `[abc]` et `{a,b}`. `glob` renvoie des chemins triés, avec des `/`.

`find(name, { cwd, type, ignore })` cherche en descendant, `findUp(name, { cwd, type, stopAt })` en remontant jusqu'à la racine du disque ou jusqu'à `stopAt`. Les deux renvoient un chemin absolu ou `undefined`. `findUp` accepte plusieurs noms, essayés dans l'ordre dans chaque dossier.

## Copier et déplacer

```js
fs.copy("./templates", "./dist/templates");                   // un dossier, fusionné dans dest
fs.copy("./logo.png", "./dist/");                             // ./dist/logo.png
fs.copy("./.env.example", "./.env", { overwrite: false });
fs.copy("./src", "./dist", { filter: (source) => !source.endsWith(".test.js") });
fs.move("./report.pdf", "./archive/2026/report.pdf");        // fonctionne d'un disque à l'autre
fs.move("./report.pdf", "./archive/");                       // ./archive/report.pdf
```

| Source | `dest` | Résultat |
| --- | --- | --- |
| Un fichier | Un dossier existant, ou finit par `/` (ou `\` sous Windows) | Dedans, sous le même nom |
| Un fichier | Autre chose | `dest` lui-même |
| Un dossier | Tout | `dest` lui-même, fusionné avec ce qui s'y trouve |

| Option | Par défaut | |
| --- | --- | --- |
| `overwrite` | `true` | Remplace ce qui existe |
| `filter(source, destination)` | aucun | Renvoyez `false` pour sauter un fichier ou un dossier, avec tout son contenu |
| `preserveTimestamps` | `false` | `copy` seulement |

Les deux renvoient `false` quand la source manque, quand `source` ou `dest` est vide, quand la destination est dans la source, ou quand l'opération échoue. Les liens d'un dossier copié sont copiés comme liens, jamais suivis. `move` met de côté une destination qui gêne, et la remet en place si le déplacement échoue.

## Supprimer

```js
fs.remove("./dist");                                           // un fichier ou un dossier
fs.remove("./cache", { contents: true });                      // ./cache reste, vide
fs.remove("./logs", { filter: (file) => file.endsWith(".log") }); // seulement ce qui passe, à toute profondeur
```

| Option | |
| --- | --- |
| `contents` | Vide le dossier et le garde |
| `filter(path)` | Ne supprime que ce qui passe. Implique `contents` |

`remove` renvoie `false` quand le chemin est vide ou n'existe pas. Une chaîne vide est refusée, jamais lue comme le dossier de travail : écrivez `"."` pour le dossier du fichier appelant. Avec `contents` ou `filter`, un lien vers un dossier n'est jamais vidé.

## Surveiller

```js
const watcher = fs.watch("./src", { recursive: true, debounce: "100ms" })
  .on("change", (file) => rebuild(file))
  .on("rename", (file) => logger.info(`Added or removed: ${file}`))
  .on("error", (error) => logger.warn("The watch broke:", error.message));

watcher.stop();
```

| Option | |
| --- | --- |
| `path` | Ce qui est surveillé, s'il n'est pas passé en premier. Par défaut le dossier de travail |
| `recursive` | Les sous-dossiers aussi |
| `debounce` | Fusionne les événements d'un même fichier dans ce délai, en ms ou comme `"100ms"` |
| `filter(event, file)` | Renvoyez `false` pour ignorer un événement |

| Méthode du watcher | |
| --- | --- |
| `on(event, callback)`, `off(event, callback)` | `"change"`, `"rename"`, `"all"` (reçoit aussi le nom de l'événement), `"error"` |
| `pause()`, `resume()` | Ignore les événements un moment |
| `stop()` | Arrête la surveillance |

Chaque méthode renvoie le watcher. `watch` renvoie `undefined` quand le chemin n'existe pas. Quand le dossier surveillé est supprimé, `"error"` est émis une fois avec le code `ENOENT` et le watcher s'arrête. `using watcher = fs.watch(...)` l'arrête à la fin du bloc ([Ressources](/basics/resources/)).

## Noms de fichiers

```js
fs.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'); // "Report_ Q1_Q2 _final__.pdf"
fs.sanitizeFilename("CON.txt");                    // "_CON.txt"
```

Le nom fonctionne sous Windows, macOS et Linux : les caractères interdits sont remplacés (`replacement`, `"_"` par défaut), les caractères invisibles retirés, les noms réservés préfixés, la longueur limitée à 255 octets.

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.readFile()`, `nc.fs.readFile()` | `nc.fs.read()` |
| `nc.writeFile()`, `nc.fs.writeFile()` | `nc.fs.write()` |
| `nc.appendFile()`, `nc.fs.appendFile()` | `nc.fs.append()` |
| `nc.fileSize()`, `nc.folderSize()` (et sous `nc.fs`) | `nc.fs.size()` |
| `nc.hashFile()`, `nc.fs.hashFile()` | `nc.fs.hash()` |
| `nc.getFilesIn()`, `nc.getFoldersIn()` (et sous `nc.fs`) | `nc.fs.list()`, `nc.fs.list(folder, { type: "folders" })` |
| `nc.copyFile()`, `nc.copyFolder()`, `nc.copyFilesIn()`, `nc.copyFoldersIn()` (et sous `nc.fs`) | `nc.fs.copy()` |
| `nc.moveFile()`, `nc.moveFolder()`, `nc.moveFilesIn()`, `nc.moveFoldersIn()` (et sous `nc.fs`) | `nc.fs.move()` |
| `nc.deleteFile()`, `nc.deleteFolder()`, `nc.deleteFilesIn()`, `nc.deleteFoldersIn()` (et sous `nc.fs`) | `nc.fs.remove()` |
| `nc.emptyFolder()`, `nc.fs.emptyFolder()` | `nc.fs.remove(folder, { contents: true })` |
| `nc.createFile()`, `nc.fs.createFile()` | `nc.fs.ensureFile()` ou `nc.fs.write()` |
| `nc.createFolder()`, `nc.fs.createFolder()` | `nc.fs.ensureFolder()` |
| `nc.tempFolder()`, `nc.fs.tempFolder()` | `nc.fs.temp()` |
| `nc.createPath()`, `nc.fs.createPath()` | `nc.fs.resolve()` |
| `nc.getFile(p)`, `nc.fs.getFile(p)` | `nc.fs.isFile(p) ? nc.fs.resolve(p) : undefined` |
| `nc.getFolder(p)`, `nc.fs.getFolder(p)` | `nc.fs.isFolder(p) ? nc.fs.resolve(p) : undefined` |
| `nc.getEnv()`, `nc.fs.getEnv()` | `nc.env.get()` |
| `nc.readJSON()`, `nc.readLines()`, `nc.writeJSON()`, `nc.exists()`, `nc.isFile()`, `nc.isFolder()`, `nc.stat()`, `nc.glob()`, `nc.find()`, `nc.findUp()`, `nc.ensureFile()`, `nc.ensureFolder()`, `nc.touch()`, `nc.copy()`, `nc.move()`, `nc.remove()`, `nc.sanitizeFilename()`, `nc.watch()` | Le même nom sous `nc.fs` |

Les anciens noms fonctionnent encore en 3.0, avec leur comportement de la 2.2, avertissent une fois et disparaissent en 4.0. Là où la nouvelle fonction diffère :

- `fileSize()` sur un dossier renvoyait `undefined` ; `size()` renvoie le total de ses fichiers.
- `createFile()` et `createFolder()` renvoyaient `false` quand le chemin existait ou en cas d'échec ; `ensureFile()` et `ensureFolder()` laissent ce qui existe, renvoient le chemin absolu et lèvent une erreur en cas d'échec.
- Les fonctions `*In` renvoyaient un nombre ; `copy()`, `move()` et `remove()` renvoient un booléen.
- `copy()` et `move()` d'un fichier vers un dossier existant, ou vers un `dest` qui finit par `/`, le placent désormais dedans. En 2.2, le fichier pouvait remplacer tout le dossier (`move()`), être écrit sous un nom pris au chemin du dossier, ou écraser sans prévenir.
- `remove()`, `copy()` et `move()` refusent un chemin ou une destination vide. La 2.2 le résolvait en dossier de travail.

Voir [Passer à la 3.0](/help/upgrade-3-0/).
