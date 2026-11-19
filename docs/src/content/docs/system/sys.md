---
title: "Processes and system"
description: "`nc.sys`: run commands, open URLs and files, find free ports, shut down cleanly, survive uncaught errors, and read what the machine is."
---

```js
const { sys, logger, num } = require("@ix-xs/node-comfort");
```

## Running commands

`run` starts a program without a shell: arguments are passed as they are, so input cannot inject anything. `exec` goes through the shell, for pipes and `&&`: never build its command from untrusted input.

```js
const { stdout } = await sys.run("git", ["log", "-1", "--format=%s"]);
await sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" });
await sys.run("ffmpeg", ["-i", input, output], { timeout: "5m", onStderr: (line) => logger.debug(line) });

const { stdout: count } = await sys.exec("git status --short | wc -l");
```

Both resolve with `{ command, stdout, stderr, exitCode, signal, duration }`. A non-zero exit code rejects with a `ProcessError` (code `ERR_PROCESS`) that carries the output, unless `reject: false`.

| Option | Default | |
| --- | --- | --- |
| `cwd` | `process.cwd()` | A relative command like `"./bin/tool"` is looked up from it |
| `env` | | Added to `process.env`; `undefined` removes a variable |
| `extendEnv` | `true` | `false` passes `env` alone, or an empty environment |
| `input` | | Written to stdin |
| `stdio` | `"pipe"` | `"inherit"` shows the output live |
| `onStdout`, `onStderr` | | Called for each line |
| `timeout` | none | `"30s"` or milliseconds. `false` or `Infinity` for no limit |
| `signal` | | Kills the command when aborted |
| `reject` | `true` | Reject on a non-zero exit code |
| `trim` | `true` | Drop the final newline |

On Windows, `run("npm", ...)` finds `npm.cmd` and escapes the arguments for `cmd.exe`, twice where a `.cmd` passes them on. A timeout or an abort stops the whole process tree there. An argument that cannot be escaped (a line break, or a quote for a batch file that does not use `%*`) rejects with a `ProcessError` before anything runs.

```js
try {
  await sys.run("npm", ["run", "build"], { timeout: "2m", signal: controller.signal });
} catch (error) {
  if (error.code === "ETIMEDOUT") console.error("The build took more than 2 minutes");
  else if (error.name === "AbortError") console.error("Build cancelled");
  else throw error;
}
```

| Failure | Error |
| --- | --- |
| Non-zero exit code | `ProcessError`, code `ERR_PROCESS`, with `exitCode`, `stdout`, `stderr` |
| `timeout` reached | `ProcessError`, code `ETIMEDOUT`, `timedOut: true` |
| `signal` aborted | `AbortError`, code `ABORT_ERR` |
| A timeout that cannot be read, like `"soon"` | `TypeError`, before anything starts |

The other timeouts of the library throw a `TimeoutError`, whose code is also `ETIMEDOUT`: `error.code === "ETIMEDOUT"` covers both.

## Finding and opening

```js
sys.which("node");                 // "C:\\Program Files\\nodejs\\node.exe", or undefined
sys.which("./node_modules/.bin/eslint", { cwd: "./app" });
sys.open("http://localhost:3000"); // the default browser
sys.open("./report.html");
sys.open("vscode://file/C:/app/index.js", { protocols: ["vscode:"] });
```

`which` caches what it finds. A path is looked up from `cwd`, a name from `PATH`.

`open` starts a program, as a double click would. A relative path is read from the working directory: pass `nc.fs.resolve("./report.html")` to read it from the calling file. Do not pass a path or a URL you did not choose.

| `open` gets | Result |
| --- | --- |
| An `http:`, `https:` or `mailto:` URL | Opened |
| Another scheme (`file:`, `search-ms:`, schemes of other apps) | `TypeError`, unless listed in `protocols` |
| A path that exists | Opened |
| A path that does not exist | `NodeComfortError`, code `ERR_NOT_FOUND` |
| A Windows network path (`\\server\share`) | `TypeError`, unless `allowUNC: true` |

## Ports and addresses

```js
const port = await sys.freePort(3000); // 3000, or another free port
app.listen(port);
console.log(`Network: http://${sys.localIP() ?? "localhost"}:${port}`);
```

| Function | Returns |
| --- | --- |
| `freePort(preferred?, host?)` | The preferred port when free, another one otherwise |
| `localIP(family = 4)` | The address on the local network, like `"192.168.1.20"`, or `undefined`. `localIP(6)` for IPv6 |

## Shutting down

`onShutdown` runs cleanup code when the process is asked to stop: Ctrl+C, `docker stop`, `kill`.

```js
const server = app.listen(3000);

sys.onShutdown(() => new Promise((done) => server.close(done)));
sys.onShutdown(() => db.close());
sys.onShutdown((reason) => logger.info(`Stopping (${reason})`));
```

Handlers run in reverse order, then the process exits. Each one gets the reason: the signal, or `"shutdown"`. A second Ctrl+C exits at once. A handler that throws does not stop the others: its error is printed and the exit code becomes `1`. `onShutdown` returns a function that removes the handler, also usable with `using` ([Resources](/basics/resources/)).

| Option | Default | |
| --- | --- | --- |
| `timeout` | `"10s"` | Then the exit is forced |
| `exitCode` | `0` | After a clean shutdown |
| `signals` | `SIGINT`, `SIGTERM`, `SIGHUP` (and `SIGBREAK` on Windows) | |

To stop from your code, call `shutdown(code)` rather than `process.exit()`, which skips the handlers:

```js
process.on("uncaughtException", (error) => {
  logger.fatal(error);
  sys.shutdown(1);
});
```

## Surviving uncaught errors

`dontCrash` logs uncaught exceptions and unhandled rejections instead of crashing, and logs `SIGINT`, `SIGTERM` and `SIGQUIT` before a clean exit. `.on()` replaces a handler:

```js
sys.dontCrash()
  .on("error", (error) => sentry.captureException(error))
  .on("sig", async () => {
    await server.close();
    process.exit(0);
  });
```

| Event | Handler gets | Default |
| --- | --- | --- |
| `"error"` | The error | Logged |
| `"sig"` | The signal | Logged, then exit 0 |
| `"exit"` | The exit code | Logged |
| `"beforeExit"` | The exit code | Nothing |

It only removes its own handlers. `dispose()` removes everything it installed, as does the end of the block with `using`. `.on(event)` without a handler restores the default.

## The machine

```js
sys.isWindows(); sys.isMac(); sys.isLinux();
sys.isCI();                                  // GitHub Actions, GitLab, CircleCI, Jenkins, Vercel, Netlify...
console.table(sys.info());
num.formatBytes(sys.memory().heapUsed);      // "6 MB"
```

| Function | Returns |
| --- | --- |
| `isWindows`, `isMac`, `isLinux` | The platform |
| `isCI`, `isDocker`, `isWSL` | Where it runs |
| `info()` | `platform`, `arch`, `release`, `node`, `cpus`, `cpuModel`, `memory`, `uptime`, `hostname`, `user`, `pid`, `ci`, `docker`, `wsl` |
| `memory()` | `rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers`, in bytes |

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.dontCrash()` | `nc.sys.dontCrash()` |
| `nc.utils.dontCrash()` | `nc.sys.dontCrash()` |
