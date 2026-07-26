/**
 * Waits for a given number of milliseconds.
 *
 * @example
 * await nodeComfort.wait(500); // waits 500 ms
 *
 * @param {number} ms - Delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export function wait(ms: number): Promise<void>;
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
export function when(predicate: boolean | Promise<boolean> | (() => boolean | Promise<boolean>), payload?: any, options?: {
    interval?: number | undefined;
    timeout?: number | null | undefined;
    max?: number | null | undefined;
}): {
    start: () => any;
    stop: () => any;
    on: <E extends "error" | "trigger" | "timeout">(event: E, handler: E extends "error" ? (error: unknown) => void | Promise<void> : (payload: any) => void | Promise<void>) => any;
};
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
export function dontCrash(): {
    on: <E extends "error" | "exit" | "sig" | "beforeExit">(event: E, handler?: (E extends "error" ? (error: Error | unknown) => void | Promise<void> : E extends "exit" ? (code: number) => void | Promise<void> : E extends "sig" ? (signal: "SIGINT" | "SIGTERM" | "SIGQUIT") => void | Promise<void> : (code: number) => void | Promise<void>)) => any;
};
/**
 * Safely stringifies a value to pretty-printed JSON (4 spaces indent).
 *
 * @param {*} value - Value to stringify.
 * @returns {string} JSON string representation.
 */
export function JSONString(value: any): string;
/**
 * Parses a JSON string.
 *
 * @param {string} value - JSON string to parse.
 * @returns {*} Parsed value.
 */
export function JSONParse(value: string): any;
//# sourceMappingURL=Utils.d.ts.map