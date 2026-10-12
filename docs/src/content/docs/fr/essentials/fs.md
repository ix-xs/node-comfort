---
title: "Fichiers et dossiers"
description: "`nc.fs` couvre le travail sur les fichiers des scripts et des serveurs de tous les jours : lire et écrire du texte et du JSON, copier, déplacer, lister, surveiller. Ses fonctions sont aussi disponibles à la racine (`nc.readJSON()`)."
sidebar:
  order: 2
---

```js
const settings = nc.readJSON("./settings.json", { theme: "light" });
nc.writeJSON("./settings.json", { ...settings, theme: "dark" });
```

## Pas de try/catch pour les cas courants

Un fichier absent ou une opération qui échoue ne lève pas d'erreur. Les fonctions de lecture renvoient `undefined` (ou la valeur de repli que vous passez), et les fonctions d'écriture renvoient `false` :

```js
const text = nc.readFile("./notes.txt");            // undefined s'il est absent
const config = nc.readJSON("./config.json", {});    // {} s'il est absent ou invalide
if (!nc.writeFile("/root/x", "data")) nc.warn("Could not write");
```

Les quelques fonctions qui doivent réussir, comme `ensureFolder()`, le disent et lèvent une erreur.

## Chemins

- Les chemins absolus sont utilisés tels quels.
- Les chemins qui commencent par `./` ou `../` partent **du fichier qui appelle la fonction**. Un script qui lit `./data.json` trouve le fichier situé à côté de lui, d'où que vous le lanciez.
- Les autres chemins relatifs, comme `logs/app.log`, partent du répertoire de travail, comme avec le module `fs` de Node.

`nc.createPath("./x")` vous montre le chemin absolu qu'une fonction utiliserait.

## Écrire sans risque

`writeFile()` et `writeJSON()` écrivent dans un fichier temporaire, puis le renomment. Celui qui lit le fichier n'en voit jamais la moitié, et un plantage en cours d'écriture ne peut pas le corrompre. Les dossiers manquants sont créés.

```js
nc.writeFile("./dist/index.html", html);
nc.writeFile("./.secrets/token", token, { mode: 0o600 });
nc.writeJSON("./data/users.json", users, { spaces: 2 });
nc.appendFile("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
```

Un fichier qui existe déjà conserve ses permissions quand il est remplacé : le token ci-dessus reste lisible par son seul propriétaire, même si une écriture ultérieure ne répète pas `mode`.

Pour un fichier qui doit survivre à une coupure de courant, `fsync` fait attendre `writeFile()` jusqu'à ce que les données soient sur le disque avant de rendre la main. C'est plus lent, réservez-le donc aux fichiers qui en ont besoin :

```js
nc.writeFile("./data/ledger.json", ledger, { fsync: true }); // les objets sont écrits en JSON
```

`readJSON()` sait lire les fichiers qui contiennent des commentaires et des virgules finales, comme `tsconfig.json` :

```js
const tsconfig = nc.readJSON("./tsconfig.json", {}, { comments: true });
```

## Trouver des fichiers

```js
nc.glob("src/**/*.{js,ts}");                         // ["src/index.js", "src/lib/a.ts"]
nc.glob("**/*.test.js", { ignore: ["**/fixtures/**"] });
nc.glob("packages/*", { type: "folders", absolute: true });

nc.find("package.json");                             // le plus proche, en descendant
nc.findUp("package.json");                           // le plus proche, en remontant
nc.getFilesIn("./src");                              // tous les fichiers, en chemins absolus
nc.readLines("./urls.txt");                          // ["https://a.com", "https://b.com"]
```

Les globs comprennent `*`, `**`, `?`, `[abc]` et `{a,b}`. `node_modules` et `.git` sont ignorés, sauf indication contraire de votre part. Les motifs sont relatifs au répertoire de travail, ou à `cwd` ; un motif qui part de la racine du disque cherche à cet endroit et renvoie des chemins absolus :

```js
nc.glob(`${nc.tempFolder("build-")}/**/*.json`);
nc.glob("/var/log/**/*.log");
```

`findUp()` cherche dans un dossier, puis dans son parent, et ainsi de suite jusqu'à la racine du disque. C'est ainsi que l'on trouve le `package.json` ou le `.git` auquel un fichier appartient. Vous obtenez un chemin absolu, ou `undefined` :

```js
nc.findUp(".git", { type: "folder", cwd: __dirname });
nc.findUp(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"]); // le premier trouvé dans chaque dossier
nc.findUp(".editorconfig", { cwd: __dirname, stopAt: repoRoot }); // ne cherche jamais au-dessus de repoRoot
```

La recherche part du répertoire de travail, sauf si vous passez `cwd`, et elle trouve aussi bien les fichiers que les dossiers, sauf si vous passez `type`.

## Copier, déplacer, supprimer

```js
nc.copy("./templates", "./dist/templates");            // des fichiers ou des dossiers entiers
nc.copy("./.env.example", "./.env", { overwrite: false });
nc.move("./report.pdf", "./archive/2026/report.pdf");  // fonctionne d'un disque à l'autre
nc.remove("./dist");                                    // fichier ou dossier
nc.emptyFolder("./tmp");
```

## Vérifier et mesurer

```js
nc.exists("./.env");
nc.isFile("./a.txt"); nc.isFolder("./src");
nc.fileSize("./backup.zip");         // en octets
nc.folderSize("./node_modules");
nc.hashFile("./release.zip");        // sha256, lu par morceaux
nc.stat("./video.mp4")?.mtime;
```

## Surveiller

```js
const watcher = nc.watch({ path: "./src", recursive: true, debounce: 100 })
  .on("change", (file) => rebuild(file))
  .on("rename", (file) => nc.info(`Added or removed: ${file}`))
  .on("error", (error) => nc.warn("The watch broke:", error.message));

watcher.stop();
```

`debounce` regroupe les rafales d'événements que les éditeurs produisent à l'enregistrement. Il accepte des millisecondes ou un texte comme `"100ms"`.

`"error"` vous signale que la surveillance elle-même a échoué, pour que vous puissiez en lancer une nouvelle. Quand le dossier surveillé est supprimé, vous recevez cet événement une seule fois, avec le code `ENOENT`, et la surveillance s'arrête. Sans écouteur, une telle erreur est ignorée. `watch()` renvoie `undefined` quand le chemin n'existe pas.

## Divers

```js
const dir = nc.tempFolder("export-");                     // un nouveau dossier dans le répertoire temporaire
nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf');         // "Report_ Q1_Q2 _final__.pdf"
nc.ensureFolder("./storage/uploads");
nc.touch("./.last-run");
```

`sanitizeFilename()` produit des noms valables sous Windows, macOS et Linux : les caractères interdits sont remplacés et les noms réservés comme `CON` reçoivent un préfixe.

Les fonctions de la 1.x (`getFile`, `getFolder`, `createFile`, `deleteFolder`, `copyFilesIn`, `moveFile` et les autres) sont toujours là, avec le même comportement. Toutes les fonctions sont listées dans la [référence](/reference/fs/).
