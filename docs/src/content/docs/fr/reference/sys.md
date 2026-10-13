---
title: "nc.sys"
description: "Les processus et le système : lancer des commandes et récupérer leur sortie, trouver des exécutables, s'arrêter proprement, ouvrir des URL et se renseigner sur la machine. Se comporte de la même façon sous Windows, macOS et Linux ; sous Windows, `run(\"npm\", [...])` trouve `npm.cmd` et échappe les arguments de façon sûre."
sidebar:
  label: "sys"
  order: 22
---

```js
const { sys } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const sys = require("@ix-xs/node-comfort/sys");
```

Cette page liste tout ce que contient `nc.sys`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/system/sys/).

```js
const { stdout } = await sys.run("git", ["rev-parse", "HEAD"]);
sys.onShutdown(async () => {
  await server.close();
  await db.close();
});
```

## run

```ts
run(file: string, args?: string[], options?: RunOptions): Promise<RunResult>
```

Lance un programme sans shell : les arguments sont donc passés tels quels et une saisie d'utilisateur ne peut rien injecter. Résout avec la sortie ; rejette avec une `ProcessError` si le code de sortie n'est pas 0.

| Paramètre | Type | Description |
| --- | --- | --- |
| `file` | `string` | Un nom trouvé dans `PATH`, ou un chemin. |
| `args?` | `string[]` | Par défaut : `[]`. |
| `options?` | [`RunOptions`](#runoptions) |  |

**Lève** `ProcessError` : S'il ne peut pas démarrer, échoue (sauf avec `reject: false`) ou dépasse le timeout.

```js
const { stdout } = await sys.run("git", ["log", "-1", "--format=%s"]);
await sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" });
await sys.run("ffmpeg", ["-i", input, output], { timeout: "5m" });
```

## exec

```ts
exec(command: string, options?: RunOptions): Promise<RunResult>
```

Lance une ligne de commande via le shell : les pipes, `&&` et les variables fonctionnent donc. Ne la construisez pas à partir d'une entrée non fiable ; utilisez `run()` pour cela.

**Lève** `ProcessError` : Si elle échoue (sauf avec `reject: false`) ou dépasse le timeout.

```js
const { stdout } = await sys.exec("git status --short | wc -l");
const { exitCode } = await sys.exec("npm test", { reject: false, stdio: "inherit" });
```

## which

```ts
which(command: string): string | undefined
```

Trouve un exécutable dans `PATH`, comme la commande `which`.

```js
sys.which("git");  // "/usr/bin/git"
sys.which("nope"); // undefined
```

## open

```ts
open(target: string): boolean
```

Ouvre une URL, un fichier ou un dossier avec l'application par défaut.

**Renvoie** `boolean` : `true` si le programme d'ouverture a démarré.

```js
sys.open("http://localhost:3000");
```

## onShutdown

```ts
onShutdown(handler: (reason: ShutdownReason) => unknown, options?: ShutdownOptions): () => void
```

Exécute du code de nettoyage quand on demande au processus de s'arrêter (Ctrl+C, `docker stop`, `kill`) : fermer les serveurs, vider les logs, déconnecter les bases de données. Les gestionnaires s'exécutent dans l'ordre inverse, puis le processus se termine. S'ils prennent plus de temps que `timeout`, l'arrêt est forcé ; un second Ctrl+C quitte immédiatement.

| Paramètre | Type | Description |
| --- | --- | --- |
| `handler` | `(reason: `[`ShutdownReason`](#shutdownreason)`) => unknown` | Peut être asynchrone. Reçoit le signal qui a arrêté le processus. |
| `options?` | [`ShutdownOptions`](#shutdownoptions) |  |

**Renvoie** `() => void` : Retire le gestionnaire.

```js
const server = app.listen(3000);
sys.onShutdown(() => new Promise((done) => server.close(done)));
sys.onShutdown((reason) => log.info(`Stopping (${reason})`));
```

## shutdown

```ts
shutdown(exitCode?: number): Promise<void>
```

Arrête le processus proprement : exécute les gestionnaires de `onShutdown()`, puis quitte. Utilisez-la à la place de `process.exit()` quand quelque chose échoue pour de bon, afin que les serveurs et les bases de données soient tout de même fermés.

| Paramètre | Type | Description |
| --- | --- | --- |
| `exitCode?` | `number` | Par défaut : le `exitCode` donné à `onShutdown()`, ou `0`. Un gestionnaire qui échoue le fait passer à `1`. |

**Renvoie** `Promise``<void>` : Ne se résout jamais : le processus se termine avant.

```js
process.on("uncaughtException", (error) => {
  log.fatal(error);
  sys.shutdown(1);
});
```

## freePort

```ts
freePort(preferred?: number, host?: string): Promise<number>
```

Trouve un port TCP sur lequel personne n'écoute. Donnez un port préféré pour l'obtenir quand il est libre, et un autre quand il est pris.

| Paramètre | Type | Description |
| --- | --- | --- |
| `preferred?` | `number` | Essayé en premier. |
| `host?` | `string` | L'adresse à vérifier. Par défaut : toutes. |

```js
const port = await sys.freePort(3000); // 3000, or a free one if 3000 is in use
app.listen(port);
```

## localIP

```ts
localIP(family?: 4 | 6): string | undefined
```

L'adresse de cette machine sur le réseau local, comme `"192.168.1.20"`. C'est ce que vous affichez à côté de `localhost` pour qu'un téléphone sur le même Wi-Fi puisse atteindre un serveur de développement.

| Paramètre | Type | Description |
| --- | --- | --- |
| `family?` | `4 \| 6` | IPv4 ou IPv6. Par défaut : `4`. |

**Renvoie** `string | undefined` : `undefined` quand la machine n'a pas de réseau.

```js
console.log(`http://${sys.localIP() ?? "localhost"}:3000`);
```

## isWindows

```ts
isWindows(): boolean
```

Sommes-nous sous Windows ?

## isMac

```ts
isMac(): boolean
```

Sommes-nous sous macOS ?

## isLinux

```ts
isLinux(): boolean
```

Sommes-nous sous Linux ? WSL compte.

## isCI

```ts
isCI(): boolean
```

Sommes-nous en CI ? Détecte GitHub Actions, GitLab, CircleCI, Jenkins, Azure, Vercel, Netlify et d'autres.

```js
if (sys.isCI()) nc.setLevel("warn");
```

## isDocker

```ts
isDocker(): boolean
```

Sommes-nous dans un conteneur ?

## isWSL

```ts
isWSL(): boolean
```

Sommes-nous dans WSL ?

## info

```ts
info(): SystemInfo
```

Des informations sur la machine et l'environnement d'exécution, pratiques pour les rapports de bug.

```js
console.table(sys.info());
```

## memory

```ts
memory(): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number; }
```

La mémoire utilisée par ce processus, en octets.

```js
nc.num.formatBytes(sys.memory().heapUsed); // "42.1 MB"
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { RunOptions } from "@ix-xs/node-comfort"`.

### RunOptions

Options de `run()` et `exec()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `cwd?` | `string` | Où lancer la commande. |
| `env?` | `Record``<string, string \| undefined>` | Variables d'environnement supplémentaires, ajoutées à `process.env`. `undefined` en retire une. |
| `extendEnv?` | `boolean` | Mettez `false` pour ne passer que `env`, sans `process.env`. |
| `input?` | `string \| ``Buffer``<``ArrayBufferLike``>` | Écrit sur le stdin de la commande. |
| `timeout?` | `string \| number` | Tue la commande après cette durée, comme `"30s"`. Sous Windows, ce qu'elle a lancé est arrêté avec elle. |
| `signal?` | `AbortSignal` | Tue la commande quand il est interrompu. Sous Windows, ce qu'elle a lancé est arrêté avec elle. |
| `stdio?` | `"pipe" \| "inherit"` | `"inherit"` affiche la sortie en direct au lieu de la capturer. Par défaut : `"pipe"`. |
| `onStdout?` | `((line: string) => void)` | Appelé pour chaque ligne de stdout. |
| `onStderr?` | `((line: string) => void)` | Appelé pour chaque ligne de stderr. |
| `reject?` | `boolean` | Rejette quand le code de sortie n'est pas 0. Par défaut : `true`. |
| `trim?` | `boolean` | Retire le saut de ligne final de la sortie. Par défaut : `true`. |

### RunResult

Une commande terminée.

| Propriété | Type | Description |
| --- | --- | --- |
| `command` | `string` | La ligne de commande qui a été exécutée. |
| `stdout` | `string` |  |
| `stderr` | `string` |  |
| `exitCode` | `number \| null` | `null` si un signal l'a tuée. |
| `signal` | `string \| null` |  |
| `duration` | `number` | En millisecondes. |

### ShutdownOptions

Options de `onShutdown()`. Elles s'appliquent à tous les gestionnaires.

| Propriété | Type | Description |
| --- | --- | --- |
| `timeout?` | `string \| number` | Le temps accordé aux gestionnaires avant que l'arrêt soit forcé. Par défaut : 10 secondes. |
| `exitCode?` | `number` | Code de sortie après un arrêt propre. Par défaut : `0`. |
| `signals?` | `Signals``[]` | Signaux qui le déclenchent. Par défaut : `SIGINT`, `SIGTERM` et `SIGHUP`. |

### ShutdownReason

Pourquoi le processus s'arrête : le signal qu'il a reçu, ou `"shutdown"` quand `sys.shutdown()` a été appelée.

```ts
type ShutdownReason = NodeJS.Signals | "shutdown"
```

### SystemInfo

Renvoyé par `info()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `platform` | `Platform` | `"win32"`, `"darwin"`, `"linux"`... |
| `arch` | `string` | `"x64"`, `"arm64"`... |
| `release` | `string` | Version du système d'exploitation. |
| `node` | `string` | Version de Node.js. |
| `cpus` | `number` | Nombre de processeurs logiques. |
| `cpuModel` | `string` |  |
| `memory` | `{ total: number; free: number; used: number; }` | Mémoire du système, en octets. |
| `uptime` | `number` | En secondes. |
| `hostname` | `string` |  |
| `user` | `string` |  |
| `pid` | `number` |  |
| `ci` | `boolean` | Exécution en CI. |
| `docker` | `boolean` | Exécution dans un conteneur. |
| `wsl` | `boolean` | Exécution dans WSL. |
