---
title: "Processus et système"
description: "`nc.sys` exécute des commandes, arrête proprement votre application et vous renseigne sur la machine."
sidebar:
  order: 5
---

```js
const { stdout } = await nc.sys.run("git", ["rev-parse", "HEAD"]);
```

## Exécuter des commandes

`run` lance un programme **sans shell**. Les arguments sont passés tels quels, donc une saisie utilisateur ne peut rien injecter :

```js
const { stdout } = await nc.sys.run("git", ["log", "-1", "--format=%s"]);
await nc.sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" }); // sortie affichée en direct
await nc.sys.run("ffmpeg", ["-i", input, output], { timeout: "5m", onStderr: (line) => nc.debug(line) });
```

Sous Windows, `run("npm", ...)` trouve `npm.cmd` et échappe correctement les arguments, ce que le `spawn` de Node ne fait pas tout seul. Un fichier `.cmd` ou `.bat` passe par `cmd.exe`, qui lit `%`, `&` ou `^` dans un argument comme une partie de commande, et les relit dans chaque `.cmd` auquel les arguments sont transmis (comme les raccourcis des paquets npm globaux). Les arguments sont donc échappés deux fois, et une valeur comme `"&calc"` reste une valeur. Certaines choses ne peuvent pas être échappées pour `cmd.exe` : un saut de ligne dans un argument, ou un guillemet donné à un fichier batch qui ne transmet pas ses arguments avec `%*`, entraîne un rejet avec une `ProcessError` avant que rien ne s'exécute.

Une commande relative, comme `"./bin/tool"`, est cherchée depuis `cwd`, et non depuis le dossier où votre programme a démarré.

`exec` passe par le shell, pour les pipes et `&&`. Ne construisez jamais sa commande à partir d'une saisie non fiable.

```js
const { stdout } = await nc.sys.exec("git status --short | wc -l");
```

Les deux se résolvent avec `{ stdout, stderr, exitCode, signal, duration, command }`. Un code de sortie non nul entraîne un rejet avec une `ProcessError` qui porte la sortie ; passez `reject: false` pour recevoir le résultat à la place.

```js
const { exitCode } = await nc.sys.exec("npm test", { reject: false, stdio: "inherit" });
```

Un `timeout` ou un `signal` interrompu tue la commande. Sous Windows, tout l'arbre de processus est arrêté : ce que la commande a lancé ne continue donc pas à tourner derrière elle. L'erreur permet de distinguer les deux cas :

```js
try {
  await nc.sys.run("npm", ["run", "build"], { timeout: "2m", signal: controller.signal });
} catch (error) {
  if (error.timedOut) console.error("The build took more than 2 minutes"); // une ProcessError
  else if (error.name === "AbortError") console.error("Build cancelled");
  else throw error;
}
```

Un timeout illisible, comme `"soon"`, entraîne un rejet avec une `TypeError` avant que quoi que ce soit ne démarre : une faute de frappe ne lance donc jamais une commande sans limite.

Autres options : `env` (ajouté à `process.env`, ou utilisé seul avec `extendEnv: false` : la commande ne reçoit alors rien d'autre, et un environnement vide sans `env`), `input` (écrit sur stdin), `onStdout` et `onStderr` (appelés pour chaque ligne) et `trim`. La [référence](/reference/sys/) en donne la liste complète.

## Trouver et ouvrir

```js
nc.sys.which("docker");               // "/usr/bin/docker", ou undefined
nc.sys.open("http://localhost:3000"); // navigateur par défaut
nc.sys.open("./report.html");
```

`which` retient ce qu'il a trouvé : vous pouvez donc l'appeler aussi souvent que vous voulez. Un chemin, comme `"./bin/tool"`, est cherché depuis `cwd` au lieu de `PATH` :

```js
nc.sys.which("./node_modules/.bin/eslint", { cwd: "./app" });
```

`open` lance un programme, comme le ferait un double clic : par défaut, il n'ouvre donc que ce qui est sans danger, à savoir les URL `http:`, `https:` et `mailto:`, et les chemins qui existent. Les autres schémas (`file:`, `search-ms:` et ceux que les autres applications enregistrent) peuvent lancer des programmes : ils lèvent donc une `TypeError`, sauf si vous les listez dans `protocols`. Un chemin qui n'existe pas lève une `Error`. Sous Windows, un chemin réseau comme `\\server\share\file` est refusé sauf si vous passez `allowUNC: true`, car le simple fait de le consulter peut envoyer vos identifiants Windows à ce serveur.

```js
nc.sys.open("vscode://file/C:/app/index.js", { protocols: ["vscode:"] });
```

Ne passez pas à `open` un chemin ou une URL que vous n'avez pas choisi.

## Ports et adresses

```js
const port = await nc.sys.freePort(3000); // 3000, ou un autre port libre si 3000 est pris
const server = app.listen(port);

console.log(`Local:   http://localhost:${port}`);
console.log(`Network: http://${nc.sys.localIP() ?? "localhost"}:${port}`);
```

`freePort()` sans argument donne n'importe quel port libre, ce qu'il faut aux tests. `localIP()` est l'adresse de la machine sur le réseau local, comme `"192.168.1.20"` : celle qu'un téléphone connecté au même Wi-Fi peut joindre. Elle renvoie `undefined` quand la machine n'a pas de réseau, et `localIP(6)` donne l'adresse IPv6.

## Arrêt propre

`onShutdown` exécute du code de nettoyage quand on demande au processus de s'arrêter : Ctrl+C, `docker stop`, `kill`, un redémarrage de la plateforme.

```js
const server = app.listen(3000);

nc.sys.onShutdown(() => new Promise((done) => server.close(done)));
nc.sys.onShutdown(() => db.close());
nc.sys.onShutdown((reason) => nc.info(`Stopping (${reason})`));
```

Les gestionnaires s'exécutent dans l'ordre inverse (le dernier enregistré passe en premier), puis le processus se termine. Chacun reçoit la raison : le signal, comme `"SIGINT"` ou `"SIGTERM"`, ou `"shutdown"` quand vous l'avez demandé vous-même. S'ils prennent plus de 10 secondes (à changer avec `{ timeout: "30s" }`), la sortie est forcée. Un second Ctrl+C quitte immédiatement. `onShutdown` renvoie une fonction qui retire le gestionnaire. Avec Node.js 24 ou plus récent, déclarez-la avec `using` pour retirer le gestionnaire à la fin d'un bloc ([en savoir plus sur `using`](/recipes/#cleaning-up-with-using)).

Pour arrêter de vous-même, appelez `shutdown` plutôt que `process.exit()`, qui sauterait les gestionnaires :

```js
process.on("uncaughtException", (error) => {
  nc.fatal(error);
  nc.sys.shutdown(1);
});
```

`shutdown(code)` exécute les gestionnaires, puis quitte avec ce code. Sans code, il utilise l'option `exitCode` de `onShutdown`, qui vaut `0` par défaut. Un gestionnaire qui lève une erreur n'arrête pas les autres : son erreur est affichée et le code de sortie devient `1`.

## À propos de la machine

```js
nc.sys.isWindows(); nc.sys.isMac(); nc.sys.isLinux();
nc.sys.isCI();      // GitHub Actions, GitLab, CircleCI, Jenkins, Vercel, Netlify...
nc.sys.isDocker();
nc.sys.isWSL();
console.table(nc.sys.info());                 // plateforme, CPU, mémoire, durée de fonctionnement...
nc.num.formatBytes(nc.sys.memory().heapUsed); // "42.1 MB"
```
