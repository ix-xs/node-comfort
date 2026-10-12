"use strict";

/**
 * Processes and the system: run commands and get their output, find
 * executables, shut down cleanly, open URLs, and learn about the machine.
 * Behaves the same on Windows, macOS and Linux; on Windows,
 * `run("npm", [...])` finds `npm.cmd` and escapes arguments safely.
 *
 * @example
 * const { stdout } = await sys.run("git", ["rev-parse", "HEAD"]);
 * sys.onShutdown(async () => {
 *   await server.close();
 *   await db.close();
 * });
 */

const fs = require("node:fs");
const os = require("node:os");
const nodePath = require("node:path");
const { ProcessError, AbortError } = require("./errors.js");
const { toMs } = require("./internal/shared.js");

// Loaded on first use: most programs never start another one.
/** @type {typeof import("node:child_process") | undefined} */
let _childProcess;
const _cp = () => (_childProcess ??= require("node:child_process"));

/**
 * Options for `run()` and `exec()`.
 * @typedef {object} RunOptions
 * @property {string} [cwd] Where to run the command.
 * @property {Record<string, string | undefined>} [env] Extra environment variables, added to `process.env`. `undefined` removes one.
 * @property {boolean} [extendEnv] Set to `false` to pass only `env`, without `process.env`.
 * @property {string | Buffer} [input] Written to the command's stdin.
 * @property {number | string} [timeout] Kill the command after this long, like `"30s"`. On Windows, what it started is stopped with it.
 * @property {AbortSignal} [signal] Kills the command when aborted. On Windows, what it started is stopped with it.
 * @property {"pipe" | "inherit"} [stdio] `"inherit"` shows the output live instead of capturing it. Defaults to `"pipe"`.
 * @property {(line: string) => void} [onStdout] Called for each line of stdout.
 * @property {(line: string) => void} [onStderr] Called for each line of stderr.
 * @property {boolean} [reject] Throw when the exit code isn't 0. Defaults to `true`.
 * @property {boolean} [trim] Drop the final newline of the output. Defaults to `true`.
 */

/**
 * A finished command.
 * @typedef {object} RunResult
 * @property {string} command The command line that ran.
 * @property {string} stdout
 * @property {string} stderr
 * @property {number | null} exitCode `null` if a signal killed it.
 * @property {string | null} signal
 * @property {number} duration In milliseconds.
 */

/**
 * Options for `onShutdown()`. They apply to all handlers.
 * @typedef {object} ShutdownOptions
 * @property {number | string} [timeout] How long the handlers get before the exit is forced. Defaults to 10 seconds.
 * @property {number} [exitCode] Exit code after a clean shutdown. Defaults to `0`.
 * @property {NodeJS.Signals[]} [signals] Signals that trigger it. Defaults to `SIGINT`, `SIGTERM` and `SIGHUP`.
 */

/**
 * Why the process is stopping: the signal it got, or `"shutdown"` when
 * `sys.shutdown()` was called.
 * @typedef {NodeJS.Signals | "shutdown"} ShutdownReason
 */

/**
 * Returned by `info()`.
 * @typedef {object} SystemInfo
 * @property {NodeJS.Platform} platform `"win32"`, `"darwin"`, `"linux"`...
 * @property {string} arch `"x64"`, `"arm64"`...
 * @property {string} release OS release.
 * @property {string} node Node.js version.
 * @property {number} cpus Number of logical CPUs.
 * @property {string} cpuModel
 * @property {{ total: number, free: number, used: number }} memory System memory, in bytes.
 * @property {number} uptime In seconds.
 * @property {string} hostname
 * @property {string} user
 * @property {number} pid
 * @property {boolean} ci Running in CI.
 * @property {boolean} docker Running in a container.
 * @property {boolean} wsl Running in WSL.
 */

