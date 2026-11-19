---
title: "Processus et système"
description: "`nc.sys` : exécuter des commandes, ouvrir des URL et des fichiers, trouver des ports libres, s'arrêter proprement, survivre aux erreurs non rattrapées et connaître la machine."
---

```js
const { sys, logger, num } = require("@ix-xs/node-comfort");
```

## Exécuter des commandes

`run` lance un programme sans shell : les arguments sont passés tels quels, une saisie ne peut donc rien injecter. `exec` passe par le shell, pour les pipes et `&&` : ne construisez jamais sa commande à partir d'une saisie non fiable.

```js
const { stdout } = await sys.run("git", ["log", "-1", "--format=%s"]);
await sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" });
await sys.run("ffmpeg", ["-i", input, output], { timeout: "5m", onStderr: (line) => logger.debug(line) });

const { stdout: count } = await sys.exec("git status --short | wc -l");
```

Les deux renvoient `{ command, stdout, stderr, exitCode, signal, duration }`. Un code de sortie non nul rejette avec une `ProcessError` (code `ERR_PROCESS`) qui porte la sortie, sauf avec `reject: false`.

| Option | Par défaut | |
| --- | --- | --- |
| `cwd` | `process.cwd()` | Une commande relative comme `"./bin/tool"` y est cherchée |
| `env` | | Ajouté à `process.env` ; `undefined` retire une variable |
| `extendEnv` | `true` | `false` passe `env` seul, ou un environnement vide |
| `input` | | Écrit sur stdin |
| `stdio` | `"pipe"` | `"inherit"` affiche la sortie en direct |
| `onStdout`, `onStderr` | | Appelés pour chaque ligne |
| `timeout` | aucun | `"30s"` ou des millisecondes. `false` ou `Infinity` pour aucune limite |
| `signal` | | Tue la commande à l'annulation |
| `reject` | `true` | Rejeter sur un code de sortie non nul |
| `trim` | `true` | Retirer le saut de ligne final |

Sous Windows, `run("npm", ...)` trouve `npm.cmd` et échappe les arguments pour `cmd.exe`, deux fois quand un `.cmd` les transmet. Un dépassement de délai ou une annulation y arrête tout l'arbre de processus. Un argument impossible à échapper (un saut de ligne, ou un guillemet pour un fichier batch qui n'utilise pas `%*`) rejette avec une `ProcessError` avant toute exécution.

```js
try {
  await sys.run("npm", ["run", "build"], { timeout: "2m", signal: controller.signal });
} catch (error) {
  if (error.code === "ETIMEDOUT") console.error("The build took more than 2 minutes");
  else if (error.name === "AbortError") console.error("Build cancelled");
  else throw error;
}
```

| Échec | Erreur |
| --- | --- |
| Code de sortie non nul | `ProcessError`, code `ERR_PROCESS`, avec `exitCode`, `stdout`, `stderr` |
| `timeout` atteint | `ProcessError`, code `ETIMEDOUT`, `timedOut: true` |
| `signal` annulé | `AbortError`, code `ABORT_ERR` |
| Un délai illisible, comme `"soon"` | `TypeError`, avant tout lancement |

Les autres délais de la bibliothèque lèvent une `TimeoutError`, dont le code est aussi `ETIMEDOUT` : `error.code === "ETIMEDOUT"` couvre les deux.

## Trouver et ouvrir

```js
sys.which("node");                 // "C:\\Program Files\\nodejs\\node.exe", ou undefined
sys.which("./node_modules/.bin/eslint", { cwd: "./app" });
sys.open("http://localhost:3000"); // le navigateur par défaut
sys.open("./report.html");
sys.open("vscode://file/C:/app/index.js", { protocols: ["vscode:"] });
```

`which` garde en cache ce qu'il trouve. Un chemin est cherché depuis `cwd`, un nom dans le `PATH`.

`open` lance un programme, comme un double-clic. Un chemin relatif est lu depuis le dossier de travail : passez `nc.fs.resolve("./report.html")` pour le lire depuis le fichier appelant. Ne passez pas un chemin ou une URL que vous n'avez pas choisis.

