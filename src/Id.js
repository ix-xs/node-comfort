"use strict";

/**
 * Unique ids: UUID v4 and v7, ULID, nanoid-style ids, Snowflakes, tokens
 * and short codes. All of them use the secure random generator of
 * `node:crypto`, with no bias.
 *
 * @example
 * id.uuidv7();  // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", sorts by creation time
 * id.nano();    // "V1StGXR8_Z5jdHi6B-myT"
 * id.code();    // "K7QF9X"
 * id.token(32); // for API keys and reset links
 */

/** @type {typeof import("node:crypto") | undefined} */
let _nodeCrypto;
const _crypto = () => (_nodeCrypto ??= require("node:crypto"));
const nodeCrypto = require("./Crypto.js");

/**
 * Encodings for `token()`.
 * @typedef {"hex" | "base64" | "base64url" | "base58" | "base32"} TokenEncoding
 */

/**
 * Options for `snowflake()` and `parseSnowflake()`.
 * @typedef {object} SnowflakeOptions
 * @property {number} [epoch] Start of time, in ms. Defaults to Discord's (2015-01-01). Twitter uses `1288834974657`.
 * @property {number} [workerId] 0 to 31. Defaults to `0`.
 * @property {number} [processId] 0 to 31. Defaults to `process.pid % 32`.
 */

/**
 * A decoded Snowflake.
 * @typedef {object} ParsedSnowflake
 * @property {Date} date When it was created.
 * @property {number} timestamp When it was created, in ms.
 * @property {number} workerId
 * @property {number} processId
 * @property {number} increment Sequence number within the millisecond, 0 to 4095.
 */

const NANO_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DISCORD_EPOCH = 1420070400000;

/** @type {Record<string, number>} */
const _counters = {};

/**
 * Secure random characters, with rejection sampling so there's no bias.
 * @param {string} alphabet
 * @param {number} size
 * @returns {string}
 */