const META = /([()\][%!^"`<>&|;, *?])/g;

/** @param {string} command */
const _escapeCommand = (command) => command.replace(META, "^$1");

/**
 * Escapes an argument for cmd.exe, like `cross-spawn` does.
 * @param {string} arg
 * @param {boolean} doubleEscape
 */
const _escapeArg = (arg, doubleEscape) => {
  let out = String(arg).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, "$1$1");
  out = `"${out}"`.replace(META, "^$1");
  return doubleEscape ? out.replace(META, "^$1") : out;
};

/**
 * Handles Windows `.cmd` and `.bat` files.
 * @param {string} file
 * @param {string[]} args
 * @returns {{ file: string, args: string[], verbatim: boolean }}
 */
const _prepare = (file, args) => {
  if (process.platform !== "win32") return { file, args, verbatim: false };
  const resolved = which(file) ?? file;
  if (!/\.(cmd|bat)$/i.test(resolved)) return { file: resolved, args, verbatim: false };
  const shim = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(resolved);
  const line = [_escapeCommand(nodePath.normalize(resolved)), ...args.map((a) => _escapeArg(a, shim))].join(" ");
  return { file: process.env.comspec || "cmd.exe", args: ["/d", "/s", "/c", `"${line}"`], verbatim: true };
};

/**
 * @param {RunOptions} options
 * @returns {Record<string, string | undefined> | undefined}
 */
const _env = (options) => {
  if (options.extendEnv === false) return options.env;
  if (!options.env) return process.env;
  /** @type {Record<string, string | undefined>} */
  const merged = { ...process.env };
  if (process.platform === "win32") {
    // Windows reads PATH and Path as one variable: ours has to replace it, not sit next to it.
    const given = new Set(Object.keys(options.env).map((key) => key.toUpperCase()));
    for (const key of Object.keys(merged)) if (given.has(key.toUpperCase())) delete merged[key];
  }
  return Object.assign(merged, options.env);
};

/**
 * @param {string} file
 * @param {string[]} args
 * @param {boolean} shell
 * @param {string} display
 * @param {RunOptions} options
 * @returns {Promise<RunResult>}
 */
const _spawn = (file, args, shell, display, options) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const inherit = options.stdio === "inherit";
    const prepared = shell ? { file, args, verbatim: false } : _prepare(file, args);
    const timeoutMs = options.timeout === undefined ? undefined : toMs(options.timeout, "timeout");
    if (options.signal?.aborted) return reject(new AbortError(`Command aborted: ${display}`, { cause: options.signal.reason }));

    const child = _cp().spawn(prepared.file, prepared.args, {
      cwd: options.cwd,
      env: /** @type {NodeJS.ProcessEnv} */ (_env(options)),
      shell,
      windowsHide: true,
      windowsVerbatimArguments: prepared.verbatim,
      stdio: [options.input !== undefined ? "pipe" : inherit ? "inherit" : "ignore", inherit ? "inherit" : "pipe", inherit ? "inherit" : "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    /** @type {NodeJS.Timeout | undefined} */
    let killTimer;
    /** @type {NodeJS.Timeout | undefined} */
    let forceTimer;

    /**
     * @param {import("node:stream").Readable | null} stream
     * @param {(chunk: string) => void} append
     * @param {((line: string) => void) | undefined} onLine
     */
    const collect = (stream, append, onLine) => {
      if (!stream) return;
      stream.setEncoding("utf8");
      let pending = "";
      stream.on("data", (chunk) => {
        append(chunk);
        if (!onLine) return;
        pending += chunk;
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";
        for (const line of lines) onLine(line);
      });
      stream.on("end", () => {
        if (onLine && pending) onLine(pending);
      });
    };
    collect(child.stdout, (c) => (stdout += c), options.onStdout);
    collect(child.stderr, (c) => (stderr += c), options.onStderr);

    if (options.input !== undefined && child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(options.input);
    }

    let stopped = false;
    const kill = () => {
      stopped = true;
      if (process.platform === "win32" && child.pid !== undefined) {
        // On Windows, child.kill() ends cmd.exe and leaves what it started running.
        const killer = _cp().spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        killer.on("error", () => child.kill());
        return;
      }
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 2000);
      forceTimer.unref();
    };
    if (timeoutMs !== undefined && timeoutMs !== Infinity) {
      killTimer = setTimeout(() => {
        timedOut = true;
        kill();
      }, timeoutMs);
    }
    const onAbort = () => kill();
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", (error) => {
      clearTimeout(killTimer);
      options.signal?.removeEventListener("abort", onAbort);
      reject(new ProcessError(`Failed to start "${display}": ${error.message}`, { command: display, cause: error }));
    });
    child.on("exit", () => {
      // What the command started may outlive it and keep its output open:
      // once the command was stopped on purpose, there is nothing more to wait for.
      if (!stopped) return;
      child.stdout?.destroy();
      child.stderr?.destroy();
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(killTimer);
      clearTimeout(forceTimer);
      options.signal?.removeEventListener("abort", onAbort);
      const trim = options.trim ?? true;
      const result = {
        command: display,
        stdout: trim ? stdout.replace(/\r?\n$/, "") : stdout,
        stderr: trim ? stderr.replace(/\r?\n$/, "") : stderr,
        exitCode,
        signal,
        duration: Date.now() - started,
      };
      if (options.signal?.aborted) return reject(new AbortError(`Command aborted: ${display}`, { cause: options.signal.reason }));
      if (timedOut) return reject(new ProcessError(`Command timed out after ${timeoutMs}ms: ${display}`, { ...result, timedOut: true }));
      if ((options.reject ?? true) && exitCode !== 0) {
        const detail = result.stderr.trim().split(/\r?\n/).slice(-5).join("\n");
        return reject(new ProcessError(`Command failed with ${exitCode === null ? `signal ${signal}` : `exit code ${exitCode}`}: ${display}${detail ? `\n${detail}` : ""}`, result));
      }
      resolve(result);
    });
  });