| `open` reçoit | Résultat |
| --- | --- |
| Une URL `http:`, `https:` ou `mailto:` | Ouverte |
| Un autre schéma (`file:`, `search-ms:`, schémas d'autres applications) | `TypeError`, sauf s'il figure dans `protocols` |
| Un chemin qui existe | Ouvert |
| Un chemin qui n'existe pas | `NodeComfortError`, code `ERR_NOT_FOUND` |
| Un chemin réseau Windows (`\\server\share`) | `TypeError`, sauf avec `allowUNC: true` |

## Ports et adresses

```js
const port = await sys.freePort(3000); // 3000, ou un autre port libre
app.listen(port);
console.log(`Network: http://${sys.localIP() ?? "localhost"}:${port}`);
```

| Fonction | Renvoie |
| --- | --- |
| `freePort(preferred?, host?)` | Le port préféré s'il est libre, un autre sinon |
| `localIP(family = 4)` | L'adresse sur le réseau local, comme `"192.168.1.20"`, ou `undefined`. `localIP(6)` pour l'IPv6 |

## S'arrêter

`onShutdown` exécute du code de nettoyage quand on demande au processus de s'arrêter : Ctrl+C, `docker stop`, `kill`.

```js
const server = app.listen(3000);

sys.onShutdown(() => new Promise((done) => server.close(done)));
sys.onShutdown(() => db.close());
sys.onShutdown((reason) => logger.info(`Stopping (${reason})`));
```

Les gestionnaires s'exécutent en ordre inverse, puis le processus se termine. Chacun reçoit la raison : le signal, ou `"shutdown"`. Un second Ctrl+C quitte immédiatement. Un gestionnaire qui lève une erreur n'arrête pas les autres : son erreur est affichée et le code de sortie devient `1`. `onShutdown` renvoie une fonction qui retire le gestionnaire, utilisable aussi avec `using` ([Ressources](/basics/resources/)).

| Option | Par défaut | |
| --- | --- | --- |
| `timeout` | `"10s"` | Ensuite la sortie est forcée |
| `exitCode` | `0` | Après un arrêt propre |
| `signals` | `SIGINT`, `SIGTERM`, `SIGHUP` (et `SIGBREAK` sous Windows) | |

Pour s'arrêter depuis votre code, appelez `shutdown(code)` plutôt que `process.exit()`, qui saute les gestionnaires :

```js
process.on("uncaughtException", (error) => {
  logger.fatal(error);
  sys.shutdown(1);
});
```

## Survivre aux erreurs non rattrapées

`dontCrash` journalise les exceptions non rattrapées et les rejets non gérés au lieu de planter, et journalise `SIGINT`, `SIGTERM` et `SIGQUIT` avant une sortie propre. `.on()` remplace un gestionnaire :

```js
sys.dontCrash()
  .on("error", (error) => sentry.captureException(error))
  .on("sig", async () => {
    await server.close();
    process.exit(0);
  });
```

| Événement | Le gestionnaire reçoit | Par défaut |
| --- | --- | --- |
| `"error"` | L'erreur | Journalisée |
| `"sig"` | Le signal | Journalisé, puis sortie 0 |
| `"exit"` | Le code de sortie | Journalisé |
| `"beforeExit"` | Le code de sortie | Rien |

Il ne retire que ses propres gestionnaires. `dispose()` retire tout ce qu'il a installé, comme la fin du bloc avec `using`. `.on(event)` sans gestionnaire rétablit celui par défaut.

## La machine

```js
sys.isWindows(); sys.isMac(); sys.isLinux();
sys.isCI();                                  // GitHub Actions, GitLab, CircleCI, Jenkins, Vercel, Netlify...
console.table(sys.info());
num.formatBytes(sys.memory().heapUsed);      // "6 MB"
```

| Fonction | Renvoie |
| --- | --- |
| `isWindows`, `isMac`, `isLinux` | La plateforme |
| `isCI`, `isDocker`, `isWSL` | Où il tourne |
| `info()` | `platform`, `arch`, `release`, `node`, `cpus`, `cpuModel`, `memory`, `uptime`, `hostname`, `user`, `pid`, `ci`, `docker`, `wsl` |
| `memory()` | `rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers`, en octets |

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.dontCrash()` | `nc.sys.dontCrash()` |
| `nc.utils.dontCrash()` | `nc.sys.dontCrash()` |
