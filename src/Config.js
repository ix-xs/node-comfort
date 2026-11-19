"use strict";

/**
 * Settings shared by the whole toolkit: the language and the time zone that
 * `num` and `time` use when a call doesn't give its own `{ locale }` or
 * `{ timeZone }`. English and the system zone by default, so output doesn't
 * depend on the machine.
 *
 * @example
 * nc.config.set({ locale: "fr", timeZone: "Europe/Paris" });
 * nc.num.currency(1234.5, "EUR");     // "1 234,50 €"
 * nc.time.relative(Date.now() - 60e3); // "il y a 1 minute"
 * nc.config.get();                     // { locale: "fr", timeZone: "Europe/Paris" }
 */

const { config: _config } = require("./internal/shared.js");

/**
 * The shared settings.
 * @typedef {object} ConfigSettings
 * @property {string} locale Language of `num`, `time`, `str.plural()` and `arr.toSentence()`, like `"fr"` or `"en-US"`.
 * @property {string | undefined} timeZone Time zone of `time` and of the logger timestamps, like `"Europe/Paris"`. `undefined` means the system zone.
 */

/**
 * What `set()` accepts. Only the keys you give change.
 * @typedef {object} ConfigInput
 * @property {string} [locale] Like `"fr"`, `"en-GB"` or `"pt-BR"`.
 * @property {string | null} [timeZone] Like `"America/New_York"`. `undefined` or `null` goes back to the system zone.
 */

/**
 * Changes the language and the time zone used by `num` and `time`. Only the
 * keys you give change.
 *
 * @example
 * nc.config.set({ locale: "fr" });
 * nc.config.set({ timeZone: "Europe/Paris" });
 * nc.config.set({ timeZone: undefined }); // back to the system zone
 *
 * @param {ConfigInput} settings
 * @returns {ConfigSettings} The settings now in use.
 * @throws {RangeError} If the language or the zone doesn't exist.
 * @throws {TypeError} If the language isn't a string.
 */
function set(settings) {
  const { locale } = settings;
  const changeZone = Object.hasOwn(settings, "timeZone");
  const timeZone = settings.timeZone ?? undefined;
  // Checked before anything changes, so a bad value leaves the settings as they were.
  if (locale !== undefined) {
    if (typeof locale !== "string") throw new TypeError(`Invalid locale: ${String(locale)}`);
    Intl.getCanonicalLocales(locale);
  }
  if (changeZone && timeZone !== undefined) new Intl.DateTimeFormat("en-US", { timeZone });
  if (locale !== undefined) _config.locale = locale;
  if (changeZone) _config.timeZone = timeZone;
  return get();
}

/**
 * The settings now in use.
 *
 * @example
 * nc.config.get(); // { locale: "en", timeZone: undefined }
 *
 * @returns {ConfigSettings} A copy: changing it changes nothing.
 */
function get() {
  return { locale: _config.locale, timeZone: _config.timeZone };
}

module.exports = {
  // not shorthand: Node's ES module export detection stops at a bare `get` or `set`
  set: set,
  get: get,
};