/**
 * Runs a program without a shell, so arguments are passed as they are and
 * user input can't inject anything. Resolves with the output; rejects with
 * a `ProcessError` if the exit code isn't 0.
 *
 * @example
 * const { stdout } = await sys.run("git", ["log", "-1", "--format=%s"]);
 * await sys.run("npm", ["install"], { cwd: "./app", stdio: "inherit" });
 * await sys.run("ffmpeg", ["-i", input, output], { timeout: "5m" });
 *
 * @param {string} file A name found in `PATH`, or a path.
 * @param {string[]} [args=[]]
 * @param {RunOptions} [options]
 * @returns {Promise<RunResult>}
 * @throws {ProcessError} If it can't start, fails (unless `reject: false`) or times out.
 */
function run(file, args = [], options = {}) {
  const display = [file, ...args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a))].join(" ");
  return _spawn(file, args.map(String), false, display, options);
}

/**
 * Runs a command line through the shell, so pipes, `&&` and variables
 * work. Don't build it from untrusted input; use `run()` for that.
 *
 * @example
 * const { stdout } = await sys.exec("git status --short | wc -l");
 * const { exitCode } = await sys.exec("npm test", { reject: false, stdio: "inherit" });
 *
 * @param {string} command
 * @param {RunOptions} [options]
 * @returns {Promise<RunResult>}
 * @throws {ProcessError} If it fails (unless `reject: false`) or times out.
 */
function exec(command, options = {}) {
  return _spawn(command, [], true, command, options);
}

/** @type {Map<string, string>} */
const _found = new Map();

