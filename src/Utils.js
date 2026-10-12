"use strict";

/**
 * Everyday helpers: `wait`, `when`, `dontCrash`, and JSON functions that
 * don't throw. They are also available at the top level (`nc.wait()`).
 *
 * @example
 * await nc.wait("1.5s");
 * const settings = nc.JSONParse(text, {});
 */

const { types } = require("node:util");
const { sleep, toMs } = require("./internal/shared.js");

/**
 * Options for `wait()`.
 * @typedef {object} WaitOptions
 * @property {AbortSignal} [signal] Cancels the wait; the promise rejects with an `AbortError`.
 * @property {boolean} [unref] Let the process exit even if the timer is still pending.
 */

/**
 * Options for `when()`.
 * @typedef {object} WhenOptions
 * @property {number} [interval] Milliseconds between two checks. Defaults to `50`.
 * @property {number | null} [timeout] Give up after this many milliseconds and emit `"timeout"`.
 * @property {number | null} [max] Stop after this many triggers.
 */

/**
 * The task returned by `when()`. Every method returns the task, so calls chain.
 * @typedef {object} WhenTask
 * @property {() => WhenTask} start Starts checking. A stopped task can't be restarted.
 * @property {() => WhenTask} stop Stops checking and clears the timers.
 * @property {<E extends "trigger" | "error" | "timeout">(event: E, handler: E extends "error" ? (error: unknown) => void : (payload: any) => void) => WhenTask} on Listens to `"trigger"` (the condition is true), `"error"` (it threw) or `"timeout"`.
 */

/**
 * Events you can customize on `dontCrash()`.
 * @typedef {"error" | "exit" | "sig" | "beforeExit"} DontCrashEvent
 */

/**
 * Returned by `dontCrash()`.
 * @typedef {object} DontCrashController
 * @property {<E extends DontCrashEvent>(event: E, handler?: E extends "error" ? (error: unknown) => void : E extends "sig" ? (signal: NodeJS.Signals) => void : (code: number) => void) => DontCrashController} on Replaces the handler for an event. Call it without a handler to restore the default one.
 * @property {() => void} dispose Removes everything `dontCrash()` installed.
 */

/**
 * Resolves after a delay, given in milliseconds or as a duration string.
 *
 * @example
 * await nc.wait(500);
 * await nc.wait("2s");
 * await nc.wait("1m", { signal: controller.signal });
 *
 * @param {number | string} duration Milliseconds, or a string like `"250ms"`, `"2s"`, `"1m30s"`.
 * @param {WaitOptions} [options]
 * @returns {Promise<void>}
 * @throws {AbortError} If the signal is aborted.
 * @throws {TypeError} If the duration can't be parsed.
 */
function wait(duration, options = {}) {
  let ms;
  try {
    ms = toMs(duration);
  } catch (error) {
    return Promise.reject(error);
  }
  if (!Number.isFinite(ms)) return Promise.reject(new TypeError(`Invalid duration: ${String(duration)}`));
  return sleep(ms, options.signal, options.unref ?? false);
}

/**
 * Checks a condition at a regular interval and tells you when it's true.
 * Call `.start()` once your listeners are in place. If you just want to
 * await a condition, `nc.async.poll()` is simpler.
 *
 * @example
 * nc.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: 10_000 })
 *   .on("trigger", (payload) => nc.info(payload.reason))
 *   .on("timeout", () => nc.warn("Nothing happened in 10s"))
 *   .start();
 *
 * @param {boolean | PromiseLike<boolean> | (() => unknown)} predicate The condition, or a function (sync or async) that returns it.
 * @param {any} [payload={}] Passed to the `"trigger"` and `"timeout"` listeners.
 * @param {WhenOptions} [options]
 * @returns {WhenTask}
 */
