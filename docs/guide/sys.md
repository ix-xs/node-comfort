# Processes and system

`nc.sys` runs commands, shuts your app down cleanly, and tells you about the machine.

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

Other options: `env` (added to `process.env`), `input` (written to stdin), `signal` and `trim`.

## Finding and opening things

```js
nc.sys.which("docker");               // "/usr/bin/docker", or undefined
nc.sys.open("http://localhost:3000"); // default browser
nc.sys.open("./report.html");
```

## Graceful shutdown

`onShutdown` runs cleanup code when the process is asked to stop: Ctrl+C, `docker stop`, `kill`, a platform restart.

```js
const server = app.listen(3000);

nc.sys.onShutdown(() => new Promise((done) => server.close(done)));
nc.sys.onShutdown(() => db.close());
```

Handlers run in reverse order (the last one registered runs first), then the process exits. If they take longer than 10 seconds (change it with `{ timeout: "30s" }`), the exit is forced. Pressing Ctrl+C a second time exits right away. `onShutdown` returns a function that removes the handler.

## About the machine

```js
nc.sys.isWindows(); nc.sys.isMac(); nc.sys.isLinux();
nc.sys.isCI();      // GitHub Actions, GitLab, CircleCI, Jenkins, Vercel, Netlify...
nc.sys.isDocker();
nc.sys.isWSL();
console.table(nc.sys.info());                 // platform, CPU, memory, uptime...
nc.num.formatBytes(nc.sys.memory().heapUsed); // "42.1 MB"
```