/** @param {string} file */
const _runnable = (file) => {
  try {
    if (!fs.statSync(file).isFile()) return false;
    if (process.platform !== "win32") fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Finds an executable in `PATH`, like the `which` command.
 *
 * @example
 * sys.which("git");  // "/usr/bin/git"
 * sys.which("nope"); // undefined
 *
 * @param {string} command
 * @returns {string | undefined}
 */
function which(command) {
  if (typeof command !== "string" || !command) return undefined;
  const isWin = process.platform === "win32";
  const searchPath = process.env.PATH ?? process.env.Path ?? "";
  const key = `${command}\0${searchPath}\0${process.cwd()}`;
  const known = _found.get(key);
  // A found program is checked again with one call, in case it was removed since.
  if (known !== undefined && _runnable(known)) return known;
  const exts = isWin ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : [""];
  const candidates = (/** @type {string} */ base) => (isWin && !nodePath.extname(base) ? exts.map((e) => base + e.toLowerCase()) : isWin ? [base, ...exts.map((e) => base + e.toLowerCase())] : [base]);
  /** @type {string | undefined} */
  let found;
  if (command.includes("/") || command.includes("\\")) {
    found = candidates(nodePath.resolve(command)).find(_runnable);
  } else {
    for (const dir of searchPath.split(nodePath.delimiter)) {
      if (!dir) continue;
      found = candidates(nodePath.join(dir.replace(/^"|"$/g, ""), command)).find(_runnable);
      if (found) break;
    }
  }
  if (found) {
    if (_found.size >= 200) _found.clear();
    _found.set(key, found);
  } else {
    _found.delete(key);
  }
  return found;
}

/**
 * Opens a URL, file or folder with the default app.
 *
 * @example
 * sys.open("http://localhost:3000");
 *
 * @param {string} target
 * @returns {boolean} `true` if the opener started.
 */
function open(target) {
  try {
    const value = /^[a-z][a-z\d+.-]*:/i.test(target) ? target : nodePath.resolve(target);
    const child =
      process.platform === "win32"
        ? _cp().spawn(process.env.comspec || "cmd.exe", ["/d", "/s", "/c", `start "" ${_escapeArg(value, false)}`], { detached: true, stdio: "ignore", windowsHide: true, windowsVerbatimArguments: true })
        : _cp().spawn(process.platform === "darwin" ? "open" : "xdg-open", [value], { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** @type {Array<(reason: ShutdownReason) => unknown>} */
const _shutdownHandlers = [];
/** @type {Set<string>} */
const _shutdownSignals = new Set();
let _shuttingDown = false;
/** @type {{ timeout: number, exitCode: number }} */
const _shutdownConfig = { timeout: 10_000, exitCode: 0 };

/**
 * Runs cleanup code when the process is asked to stop (Ctrl+C,
 * `docker stop`, `kill`): close servers, flush logs, disconnect databases.
 * Handlers run in reverse order, then the process exits. If they take
 * longer than `timeout`, the exit is forced; a second Ctrl+C exits at once.
 *
 * @example
 * const server = app.listen(3000);
 * sys.onShutdown(() => new Promise((done) => server.close(done)));
 * sys.onShutdown((reason) => log.info(`Stopping (${reason})`));
 *
 * @param {(reason: ShutdownReason) => unknown} handler Can be async. Gets the signal that stopped the process.
 * @param {ShutdownOptions} [options]
 * @returns {() => void} Removes the handler.
 */
function onShutdown(handler, options = {}) {
  if (options.timeout !== undefined) _shutdownConfig.timeout = toMs(options.timeout, "timeout");
  if (options.exitCode !== undefined) _shutdownConfig.exitCode = options.exitCode;
  _shutdownHandlers.push(handler);
  const signals = options.signals ?? /** @type {NodeJS.Signals[]} */ (["SIGINT", "SIGTERM", "SIGHUP", ...(process.platform === "win32" ? ["SIGBREAK"] : [])]);
  for (const signal of signals) {
    if (_shutdownSignals.has(signal)) continue;
    _shutdownSignals.add(signal);
    try {
      process.on(signal, () => {
        void _shutdown(signal, undefined);
      });
    } catch {
      // unsupported signal on this platform
    }
  }
  return () => {
    const index = _shutdownHandlers.lastIndexOf(handler);
    if (index !== -1) _shutdownHandlers.splice(index, 1);
  };
}

/**
 * @param {ShutdownReason} reason
 * @param {number | undefined} exitCode
 * @returns {Promise<void>}
 */
const _shutdown = async (reason, exitCode) => {
  if (_shuttingDown) {
    process.exit(1);
    return;
  }
  _shuttingDown = true;
  const force = setTimeout(() => {
    process.stderr.write(`[@ix-xs/node-comfort] Shutdown (${reason}) took longer than ${_shutdownConfig.timeout}ms, forcing exit\n`);
    process.exit(1);
  }, Math.min(_shutdownConfig.timeout, 2 ** 31 - 1));
  // Not unref'd: a handler that never settles must not let the process end
  // quietly with the wrong exit code once nothing else keeps it alive.
  let failed = false;
  for (const handler of [..._shutdownHandlers].reverse()) {
    try {
      await handler(reason);
    } catch (error) {
      failed = true;
      process.stderr.write(`[@ix-xs/node-comfort] Shutdown handler failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    }
  }
  clearTimeout(force);
  process.exit(failed ? 1 : exitCode ?? _shutdownConfig.exitCode);
};

/**
 * Stops the process the clean way: runs the `onShutdown()` handlers, then
 * exits. Use it instead of `process.exit()` when something goes wrong for
 * good, so servers and databases still get closed.
 *
 * @example
 * process.on("uncaughtException", (error) => {
 *   log.fatal(error);
 *   sys.shutdown(1);
 * });
 *
 * @param {number} [exitCode] Defaults to the `exitCode` given to `onShutdown()`, or `0`. A failing handler makes it `1`.
 * @returns {Promise<void>} Never resolves: the process exits first.
 */
function shutdown(exitCode) {
  return _shutdown("shutdown", exitCode);
}

/**
 * Are we on Windows?
 * @returns {boolean}
 */
function isWindows() {
  return process.platform === "win32";
}

/**
 * Are we on macOS?
 * @returns {boolean}
 */
function isMac() {
  return process.platform === "darwin";
}

/**
 * Are we on Linux? WSL counts.
 * @returns {boolean}
 */
function isLinux() {
  return process.platform === "linux";
}

/**
 * Are we running in CI? Detects GitHub Actions, GitLab, CircleCI, Jenkins,
 * Azure, Vercel, Netlify and more.
 *
 * @example
 * if (sys.isCI()) nc.setLevel("warn");
 *
 * @returns {boolean}
 */
function isCI() {
  const env = process.env;
  if (env.CI === "false" || env.CI === "0") return false;
  return Boolean(
    env.CI || env.CONTINUOUS_INTEGRATION || env.BUILD_NUMBER || env.RUN_ID || env.GITHUB_ACTIONS || env.GITLAB_CI ||
    env.CIRCLECI || env.TRAVIS || env.JENKINS_URL || env.TF_BUILD || env.BITBUCKET_BUILD_NUMBER || env.BUILDKITE ||
    env.VERCEL || env.NETLIFY || env.CODEBUILD_BUILD_ID || env.TEAMCITY_VERSION,
  );
}

/** @type {boolean | undefined} */
let _docker;

/**
 * Are we running inside a container?
 *
 * @returns {boolean}
 */
function isDocker() {
  if (_docker !== undefined) return _docker;
  if (process.platform !== "linux") return (_docker = false);
  try {
    _docker = fs.existsSync("/.dockerenv") || fs.existsSync("/run/.containerenv") || /docker|kubepods|containerd/.test(fs.readFileSync("/proc/self/cgroup", "utf8"));
  } catch {
    _docker = false;
  }
  return _docker;
}

/**
 * Are we running in WSL?
 *
 * @returns {boolean}
 */
function isWSL() {
  return process.platform === "linux" && (/microsoft/i.test(os.release()) || Boolean(process.env.WSL_DISTRO_NAME));
}

/**
 * Facts about the machine and the runtime, handy for bug reports.
 *
 * @example
 * console.table(sys.info());
 *
 * @returns {SystemInfo}
 */
function info() {
  const cpus = os.cpus();
  let user = "";
  try {
    user = os.userInfo().username;
  } catch {
    user = process.env.USER ?? process.env.USERNAME ?? "";
  }
  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    node: process.version,
    cpus: cpus.length,
    cpuModel: cpus[0]?.model?.trim() ?? "unknown",
    memory: { total: os.totalmem(), free: os.freemem(), used: os.totalmem() - os.freemem() },
    uptime: os.uptime(),
    hostname: os.hostname(),
    user,
    pid: process.pid,
    ci: isCI(),
    docker: isDocker(),
    wsl: isWSL(),
  };
}

/**
 * Finds a TCP port nobody is listening on. Give a preferred port to get it
 * back when it's free, and another one when it's taken.
 *
 * @example
 * const port = await sys.freePort(3000); // 3000, or a free one if 3000 is in use
 * app.listen(port);
 *
 * @param {number} [preferred] Tried first.
 * @param {string} [host] The address to check. Defaults to all of them.
 * @returns {Promise<number>}
 */
function freePort(preferred, host) {
  const net = require("node:net");
  /**
   * @param {number} port
   * @returns {Promise<number>}
   */
  const listen = (port) =>
    new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.once("error", reject);
      server.listen({ port, host, exclusive: true }, () => {
        const address = server.address();
        server.close(() => resolve(address !== null && typeof address === "object" ? address.port : port));
      });
    });
  if (preferred === undefined) return listen(0);
  if (!Number.isInteger(preferred) || preferred < 0 || preferred > 65535) return Promise.reject(new RangeError(`freePort(): expected a port from 0 to 65535, got ${preferred}`));
  return listen(preferred).catch(() => listen(0));
}

/**
 * The address of this machine on the local network, like `"192.168.1.20"`.
 * It's what you print next to `localhost` so a phone on the same Wi-Fi can
 * reach a dev server.
 *
 * @example
 * console.log(`http://${sys.localIP() ?? "localhost"}:3000`);
 *
 * @param {4 | 6} [family=4] IPv4 or IPv6.
 * @returns {string | undefined} `undefined` when the machine has no network.
 */
function localIP(family = 4) {
  const wanted = family === 6 ? "IPv6" : "IPv4";
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      // fe80:: addresses only work with an interface name attached, so they're no use in a URL
      if (address.family === wanted && !address.internal && !address.address.startsWith("fe80:")) return address.address;
    }
  }
  return undefined;
}

/**
 * Memory used by this process, in bytes.
 *
 * @example
 * nc.num.formatBytes(sys.memory().heapUsed); // "42.1 MB"
 *
 * @returns {{ rss: number, heapTotal: number, heapUsed: number, external: number, arrayBuffers: number }}
 */
function memory() {
  const usage = process.memoryUsage();
  return { rss: usage.rss, heapTotal: usage.heapTotal, heapUsed: usage.heapUsed, external: usage.external, arrayBuffers: usage.arrayBuffers };
}

module.exports = {
  run,
  exec,
  which,
  open,
  onShutdown,
  shutdown,
  freePort,
  localIP,
  isWindows,
  isMac,
  isLinux,
  isCI,
  isDocker,
  isWSL,
  info,
  memory,
};
