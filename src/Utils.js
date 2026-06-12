const logger = require("./Logger");

/**
 * Miscellaneous async and process helpers.
 */
module.exports = {
  /**
   * Waits for a given number of milliseconds.
   *
   * @example
   * await nodeComfort.wait(500); // waits 500 ms
   *
   * @param {number} ms - Delay in milliseconds.
   * @returns {Promise<void>} A promise that resolves after the delay.
   */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Polls a predicate at a given interval and emits events when it matches or times out.
   *
   * The predicate is evaluated every `options.interval` milliseconds (default: 50 ms).
   * Be careful with the default interval: 50 ms is very frequent polling and can be
   * unnecessarily CPU‑intensive if your predicate or trigger handlers are heavy.
   * When `options.max` is `null`, the predicate can match indefinitely (infinite triggers),
   * so you should choose an interval that makes sense for your use‑case.
   *
   * A `when(...)` task is one‑shot: once it has been stopped (manually or via `max`/`timeout`),
   * calling `.start()` again on the same task will not restart it.
   *
   * @param {boolean|Promise<boolean>|(() => boolean|Promise<boolean>)} predicate
   *        Condition to evaluate at each tick, or a function returning it.
   * @param {*} [payload={}]
   *        Value passed to listeners when events are emitted (e.g. an object or message).
   * @param {object} [options]
   * @param {number} [options.interval=50]
   *        Polling interval in milliseconds. Increase this value if your predicate is
   *        expensive or you expect many triggers without a `max` limit.
   * @param {number|null} [options.timeout=null]
   *        Maximum time in milliseconds before emitting a "timeout" event and stopping.
   *        If `null`, no timeout is applied.
   * @param {number|null} [options.max=null]
   *        Maximum number of successful predicate evaluations ("trigger" events) before
   *        automatically stopping. If `null`, triggers are infinite until `stop()` is called.
   *
   * @example
   * // Basic usage: infinite triggers every 50 ms (default interval) – use with caution.
   * const task = nodeComfort.when(() => true, { message: "Ok" });
   *
   * task
   *   .on("trigger", (payload) => {
   *     console.log(payload.message);
   *     // task.stop(); // stop when you’re done
   *   })
   *   .start();
   *
   * @example
   * // Safer usage: limit triggers and/or lower polling frequency.
   * nodeComfort.when(() => true, { message: "Ok" }, { max: 1, interval: 500 })
   *   .on("trigger", (payload) => {
   *     console.log(payload.message);
   *   })
   *   .on("timeout", (payload) => {
   *     console.log("Timed out", payload);
   *   })
   *   .start();
   *
   * @returns {{
   *   start: () => any,
   *   stop: () => any,
   *   on: <E extends "error"|"trigger"|"timeout">(event: E, handler: E extends "error"
   *       ? (error: unknown) => void|Promise<void>
   *       : (payload: any) => void|Promise<void>) => any
   * }} A small task controller with `start`, `stop` and `on`.
   */
  when(predicate, payload = {}, options) {
    const interval = options?.interval ?? 50;
    const timeout = options?.timeout ?? null;
    const max = options?.max ?? null;

    /** @type {{ trigger: Set<Function>, error: Set<Function>, timeout: Set<Function> }} */
    const listeners = {
      trigger: new Set(),
      error: new Set(),
      timeout: new Set(),
    };

    let _timer = null;
    let _timeoutTimer = null;
    let _stopped = false;
    let _count = 0;

    /**
     * Emits an event to all registered listeners.
     * Errors in listeners are caught and ignored to avoid breaking the polling loop.
     *
     * @param {"trigger"|"error"|"timeout"} event
     * @param {*} p
     */
    function emit(event, p) {
      for (const fn of listeners[event]) {
        try {
          fn(p);
        } catch {
          // Best effort: we don't re-throw here to keep the task alive.
        }
      }
    }

    async function evalPredicate() {
      if (typeof predicate === "function") {
        return await predicate();
      }
      return Boolean(await predicate);
    }

    async function tick() {
      if (_stopped) return;

      try {
        const ok = await evalPredicate();

        if (ok) {
          _count++;
          emit("trigger", payload);

          if (max != null && _count >= max) {
            _stopInternal();
            return;
          }
        }

        if (!_stopped) {
          _timer = setTimeout(tick, interval);
        }
      } catch (error) {
        emit("error", error);
        if (!_stopped) {
          _timer = setTimeout(tick, interval);
        }
      }
    }

    function _stopInternal() {
      _stopped = true;
      if (_timer) {
        clearTimeout(_timer);
        _timer = null;
      }
      if (_timeoutTimer) {
        clearTimeout(_timeoutTimer);
        _timeoutTimer = null;
      }
    }

    const controller = {
      /**
       * Starts the polling task (one-shot: no effect if it was already stopped).
       * @returns {typeof controller}
       */
      start() {
        if (_stopped) return controller;

        if (!_timer) {
          _timer = setTimeout(tick, 0);
        }

        if (timeout != null && !_timeoutTimer) {
          _timeoutTimer = setTimeout(() => {
            if (_stopped) return;
            emit("timeout", payload);
            _stopInternal();
          }, timeout);
        }

        return controller;
      },
      /**
       * Stops the polling task and clears all timers.
       * @returns {typeof controller}
       */
      stop() {
        _stopInternal();
        return controller;
      },
      /**
       * Registers an event handler.
       *
       * @typedef { "error" | "trigger" | "timeout" } EventNames
       * @typedef {{
       *   error: (error: unknown) => void|Promise<void>,
       *   trigger: (payload: any) => void|Promise<void>,
       *   timeout: (payload: any) => void|Promise<void>,
       * }} EventHandlers
       *
       * @template {EventNames} E
       * @param {E} event - Event name.
       * @param {EventHandlers[E]} handler - Handler function.
       * @returns {typeof controller}
       */
      on(event, handler) {
        listeners[event]?.add(handler);
        return controller;
      },
    };

    return controller;
  },

  /**
   * Installs process-level safety nets for errors, exits and signals.
   *
   * By default, it:
   * - logs uncaught exceptions and unhandled rejections,
   * - logs process exit codes,
   * - logs SIGINT/SIGTERM/SIGQUIT and exits with code 0.
   *
   * You can override each handler with `.on(event, handler)`.
   *
   * @example
   * // Use defaults:
   * nodeComfort.dontCrash();
   *
   * @example
   * // Custom error handler:
   * nodeComfort.dontCrash().on("error", (err) => {
   *   console.error("Global error:", err);
   *   process.exit(1);
   * });
   *
   * @returns {{
   *   on: <E extends "error"|"exit"|"sig"|"beforeExit">(event: E, handler?: (
   *     E extends "error" ? (error: Error|unknown) => void|Promise<void> :
   *     E extends "exit" ? (code: number) => void|Promise<void> :
   *     E extends "sig" ? (signal: "SIGINT"|"SIGTERM"|"SIGQUIT") => void|Promise<void> :
   *     (code: number) => void|Promise<void>
   *   )) => any
   * }} A small controller to configure global handlers.
   */
  dontCrash() {
    const defaults = {
      error: (error) => {
        logger.log(
          `<% red [@ix-xs/node-comfort] Process Error %>\n<% gray ${error.stack ?? error} %>`,
        );
      },
      exit: (code) => {
        logger.log(
          `<% yellow [@ix-xs/node-comfort] Process Exit %>\n→ Code: <% gray ${code} %>`,
        );
      },
      sig: (signal) => {
        logger.log(
          `<% yellow [@ix-xs/node-comfort] Process SIG* %>\n→ Signal: <% gray ${signal} %>`,
        );
        process.exit(0);
      },
      beforeExit: (code) => {},
    };

    const controller = {
      /**
       * Registers global process handlers.
       *
       * @template { "error" | "exit" | "sig" | "beforeExit" } E
       * @param {E} event - Event name.
       * @param {{
       *   error: (error: Error | unknown) => void | Promise<void>,
       *   exit: (code: number) => void | Promise<void>,
       *   sig: (signal: "SIGINT" | "SIGTERM" | "SIGQUIT") => void | Promise<void>,
       *   beforeExit: (code: number) => void|Promise<void>
       * }[E]} [handler] - Custom handler, or use the default when omitted.
       * @returns {typeof controller}
       */
      on(event, handler) {
        if (event === "error") {
          process.removeAllListeners("uncaughtException");
          process.removeAllListeners("unhandledRejection");
          const fn = handler ?? defaults.error;
          process.on("uncaughtException", fn);
          process.on("unhandledRejection", fn);
        } else if (event === "exit") {
          process.removeAllListeners("exit");
          process.on("exit", handler ?? defaults.exit);
        } else if (event === "sig") {
          for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"]) {
            process.removeAllListeners(signal);
            process.on(signal, handler ?? defaults.sig);
          }
        } else if (event === "beforeExit") {
          process.removeAllListeners("beforeExit");
          process.on("beforeExit", handler ?? defaults.beforeExit);
        }

        return controller;
      },
    };

    // Install default handlers for error, exit, sig
    controller.on("error").on("exit").on("sig");

    return controller;
  },

  /**
   * Safely stringifies a value to pretty-printed JSON (4 spaces indent).
   *
   * @param {*} value - Value to stringify.
   * @returns {string} JSON string representation.
   */
  JSONString(value) {
    return JSON.stringify(value, null, 4);
  },

  /**
   * Parses a JSON string.
   *
   * @param {string} value - JSON string to parse.
   * @returns {*} Parsed value.
   */
  JSONParse(value) {
    return JSON.parse(value);
  },
};