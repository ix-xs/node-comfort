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

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const nodePath = require("node:path");
const { ProcessError, AbortError } = require("./errors.js");

/**
 * Options for `run()` and `exec()`.
 * @typedef {object} RunOptions
 * @property {string} [cwd] Where to run the command.
 * @property {Record<string, string | undefined>} [env] Extra environment variables, added to `process.env`.
 * @property {boolean} [extendEnv] Set to `false` to pass only `env`, without `process.env`.
 * @property {string | Buffer} [input] Written to the command's stdin.
 * @property {number | string} [timeout] Kill the command after this long, like `"30s"`.
 * @property {AbortSignal} [signal] Kills the command when aborted.
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
    const env = options.extendEnv === false ? options.env : { ...process.env, ...options.env };
    const prepared = shell ? { file, args, verbatim: false } : _prepare(file, args);
    const timeoutMs = options.timeout === undefined ? undefined : typeof options.timeout === "number" ? options.timeout : require("./Time.js").parseDuration(options.timeout) ?? undefined;
    if (options.signal?.aborted) return reject(new AbortError(`Command aborted: ${display}`, { cause: options.signal.reason }));

    const child = spawn(prepared.file, prepared.args, {
      cwd: options.cwd,
      env: /** @type {NodeJS.ProcessEnv} */ (env),
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

    const kill = () => {
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 2000);
      forceTimer.unref();
    };
    if (timeoutMs !== undefined) {
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
  const isWin = process.platform === "win32";
  const exts = isWin ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : [""];
  const candidates = (/** @type {string} */ base) => (isWin && !nodePath.extname(base) ? exts.map((e) => base + e.toLowerCase()) : isWin ? [base, ...exts.map((e) => base + e.toLowerCase())] : [base]);
  const usable = (/** @type {string} */ file) => {
    try {
      if (!fs.statSync(file).isFile()) return false;
      if (!isWin) fs.accessSync(file, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  };
  if (command.includes("/") || command.includes("\\")) {
    return candidates(nodePath.resolve(command)).find(usable);
  }
  for (const dir of (process.env.PATH ?? process.env.Path ?? "").split(nodePath.delimiter)) {
    if (!dir) continue;
    const found = candidates(nodePath.join(dir.replace(/^"|"$/g, ""), command)).find(usable);
    if (found) return found;
  }
  return undefined;
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
        ? spawn(process.env.comspec || "cmd.exe", ["/d", "/s", "/c", `start "" ${_escapeArg(value, false)}`], { detached: true, stdio: "ignore", windowsHide: true, windowsVerbatimArguments: true })
        : spawn(process.platform === "darwin" ? "open" : "xdg-open", [value], { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** @type {Array<() => unknown>} */
const _shutdownHandlers = [];
let _shutdownInstalled = false;
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
 * sys.onShutdown(() => db.close());
 *
 * @param {() => unknown} handler Can be async.
 * @param {ShutdownOptions} [options]
 * @returns {() => void} Removes the handler.
 */
function onShutdown(handler, options = {}) {
  if (options.timeout !== undefined) {
    _shutdownConfig.timeout = typeof options.timeout === "number" ? options.timeout : require("./Time.js").parseDuration(options.timeout) ?? 10_000;
  }
  if (options.exitCode !== undefined) _shutdownConfig.exitCode = options.exitCode;
  _shutdownHandlers.push(handler);
  if (!_shutdownInstalled) {
    _shutdownInstalled = true;
    const signals = options.signals ?? /** @type {NodeJS.Signals[]} */ (["SIGINT", "SIGTERM", "SIGHUP", ...(process.platform === "win32" ? ["SIGBREAK"] : [])]);
    for (const signal of signals) {
      try {
        process.on(signal, () => {
          void _shutdown(signal);
        });
      } catch {
        // unsupported signal on this platform
      }
    }
  }
  return () => {
    const index = _shutdownHandlers.lastIndexOf(handler);
    if (index !== -1) _shutdownHandlers.splice(index, 1);
  };
}

/**
 * @param {string} reason
 */
const _shutdown = async (reason) => {
  if (_shuttingDown) {
    process.exit(1);
    return;
  }
  _shuttingDown = true;
  const force = setTimeout(() => {
    process.stderr.write(`[@ix-xs/node-comfort] Shutdown (${reason}) took longer than ${_shutdownConfig.timeout}ms, forcing exit\n`);
    process.exit(1);
  }, _shutdownConfig.timeout);
  force.unref();
  let failed = false;
  for (const handler of [..._shutdownHandlers].reverse()) {
    try {
      await handler();
    } catch (error) {
      failed = true;
      process.stderr.write(`[@ix-xs/node-comfort] Shutdown handler failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    }
  }
  clearTimeout(force);
  process.exit(failed ? 1 : _shutdownConfig.exitCode);
};

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

/**
 * Are we running inside a container?
 *
 * @returns {boolean}
 */
function isDocker() {
  if (process.platform !== "linux") return false;
  try {
    if (fs.existsSync("/.dockerenv") || fs.existsSync("/run/.containerenv")) return true;
    return /docker|kubepods|containerd/.test(fs.readFileSync("/proc/self/cgroup", "utf8"));
  } catch {
    return false;
  }
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
  isWindows,
  isMac,
  isLinux,
  isCI,
  isDocker,
  isWSL,
  info,
  memory,
};
