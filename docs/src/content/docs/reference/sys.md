---
title: "nc.sys"
description: "Processes and the system: run commands and get their output, find executables, shut down cleanly, open URLs, and learn about the machine. Behaves the same on Windows, macOS and Linux; on Windows, `run(\"npm\", [...])` finds `npm.cmd` and escapes arguments safely."
sidebar:
  label: "sys"
  order: 22
---

```js
const { sys } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const sys = require("@ix-xs/node-comfort/sys");
```

This page lists everything `nc.sys` has, as your editor shows it. For explanations and longer examples, read [the guide](/system/sys/).

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

Runs a program without a shell, so arguments are passed as they are and
user input can't inject anything. Resolves with the output; rejects with
a `ProcessError` if the exit code isn't 0.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | `string` | A name found in `PATH`, or a path. |
| `args?` | `string[]` | Defaults to `[]`. |
| `options?` | [`RunOptions`](#runoptions) |  |

**Throws** `ProcessError`: If it can't start, fails (unless `reject: false`) or times out.

```js
const { stdout } = await sys.run("git", ["log", "-1", "--format=%s"]);
await sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" });
await sys.run("ffmpeg", ["-i", input, output], { timeout: "5m" });
```

## exec

```ts
exec(command: string, options?: RunOptions): Promise<RunResult>
```

Runs a command line through the shell, so pipes, `&&` and variables
work. Don't build it from untrusted input; use `run()` for that.

**Throws** `ProcessError`: If it fails (unless `reject: false`) or times out.

```js
const { stdout } = await sys.exec("git status --short | wc -l");
const { exitCode } = await sys.exec("npm test", { reject: false, stdio: "inherit" });
```

## which

```ts
which(command: string): string | undefined
```

Finds an executable in `PATH`, like the `which` command.

```js
sys.which("git");  // "/usr/bin/git"
sys.which("nope"); // undefined
```

## open

```ts
open(target: string): boolean
```

Opens a URL, file or folder with the default app.

**Returns** `boolean`: `true` if the opener started.

```js
sys.open("http://localhost:3000");
```

## onShutdown

```ts
onShutdown(handler: (reason: ShutdownReason) => unknown, options?: ShutdownOptions): () => void
```

Runs cleanup code when the process is asked to stop (Ctrl+C,
`docker stop`, `kill`): close servers, flush logs, disconnect databases.
Handlers run in reverse order, then the process exits. If they take
longer than `timeout`, the exit is forced; a second Ctrl+C exits at once.

| Parameter | Type | Description |
| --- | --- | --- |
| `handler` | `(reason: `[`ShutdownReason`](#shutdownreason)`) => unknown` | Can be async. Gets the signal that stopped the process. |
| `options?` | [`ShutdownOptions`](#shutdownoptions) |  |

**Returns** `() => void`: Removes the handler.

```js
const server = app.listen(3000);
sys.onShutdown(() => new Promise((done) => server.close(done)));
sys.onShutdown((reason) => log.info(`Stopping (${reason})`));
```

## shutdown

```ts
shutdown(exitCode?: number): Promise<void>
```

Stops the process the clean way: runs the `onShutdown()` handlers, then
exits. Use it instead of `process.exit()` when something goes wrong for
good, so servers and databases still get closed.

| Parameter | Type | Description |
| --- | --- | --- |
| `exitCode?` | `number` | Defaults to the `exitCode` given to `onShutdown()`, or `0`. A failing handler makes it `1`. |

**Returns** `Promise``<void>`: Never resolves: the process exits first.

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

Finds a TCP port nobody is listening on. Give a preferred port to get it
back when it's free, and another one when it's taken.

| Parameter | Type | Description |
| --- | --- | --- |
| `preferred?` | `number` | Tried first. |
| `host?` | `string` | The address to check. Defaults to all of them. |

```js
const port = await sys.freePort(3000); // 3000, or a free one if 3000 is in use
app.listen(port);
```

## localIP

```ts
localIP(family?: 4 | 6): string | undefined
```

The address of this machine on the local network, like `"192.168.1.20"`.
It's what you print next to `localhost` so a phone on the same Wi-Fi can
reach a dev server.

| Parameter | Type | Description |
| --- | --- | --- |
| `family?` | `4 \| 6` | IPv4 or IPv6. Defaults to `4`. |

**Returns** `string | undefined`: `undefined` when the machine has no network.

```js
console.log(`http://${sys.localIP() ?? "localhost"}:3000`);
```

## isWindows

```ts
isWindows(): boolean
```

Are we on Windows?

## isMac

```ts
isMac(): boolean
```

Are we on macOS?

## isLinux

```ts
isLinux(): boolean
```

Are we on Linux? WSL counts.

## isCI

```ts
isCI(): boolean
```

Are we running in CI? Detects GitHub Actions, GitLab, CircleCI, Jenkins,
Azure, Vercel, Netlify and more.

```js
if (sys.isCI()) nc.setLevel("warn");
```

## isDocker

```ts
isDocker(): boolean
```

Are we running inside a container?

## isWSL

```ts
isWSL(): boolean
```

Are we running in WSL?

## info

```ts
info(): SystemInfo
```

Facts about the machine and the runtime, handy for bug reports.

```js
console.table(sys.info());
```

## memory

```ts
memory(): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number; }
```

Memory used by this process, in bytes.

```js
nc.num.formatBytes(sys.memory().heapUsed); // "42.1 MB"
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { RunOptions } from "@ix-xs/node-comfort"`.

### RunOptions

Options for `run()` and `exec()`.

| Property | Type | Description |
| --- | --- | --- |
| `cwd?` | `string` | Where to run the command. |
| `env?` | `Record``<string, string \| undefined>` | Extra environment variables, added to `process.env`. `undefined` removes one. |
| `extendEnv?` | `boolean` | Set to `false` to pass only `env`, without `process.env`. |
| `input?` | `string \| ``Buffer``<``ArrayBufferLike``>` | Written to the command's stdin. |
| `timeout?` | `string \| number` | Kill the command after this long, like `"30s"`. On Windows, what it started is stopped with it. |
| `signal?` | `AbortSignal` | Kills the command when aborted. On Windows, what it started is stopped with it. |
| `stdio?` | `"pipe" \| "inherit"` | `"inherit"` shows the output live instead of capturing it. Defaults to `"pipe"`. |
| `onStdout?` | `((line: string) => void)` | Called for each line of stdout. |
| `onStderr?` | `((line: string) => void)` | Called for each line of stderr. |
| `reject?` | `boolean` | Throw when the exit code isn't 0. Defaults to `true`. |
| `trim?` | `boolean` | Drop the final newline of the output. Defaults to `true`. |

### RunResult

A finished command.

| Property | Type | Description |
| --- | --- | --- |
| `command` | `string` | The command line that ran. |
| `stdout` | `string` |  |
| `stderr` | `string` |  |
| `exitCode` | `number \| null` | `null` if a signal killed it. |
| `signal` | `string \| null` |  |
| `duration` | `number` | In milliseconds. |

### ShutdownOptions

Options for `onShutdown()`. They apply to all handlers.

| Property | Type | Description |
| --- | --- | --- |
| `timeout?` | `string \| number` | How long the handlers get before the exit is forced. Defaults to 10 seconds. |
| `exitCode?` | `number` | Exit code after a clean shutdown. Defaults to `0`. |
| `signals?` | `Signals``[]` | Signals that trigger it. Defaults to `SIGINT`, `SIGTERM` and `SIGHUP`. |

### ShutdownReason

Why the process is stopping: the signal it got, or `"shutdown"` when
`sys.shutdown()` was called.

```ts
type ShutdownReason = NodeJS.Signals | "shutdown"
```

### SystemInfo

Returned by `info()`.

| Property | Type | Description |
| --- | --- | --- |
| `platform` | `Platform` | `"win32"`, `"darwin"`, `"linux"`... |
| `arch` | `string` | `"x64"`, `"arm64"`... |
| `release` | `string` | OS release. |
| `node` | `string` | Node.js version. |
| `cpus` | `number` | Number of logical CPUs. |
| `cpuModel` | `string` |  |
| `memory` | `{ total: number; free: number; used: number; }` | System memory, in bytes. |
| `uptime` | `number` | In seconds. |
| `hostname` | `string` |  |
| `user` | `string` |  |
| `pid` | `number` |  |
| `ci` | `boolean` | Running in CI. |
| `docker` | `boolean` | Running in a container. |
| `wsl` | `boolean` | Running in WSL. |