function when(predicate, payload = {}, options = {}) {
  const interval = options.interval ?? 50;
  const timeout = options.timeout ?? null;
  const max = options.max ?? null;
  /** @type {Record<"trigger" | "error" | "timeout", Set<Function>>} */
  const listeners = { trigger: new Set(), error: new Set(), timeout: new Set() };
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  /** @type {NodeJS.Timeout | undefined} */
  let timeoutTimer;
  let stopped = false;
  let started = false;
  let count = 0;

  const emit = (/** @type {"trigger" | "error" | "timeout"} */ event, /** @type {unknown} */ value) => {
    for (const fn of listeners[event]) {
      try {
        fn(value);
      } catch {
        // A failing listener must not stop the task.
      }
    }
  };
  const halt = () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(timeoutTimer);
  };
  const tick = async () => {
    if (stopped) return;
    try {
      const ok = typeof predicate === "function" ? await predicate() : await predicate;
      if (stopped) return;
      if (ok) {
        count++;
        emit("trigger", payload);
        if (max !== null && count >= max) return halt();
      }
    } catch (error) {
      emit("error", error);
    }
    if (!stopped) timer = setTimeout(tick, interval);
  };

  /** @type {WhenTask} */
  const task = {
    start() {
      if (stopped || started) return task;
      started = true;
      timer = setTimeout(tick, 0);
      if (timeout !== null) {
        timeoutTimer = setTimeout(() => {
          if (stopped) return;
          emit("timeout", payload);
          halt();
        }, timeout);
      }
      return task;
    },
    stop() {
      halt();
      return task;
    },
    on(event, handler) {
      listeners[event]?.add(handler);
      return task;
    },
  };
  return task;
}

/**
 * Keeps the process alive when something goes wrong. Uncaught exceptions and
 * unhandled rejections are logged instead of crashing, and `SIGINT`/`SIGTERM`
 * are logged before a clean exit. Customize any of it with `.on()`.
 *
 * Only its own handlers are ever removed; listeners added by your code or by
 * other libraries are left alone.
 *
 * @example
 * nc.dontCrash()
 *   .on("error", (error) => sentry.captureException(error))
 *   .on("sig", async () => {
 *     await server.close();
 *     process.exit(0);
 *   });
 *
 * @returns {DontCrashController}
 */
function dontCrash() {
  _dontCrashDispose?.();
  const logger = require("./Logger.js");
  /** @type {Array<[string, (...args: any[]) => void]>} */
  let installed = [];

  const defaults = {
    error: (/** @type {unknown} */ error) => logger.error("[@ix-xs/node-comfort] Uncaught error:", error),
    exit: (/** @type {number} */ code) => logger.log(`<% gray [@ix-xs/node-comfort] Process exit with code ${code} %>`),
    sig: (/** @type {NodeJS.Signals} */ signal) => {
      logger.warn(`[@ix-xs/node-comfort] Received ${signal}, exiting`);
      process.exit(0);
    },
    beforeExit: () => {},
  };

  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  const listen = (event, handler) => {
    try {
      process.on(/** @type {any} */ (event), handler);
      installed.push([event, handler]);
    } catch {
      // Signal not supported on this platform (for example SIGQUIT on Windows).
    }
  };
  /** @param {string[]} events */
  const unlisten = (events) => {
    installed = installed.filter(([event, handler]) => {
      if (!events.includes(event)) return true;
      process.off(/** @type {any} */ (event), handler);
      return false;
    });
  };

  /** @type {DontCrashController} */
  const controller = {
    on(event, handler) {
      if (event === "error") {
        unlisten(["uncaughtException", "unhandledRejection"]);
        const fn = /** @type {(error: unknown) => void} */ (handler ?? defaults.error);
        listen("uncaughtException", fn);
        listen("unhandledRejection", fn);
      } else if (event === "exit") {
        unlisten(["exit"]);
        listen("exit", /** @type {(code: number) => void} */ (handler ?? defaults.exit));
      } else if (event === "sig") {
        const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
        unlisten(signals);
        for (const signal of signals) listen(signal, /** @type {(signal: NodeJS.Signals) => void} */ (handler ?? defaults.sig));
      } else if (event === "beforeExit") {
        unlisten(["beforeExit"]);
        listen("beforeExit", /** @type {(code: number) => void} */ (handler ?? defaults.beforeExit));
      }
      return controller;
    },
    dispose() {
      unlisten(installed.map(([event]) => event));
      if (_dontCrashDispose === controller.dispose) _dontCrashDispose = undefined;
    },
  };
  _dontCrashDispose = controller.dispose;
  controller.on("error").on("exit").on("sig");
  return controller;
}

