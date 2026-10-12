---
title: "Processes and system"
description: "`nc.sys` runs commands, shuts your app down cleanly, and tells you about the machine."
sidebar:
  order: 5
---

```js
const { stdout } = await nc.sys.run("git", ["rev-parse", "HEAD"]);
```

## Running commands

`run` starts a program **without a shell**. Arguments are passed as they are, so user input can't inject anything:

```js
const { stdout } = await nc.sys.run("git", ["log", "-1", "--format=%s"]);
await nc.sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" }); // output shown live
await nc.sys.run("ffmpeg", ["-i", input, output], { timeout: "5m", onStderr: (line) => nc.debug(line) });
```

On Windows, `run("npm", ...)` finds `npm.cmd` and escapes arguments correctly, which Node's `spawn` doesn't do on its own.

`exec` goes through the shell, for pipes and `&&`. Never build its command from untrusted input.

```js
const { stdout } = await nc.sys.exec("git status --short | wc -l");
```

Both resolve with `{ stdout, stderr, exitCode, signal, duration, command }`. A non-zero exit code rejects with a `ProcessError` that carries the output; pass `reject: false` to get the result instead.

```js
const { exitCode } = await nc.sys.exec("npm test", { reject: false, stdio: "inherit" });
```

A `timeout` or an aborted `signal` kills the command. On Windows, the whole process tree is stopped, so what the command started doesn't keep running behind it. Tell the two apart by the error:

```js
try {
  await nc.sys.run("npm", ["run", "build"], { timeout: "2m", signal: controller.signal });
} catch (error) {
  if (error.timedOut) console.error("The build took more than 2 minutes"); // a ProcessError
  else if (error.name === "AbortError") console.error("Build cancelled");
  else throw error;
}
```

A timeout that can't be read, like `"soon"`, rejects with a `TypeError` before anything starts, so a typo never runs a command without a limit.

Other options: `env` (added to `process.env`), `input` (written to stdin), `onStdout` and `onStderr` (called for each line) and `trim`. The [reference](/reference/sys/) has the full list.

## Finding and opening things

```js
nc.sys.which("docker");               // "/usr/bin/docker", or undefined
nc.sys.open("http://localhost:3000"); // default browser
nc.sys.open("./report.html");
```

`which` remembers what it found, so you can call it as often as you like.

## Ports and addresses

```js
const port = await nc.sys.freePort(3000); // 3000, or another free port if 3000 is taken
const server = app.listen(port);

console.log(`Local:   http://localhost:${port}`);
console.log(`Network: http://${nc.sys.localIP() ?? "localhost"}:${port}`);
```

`freePort()` with no argument gives any free port, which is what tests want. `localIP()` is the address of the machine on the local network, like `"192.168.1.20"`: the one a phone on the same Wi-Fi can reach. It returns `undefined` when the machine has no network, and `localIP(6)` gives the IPv6 address.

## Graceful shutdown

`onShutdown` runs cleanup code when the process is asked to stop: Ctrl+C, `docker stop`, `kill`, a platform restart.

```js
const server = app.listen(3000);

nc.sys.onShutdown(() => new Promise((done) => server.close(done)));
nc.sys.onShutdown(() => db.close());
nc.sys.onShutdown((reason) => nc.info(`Stopping (${reason})`));
```

Handlers run in reverse order (the last one registered runs first), then the process exits. Each one gets the reason: the signal, like `"SIGINT"` or `"SIGTERM"`, or `"shutdown"` when you asked for it yourself. If they take longer than 10 seconds (change it with `{ timeout: "30s" }`), the exit is forced. Pressing Ctrl+C a second time exits right away. `onShutdown` returns a function that removes the handler.

To stop on your own, call `shutdown` instead of `process.exit()`, which would skip the handlers:

```js
process.on("uncaughtException", (error) => {
  nc.fatal(error);
  nc.sys.shutdown(1);
});
```

`shutdown(code)` runs the handlers, then exits with that code. Without one, it uses the `exitCode` option of `onShutdown`, which is `0` by default. A handler that throws doesn't stop the others: its error is printed and the exit code becomes `1`.

## About the machine

```js
nc.sys.isWindows(); nc.sys.isMac(); nc.sys.isLinux();
nc.sys.isCI();      // GitHub Actions, GitLab, CircleCI, Jenkins, Vercel, Netlify...
nc.sys.isDocker();
nc.sys.isWSL();
console.table(nc.sys.info());                 // platform, CPU, memory, uptime...
nc.num.formatBytes(nc.sys.memory().heapUsed); // "42.1 MB"
```
