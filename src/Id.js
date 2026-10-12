"use strict";

/**
 * Unique ids: UUID v4, v5 and v7, ULID, ObjectId, nanoid-style ids,
 * Snowflakes, tokens and short codes. Random ones use the secure generator
 * of `node:crypto`, with no bias.
 *
 * @example
 * id.uuidv7();         // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", sorts by creation time
 * id.nano();           // "V1StGXR8_Z5jdHi6B-myT"
 * id.prefixed("user"); // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
 * id.code();           // "K7QF9X"
 * id.token(32);        // for API keys and reset links
 */

/** @type {typeof import("node:crypto") | undefined} */
let _nodeCrypto;
const _crypto = () => (_nodeCrypto ??= require("node:crypto"));

/**
 * Encodings for `token()`.
 * @typedef {"hex" | "base64" | "base64url" | "base58" | "base32"} TokenEncoding
 */

/**
 * A namespace for `uuidv5()`: one of the four standard ones, or any UUID of
 * your own.
 * @typedef {"dns" | "url" | "oid" | "x500" | (string & {})} UUIDNamespace
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
const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DISCORD_EPOCH = 1420070400000;
const MAX_TIME = 2 ** 48 - 1;

/** @type {Record<string, string>} */
const NAMESPACES = {
  dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  oid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  x500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** @type {string[]} */
const HEX = [];
for (let i = 0; i < 256; i++) HEX.push(i.toString(16).padStart(2, "0"));

// Asking the system for random bytes is slow, so they are fetched 4 KB at a
// time and handed out from there.
const POOL_SIZE = 4096;
/** @type {Buffer | undefined} */
let _pool;
let _poolAt = POOL_SIZE;

/**
 * Reserves `count` fresh random bytes in the pool.
 * @param {number} count At most `POOL_SIZE`.
 * @returns {number} Where they start.
 */
const _take = (count) => {
  if (_poolAt + count > POOL_SIZE) {
    _crypto().randomFillSync((_pool ??= Buffer.allocUnsafeSlow(POOL_SIZE)));
    _poolAt = 0;
  }
  const at = _poolAt;
  _poolAt += count;
  return at;
};

/**
 * @param {number} size
 * @param {string} what
 */
const _checkSize = (size, what) => {
  if (!Number.isInteger(size) || size < 0) throw new RangeError(`${what} must be a whole number, 0 or more, got ${size}`);
};

/** @type {Map<string, (size: number) => string>} */
const _samplers = new Map();

/**
 * A function that draws random characters from an alphabet. Bytes that fall
 * outside the alphabet are thrown away, so every character is as likely as
 * the others.
 *
 * @param {string} alphabet
 * @returns {(size: number) => string}
 */
const _sampler = (alphabet) => {
  const known = _samplers.get(alphabet);
  if (known) return known;
  const len = typeof alphabet === "string" ? alphabet.length : 0;
  if (len < 2 || len > 256) throw new RangeError("The alphabet must contain between 2 and 256 characters");
  const mask = (2 << (31 - Math.clz32((len - 1) | 1))) - 1;
  /** @type {(size: number) => string} */
  const sample = (size) => {
    _checkSize(size, "The size");
    let out = "";
    let left = size;
    while (left > 0) {
      const count = Math.min(left, POOL_SIZE);
      const at = _take(count);
      const pool = /** @type {Buffer} */ (_pool);
      for (let i = at; i < at + count; i++) {
        const index = pool[i] & mask;
        if (index < len) {
          out += alphabet[index];
          left--;
        }
      }
    }
    return out;
  };
  if (_samplers.size >= 100) _samplers.clear();
  _samplers.set(alphabet, sample);
  return sample;
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
    value = ((value << 8) | byte) & 0xffff;
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
 * @param {number | Date | undefined} time
 * @param {string} what
 * @returns {number | undefined}
 */
const _time = (time, what) => {
  if (time === undefined) return undefined;
  const ms = +time;
  if (!Number.isInteger(ms) || ms < 0 || ms > MAX_TIME) throw new RangeError(`${what}: the time must be a date or a timestamp in ms, got ${String(time)}`);
  return ms;
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

/**
 * A UUID v5: the same name in the same namespace always gives the same id.
 * Use it to derive a stable id from something you already have, like a URL
 * or an email, without storing a mapping.
 *
 * @example
 * id.uuidv5("example.com", "dns");          // "cfbff0d1-9375-5685-968c-48ce8b15ae17", every time
 * id.uuidv5("https://example.com/a", "url");
 * id.uuidv5("ada@example.com", MY_APP_NAMESPACE); // any UUID works as a namespace
 *
 * @param {string | Buffer | Uint8Array} name
 * @param {UUIDNamespace} namespace `"dns"`, `"url"`, `"oid"`, `"x500"` or a UUID.
 * @returns {string}
 */
function uuidv5(name, namespace) {
  const space = Object.hasOwn(NAMESPACES, namespace) ? NAMESPACES[namespace] : namespace;
  if (typeof space !== "string" || !UUID.test(space)) {
    throw new TypeError(`uuidv5(): the namespace must be "dns", "url", "oid", "x500" or a UUID, got ${String(namespace)}`);
  }
  const bytes = _crypto().createHash("sha1").update(Buffer.from(space.replace(/-/g, ""), "hex")).update(name).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex", 0, 16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let _v7LastMs = 0;
let _v7Counter = 0;
let _v7Head = "";

/**
 * A UUID v7: it starts with a timestamp, so ids sort by creation time.
 * That keeps database indexes compact, which makes them great primary
 * keys. Ids from the same process always increase, even within a
 * millisecond, and even if the system clock steps back.
 *
 * @example
 * id.uuidv7();               // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
 * id.timestamp(id.uuidv7()); // when it was created
 *
 * @returns {string}
 */
function uuidv7() {
  const now = Date.now();
  const at = _take(10);
  const pool = /** @type {Buffer} */ (_pool);
  if (now > _v7LastMs || _v7Counter === 0xfff) {
    // A new millisecond, or the counter is used up and we borrow the next one.
    _v7LastMs = now > _v7LastMs ? now : _v7LastMs + 1;
    _v7Counter = ((pool[at + 8] << 8) | pool[at + 9]) & 0x7ff;
    const time = _v7LastMs.toString(16).padStart(12, "0");
    _v7Head = `${time.slice(0, 8)}-${time.slice(8)}-7`;
  } else {
    _v7Counter++;
  }
  return (
    `${_v7Head}${HEX[_v7Counter >> 8][1]}${HEX[_v7Counter & 0xff]}-${HEX[0x80 | (pool[at] & 0x3f)]}${HEX[pool[at + 1]]}-` +
    HEX[pool[at + 2]] + HEX[pool[at + 3]] + HEX[pool[at + 4]] + HEX[pool[at + 5]] + HEX[pool[at + 6]] + HEX[pool[at + 7]]
  );
}

let _ulidLastMs = -1;
let _ulidHead = "";
const _ulidRandom = new Uint8Array(16);

/**
 * @param {number} ms
 * @returns {string}
 */
const _ulidTime = (ms) => {
  let head = "";
  let left = ms;
  for (let i = 0; i < 10; i++) {
    head = CROCKFORD[left % 32] + head;
    left = Math.floor(left / 32);
  }
  return head;
};

/**
 * A ULID: 26 URL-safe characters that sort by creation time. Ids made in
 * the same millisecond still increase.
 *
 * @example
 * id.ulid();                     // "01HQ3Z8K9V3N5W7Y2XJ4T6R8PB"
 * id.ulid(Date.UTC(2024, 0, 1)); // for a given time
 *
 * @param {number | Date} [time] The moment to encode. Defaults to now.
 * @returns {string}
 * @throws {RangeError} If the time is not a valid timestamp.
 */
function ulid(time) {
  const given = _time(time, "ulid()");
  if (given !== undefined) {
    const at = _take(16);
    const pool = /** @type {Buffer} */ (_pool);
    let out = _ulidTime(given);
    for (let i = at; i < at + 16; i++) out += CROCKFORD[pool[i] & 31];
    return out;
  }
  const now = Date.now();
  if (now > _ulidLastMs) {
    _ulidLastMs = now;
    _ulidHead = _ulidTime(now);
    const at = _take(16);
    const pool = /** @type {Buffer} */ (_pool);
    for (let i = 0; i < 16; i++) _ulidRandom[i] = pool[at + i] & 31;
  } else {
    // Same millisecond, or the clock stepped back: count up from the last id.
    let i = 15;
    while (i >= 0 && _ulidRandom[i] === 31) _ulidRandom[i--] = 0;
    if (i < 0) throw new RangeError("ULID overflow: too many ids in the same millisecond");
    _ulidRandom[i]++;
  }
  let out = _ulidHead;
  for (let i = 0; i < 16; i++) out += CROCKFORD[_ulidRandom[i]];
  return out;
}

let _oidProcess = "";
let _oidCounter = 0;

/**
 * A MongoDB-style ObjectId: 24 hex characters that start with the time, in
 * seconds, and increase within the process.
 *
 * @example
 * id.objectId();                           // "65f2a9c47b1e4d0c9a3f2b10"
 * id.timestamp(id.objectId());             // when it was created, to the second
 * id.objectId(new Date("2024-01-01"));     // for a given time
 *
 * @param {number | Date} [time] The moment to encode. Defaults to now.
 * @returns {string}
 * @throws {RangeError} If the time is not a valid timestamp.
 */
function objectId(time) {
  if (!_oidProcess) {
    const at = _take(8);
    const pool = /** @type {Buffer} */ (_pool);
    for (let i = at; i < at + 5; i++) _oidProcess += HEX[pool[i]];
    _oidCounter = (pool[at + 5] << 16) | (pool[at + 6] << 8) | pool[at + 7];
  }
  const seconds = Math.floor((_time(time, "objectId()") ?? Date.now()) / 1000) % 2 ** 32;
  _oidCounter = (_oidCounter + 1) & 0xffffff;
  return seconds.toString(16).padStart(8, "0") + _oidProcess + HEX[_oidCounter >> 16] + HEX[(_oidCounter >> 8) & 0xff] + HEX[_oidCounter & 0xff];
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
  return _sampler(alphabet)(size);
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
  const sample = _sampler(alphabet);
  return (length = size) => sample(length);
}

/**
 * A random id with a prefix that says what it identifies, like Stripe's
 * `cus_...` and `sub_...`. A glance at a log line or a support ticket tells
 * you what kind of thing the id points to.
 *
 * @example
 * id.prefixed("user");      // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
 * id.prefixed("inv", 12);   // "inv_Q0f8ZrT1bK4m"
 *
 * @param {string} prefix
 * @param {number} [size=24] How many random characters come after the prefix (letters and digits).
 * @returns {string}
 */
function prefixed(prefix, size = 24) {
  if (typeof prefix !== "string" || !prefix) throw new TypeError("prefixed(): the prefix must be a non-empty string");
  return `${prefix}_${_sampler(BASE62_ALPHABET)(size)}`;
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
  _checkSize(bytes, "The number of bytes");
  // Tokens are secrets: their bytes never sit in the shared pool.
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
function code(length = 6, alphabet = CODE_ALPHABET) {
  return _sampler(alphabet)(length);
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
 * @throws {RangeError} If the epoch is in the future.
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
  if (!(now >= epoch)) throw new RangeError(`snowflake(): the epoch must be a timestamp in the past, got ${epoch}`);
  const low = (((options.workerId ?? 0) & 31) << 17) | (((options.processId ?? process.pid) & 31) << 12) | _snowflakeIncrement;
  return ((BigInt(now - epoch) << 22n) | BigInt(low)).toString();
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
 * @throws {TypeError} If the id is not a string of digits or a bigint.
 */
function parseSnowflake(id, options = {}) {
  if (typeof id !== "bigint" && !(typeof id === "string" && /^\d{1,20}$/.test(id))) {
    throw new TypeError(`parseSnowflake(): expected a string of digits or a bigint, got ${typeof id === "string" ? JSON.stringify(id) : typeof id}`);
  }
  const value = BigInt(id);
  if (value < 0n) throw new TypeError("parseSnowflake(): a Snowflake can't be negative");
  const low = Number(value & 0x3fffffn);
  const timestamp = Number(value >> 22n) + (options.epoch ?? DISCORD_EPOCH);
  return {
    date: new Date(timestamp),
    timestamp,
    workerId: (low >> 17) & 31,
    processId: (low >> 12) & 31,
    increment: low & 0xfff,
  };
}

/**
 * When a UUID v7, a ULID or an ObjectId was created.
 *
 * @example
 * id.timestamp(id.ulid());     // now
 * id.timestamp(id.objectId()); // now, to the second
 * id.timestamp(id.uuid());     // undefined, v4 has no time in it
 *
 * @param {string} value
 * @returns {Date | undefined}
 */
function timestamp(value) {
  const s = String(value);
  if (s.length === 36) return UUID_V7.test(s) ? new Date(parseInt(s.slice(0, 8) + s.slice(9, 13), 16)) : undefined;
  if (s.length === 24) return OBJECT_ID.test(s) ? new Date(parseInt(s.slice(0, 8), 16) * 1000) : undefined;
  if (s.length !== 26 || !ULID.test(s)) return undefined;
  let ms = 0;
  for (let i = 0; i < 10; i++) ms = ms * 32 + CROCKFORD.indexOf(s[i].toUpperCase());
  return new Date(ms);
}

/** @type {Map<string, number>} */
const _counters = new Map();

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
  const next = (_counters.get(prefix) ?? 0) + 1;
  _counters.set(prefix, next);
  return prefix ? `${prefix}-${next}` : String(next);
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
  return require("./Crypto.js").hash(value, options);
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
  return require("./Crypto.js").hmac(value, secret, options);
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
  return require("./Crypto.js").safeEqual(a, b);
}

module.exports = {
  uuid,
  uuidv5,
  uuidv7,
  ulid,
  objectId,
  nano,
  customAlphabet,
  prefixed,
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