/** @type {(() => void) | undefined} */
let _dontCrashDispose;

/**
 * `JSON.stringify` that never throws. Circular references become
 * `"[Circular]"`, bigints become strings, Maps become objects, Sets become
 * arrays, and errors keep their name, message and stack.
 *
 * @example
 * nc.JSONString({ a: 1 });                          // '{\n    "a": 1\n}'
 * nc.JSONString({ id: 10n, tags: new Set(["x"]) }, 0); // '{"id":"10","tags":["x"]}'
 * nc.JSONString({ error: new Error("boom") }, 0);   // '{"error":{"name":"Error","message":"boom","stack":"..."}}'
 *
 * @param {unknown} value
 * @param {number} [spaces=4] Indentation. Use `0` for a single line.
 * @returns {string} The JSON text, or `"undefined"` for values JSON can't represent.
 */
function JSONString(value, spaces = 4) {
  /** @type {Array<[holder: object, original: object]>} ancestors of the value being serialized */
  const stack = [];
  let text;
  try {
    text = JSON.stringify(
      value,
      /** @this {any} */ function(_, raw) {
        if (typeof raw === "bigint") return raw.toString();
        if (raw === null || typeof raw !== "object") return raw;
        while (stack.length && stack[stack.length - 1][0] !== this) stack.pop();
        for (let i = 0; i < stack.length; i++) if (stack[i][1] === raw) return "[Circular]";
        const v = types.isMap(raw) ? Object.fromEntries(raw) : types.isSet(raw) ? [...raw] : types.isNativeError(raw) ? _plainError(raw) : raw;
        stack.push([v, raw]);
        return v;
      },
      spaces,
    );
  } catch (error) {
    // A getter or a toJSON() threw: describe the value instead of failing.
    try {
      text = JSON.stringify(require("node:util").inspect(value, { depth: 4, breakLength: Infinity }));
    } catch {
      text = JSON.stringify(`[Unserializable: ${error instanceof Error ? error.message : String(error)}]`);
    }
  }
  return text ?? String(text);
}

/**
 * The fields of an error that `JSON.stringify` would drop.
 * @param {Error} error
 * @returns {Record<string, unknown>}
 */
const _plainError = (error) => {
  /** @type {Record<string, unknown>} */
  const out = { name: error.name, message: error.message };
  for (const key of Object.keys(error)) out[key] = /** @type {any} */ (error)[key];
  if (error.cause !== undefined) out.cause = error.cause;
  if (error.stack) out.stack = error.stack;
  return out;
};

/**
 * `JSON.parse` with an optional fallback. With a fallback, invalid input
 * returns it instead of throwing. A leading byte order mark, which Windows
 * editors like to add, is ignored.
 *
 * @example
 * nc.JSONParse('{"a":1}');    // { a: 1 }
 * nc.JSONParse("oops", null); // null
 * nc.JSONParse("oops");       // throws SyntaxError
 * nc.JSONParse(text, {}, (key, value) => (key === "at" ? new Date(value) : value));
 *
 * @template [T=any]
 * @param {string} text
 * @param {T} [fallback] Returned when `text` isn't valid JSON.
 * @param {(this: any, key: string, value: any) => any} [reviver] Passed to `JSON.parse`.
 * @returns {T}
 * @throws {SyntaxError} If `text` is invalid and there's no fallback.
 */
function JSONParse(text, fallback, reviver) {
  const clean = typeof text === "string" && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (arguments.length < 2) return JSON.parse(clean);
  try {
    return JSON.parse(clean, reviver);
  } catch {
    return /** @type {T} */ (fallback);
  }
}

module.exports = {
  wait,
  when,
  dontCrash,
  JSONString,
  JSONParse,
};
