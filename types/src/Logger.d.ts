/**
 * Enables or disables timestamp in logs
 * @param {boolean} value - True to enable, false to disable
 * @returns {Logger} The same Logger instance (for chaining)
 */
export function setTimestamp(value: boolean): Logger;
/**
 * Changes the delimiters used for text formatting
 * @param {object} options - Delimiter options
 * @param {string} [options.open] - New opening delimiter
 * @param {string} [options.close] - New closing delimiter
 * @returns {Logger} The same Logger instance (for chaining)
 */
export function setDelimiter(options?: {
    open?: string | undefined;
    close?: string | undefined;
}): Logger;
/**
 * Prints a message to the console with ANSI formatting
 * @param {*} content - Content to print (string, object, or other)
 * @returns {Logger} The same Logger instance (for chaining)
 */
export function log(content: any): Logger;
/**
 * Logs an informational message, prefixed with a cyan `ℹ INFO` label.
 * @param {*} content - Content to print.
 * @returns {Logger} The same Logger instance (for chaining).
 */
export function info(content: any): Logger;
/**
 * Logs a success message, prefixed with a green `✔ OK` label.
 * @param {*} content - Content to print.
 * @returns {Logger} The same Logger instance (for chaining).
 */
export function success(content: any): Logger;
/**
 * Logs a warning, prefixed with a yellow `⚠ WARN` label (writes to stderr).
 * @param {*} content - Content to print.
 * @returns {Logger} The same Logger instance (for chaining).
 */
export function warn(content: any): Logger;
/**
 * Logs an error, prefixed with a red `✖ ERROR` label.
 *
 * Accepts an `Error` and prints its stack when available.
 * @param {*} content - Content or Error to print.
 * @returns {Logger} The same Logger instance (for chaining).
 */
export function error(content: any): Logger;
/**
 * Logs a debug message (only when `DEBUG`/`NODE_DEBUG` env is set), prefixed
 * with a gray `● DEBUG` label.
 * @param {*} content - Content to print.
 * @returns {Logger} The same Logger instance (for chaining).
 */
export function debug(content: any): Logger;
/**
 * Start a log group (displays a label and adds indentation)
 * @param {string} label - The group name to display
 * @returns {Logger} The same Logger instance (for chaining)
 */
export function group(label: string): Logger;
/**
 * End the current log group
 * @returns {Logger} The same Logger instance (for chaining)
 */
export function groupEnd(): Logger;
//# sourceMappingURL=Logger.d.ts.map