const _random = (alphabet, size) => {
  const len = alphabet.length;
  if (len < 2 || len > 256) throw new RangeError("The alphabet must contain between 2 and 256 characters");
  const mask = (2 << Math.floor(Math.log2(len - 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / len);
  let out = "";
  while (out.length < size) {
    const bytes = _crypto().randomBytes(step);
    for (let i = 0; i < step && out.length < size; i++) {
      const index = bytes[i] & mask;
      if (index < len) out += alphabet[index];
    }
  }
  return out;
};

/**
 * @param {Buffer} buffer
 * @returns {string}
 */
const _base58 = (buffer) => {
  if (!buffer.length) return "";
  const digits = [0];
  for (const byte of buffer) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = "";
  for (let i = 0; i < buffer.length - 1 && buffer[i] === 0; i++) out += BASE58_ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58_ALPHABET[digits[i]];
  return out;
};

/**
 * @param {Buffer} buffer
 * @returns {string}
 */
const _base32 = (buffer) => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out;
};

/**
 * A random UUID (version 4). For ids that sort by date, see `uuidv7()`.
 *
 * @example
 * id.uuid(); // "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
 *
 * @returns {string}
 */
function uuid() {
  return _crypto().randomUUID();
}

let _v7LastMs = 0;
let _v7Counter = 0;

/**
 * A UUID v7: it starts with a timestamp, so ids sort by creation time.
 * That keeps database indexes compact, which makes them great primary
 * keys. Ids from the same process always increase, even within a
 * millisecond.
 *
 * @example
 * id.uuidv7();               // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
 * id.timestamp(id.uuidv7()); // when it was created
 *
 * @returns {string}
 */
function uuidv7() {
  let now = Date.now();
  if (now <= _v7LastMs) {
    _v7Counter++;
    if (_v7Counter > 0xfff) {
      _v7Counter = 0;
      _v7LastMs++;
    }
    now = _v7LastMs;
  } else {
    _v7LastMs = now;
    _v7Counter = _crypto().randomInt(0, 0x800);
  }
  const bytes = _crypto().randomBytes(16);
  bytes.writeUIntBE(now, 0, 6);
  bytes[6] = 0x70 | ((_v7Counter >> 8) & 0x0f);
  bytes[7] = _v7Counter & 0xff;
  bytes[8] = 0x80 | (bytes[8] & 0x3f);
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let _ulidLastMs = -1;
/** @type {number[]} */
let _ulidLastRandom = [];

/**
 * A ULID: 26 URL-safe characters that sort by creation time. Ids made in
 * the same millisecond still increase.
 *
 * @example
 * id.ulid();                       // "01HQ3Z8K9V3N5W7Y2XJ4T6R8PB"
 * id.ulid(Date.UTC(2024, 0, 1));   // for a given time
 *
 * @param {number} [time] Timestamp to encode, in ms. Defaults to now.
 * @returns {string}
 */
function ulid(time) {
  const now = time ?? Date.now();
  /** @type {number[]} */
  let random;
  if (time === undefined && now === _ulidLastMs) {
    random = [..._ulidLastRandom];
    let i = random.length - 1;
    while (i >= 0 && random[i] === 31) random[i--] = 0;
    if (i < 0) throw new RangeError("ULID overflow: too many ids in the same millisecond");
    random[i]++;
  } else {
    random = [..._crypto().randomBytes(16)].map((b) => b & 31);
  }
  if (time === undefined) {
    _ulidLastMs = now;
    _ulidLastRandom = random;
  }
  let t = now;
  let head = "";
  for (let i = 0; i < 10; i++) {
    head = CROCKFORD[t % 32] + head;
    t = Math.floor(t / 32);
  }
  return head + random.map((v) => CROCKFORD[v]).join("");
}

/**
 * A short, URL-safe random id, like `nanoid`. At 21 characters, collisions
 * are as unlikely as with a UUID.
 *
 * @example
 * id.nano();                      // "V1StGXR8_Z5jdHi6B-myT"
 * id.nano(10);                    // "IRFa-VaY2b"
 * id.nano(8, "0123456789abcdef"); // "4f90d13a"
 *
 * @param {number} [size=21]
 * @param {string} [alphabet] 2 to 256 characters. Defaults to letters, digits, `_` and `-`.
 * @returns {string}
 */
function nano(size = 21, alphabet = NANO_ALPHABET) {
  return _random(alphabet, size);
}

/**
 * Makes an id generator with your own alphabet and length.
 *
 * @example
 * const orderId = id.customAlphabet("0123456789ABCDEF", 12);
 * orderId(); // "4F1A09C2BB7E"
 *
 * @param {string} alphabet
 * @param {number} [size=21]
 * @returns {(size?: number) => string}
 */
function customAlphabet(alphabet, size = 21) {
  _random(alphabet, 1);
  return (length = size) => _random(alphabet, length);
}

/**
 * A random token for API keys, session ids, reset links...
 *
 * @example
 * id.token();                // 64 hex characters
 * id.token(16, "base64url"); // 22 URL-safe characters
 * id.token(16, "base58");    // no look-alike characters
 *
 * @param {number} [bytes=32] How much randomness, in bytes.
 * @param {TokenEncoding} [encoding="hex"]
 * @returns {string}
 */
function token(bytes = 32, encoding = "hex") {
  const buffer = _crypto().randomBytes(bytes);
  if (encoding === "base58") return _base58(buffer);
  if (encoding === "base32") return _base32(buffer);
  return buffer.toString(encoding);
}

/**
 * A short code that's easy to read aloud and type: no `0/O` or `1/I/L`
 * mix-ups. For invites, coupons and verification codes.
 *
 * @example
 * id.code();                // "K7QF9X"
 * id.code(4, "0123456789"); // "3920"
 *
 * @param {number} [length=6]
 * @param {string} [alphabet="ABCDEFGHJKMNPQRSTUVWXYZ23456789"]
 * @returns {string}
 */
function code(length = 6, alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789") {
  return _random(alphabet, length);
}

let _snowflakeLastMs = 0;
let _snowflakeIncrement = 0;

/**
 * A Snowflake id, the 64-bit format used by Discord and Twitter. Returned
 * as a string because it doesn't fit in a JavaScript number.
 *
 * @example
 * id.snowflake(); // "1215361932810932224"
 *
 * @param {SnowflakeOptions} [options]
 * @returns {string}
 */
function snowflake(options = {}) {
  const epoch = options.epoch ?? DISCORD_EPOCH;
  let now = Date.now();
  if (now <= _snowflakeLastMs) {
    _snowflakeIncrement = (_snowflakeIncrement + 1) & 0xfff;
    if (_snowflakeIncrement === 0) _snowflakeLastMs++;
    now = _snowflakeLastMs;
  } else {
    _snowflakeLastMs = now;
    _snowflakeIncrement = 0;
  }
  const worker = BigInt((options.workerId ?? 0) & 31);
  const proc = BigInt((options.processId ?? process.pid) & 31);
  return ((BigInt(now - epoch) << 22n) | (worker << 17n) | (proc << 12n) | BigInt(_snowflakeIncrement)).toString();
}

/**
 * Decodes a Snowflake. With the default epoch, it reads Discord ids.
 *
 * @example
 * id.parseSnowflake("175928847299117063").date; // 2016-04-30T11:18:25.796Z
 *
 * @param {string | bigint} id
 * @param {SnowflakeOptions} [options] Use the epoch it was created with.
 * @returns {ParsedSnowflake}
 */
function parseSnowflake(id, options = {}) {
  const value = BigInt(id);
  const timestamp = Number(value >> 22n) + (options.epoch ?? DISCORD_EPOCH);
  return {
    date: new Date(timestamp),
    timestamp,
    workerId: Number((value >> 17n) & 31n),
    processId: Number((value >> 12n) & 31n),
    increment: Number(value & 0xfffn),
  };
}

/**
 * When a ULID or a UUID v7 was created.
 *
 * @example
 * id.timestamp(id.ulid()); // now
 * id.timestamp(id.uuid()); // undefined, v4 has no time in it
 *
 * @param {string} value
 * @returns {Date | undefined}
 */
function timestamp(value) {
  const s = String(value);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return new Date(parseInt(s.replace(/-/g, "").slice(0, 12), 16));
  }
  if (/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(s)) {
    let ms = 0;
    for (const char of s.slice(0, 10).toUpperCase()) ms = ms * 32 + CROCKFORD.indexOf(char);
    return new Date(ms);
  }
  return undefined;
}

/**
 * Readable sequential ids like `"user-1"`, `"user-2"`, counted per prefix.
 * Only unique within the current process; handy in logs and tests.
 *
 * @example
 * id.seq("user"); // "user-1"
 * id.seq("user"); // "user-2"
 *
 * @param {string} [prefix=""]
 * @returns {string}
 */
function seq(prefix = "") {
  _counters[prefix] = (_counters[prefix] ?? 0) + 1;
  return prefix ? `${prefix}-${_counters[prefix]}` : String(_counters[prefix]);
}

/**
 * Hashes a value.
 *
 * @deprecated Use `nc.crypto.hash()`. This alias goes away in 3.0.
 * @param {string | Buffer | Uint8Array} value
 * @param {import("./Crypto").HashOptions} [options]
 * @returns {string}
 */
function hash(value, options) {
  return nodeCrypto.hash(value, options);
}

/**
 * Signs a value with HMAC.
 *
 * @deprecated Use `nc.crypto.hmac()`. This alias goes away in 3.0.
 * @param {string | Buffer | Uint8Array} value
 * @param {string | Buffer | Uint8Array} secret
 * @param {import("./Crypto").HashOptions} [options]
 * @returns {string}
 */
function hmac(value, secret, options) {
  return nodeCrypto.hmac(value, secret, options);
}

/**
 * Compares two secrets in constant time.
 *
 * @deprecated Use `nc.crypto.safeEqual()`. This alias goes away in 3.0.
 * @param {string | Buffer | Uint8Array} a
 * @param {string | Buffer | Uint8Array} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  return nodeCrypto.safeEqual(a, b);
}

module.exports = {
  uuid,
  uuidv7,
  ulid,
  nano,
  customAlphabet,
  token,
  code,
  snowflake,
  parseSnowflake,
  timestamp,
  seq,
  hash,
  hmac,
  safeEqual,
};
