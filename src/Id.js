const crypto = require("node:crypto");

/**
 * ID, token & hashing utilities.
 *
 * Cryptographically-secure identifiers (UUID v4, ULID, nanoid-style tokens),
 * hashing helpers and constant-time comparison • all built on Node's native
 * `node:crypto`, with zero external dependencies.
 */

const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

/**
 * Per-prefix counters for {@link module:Id.seq}.
 * @private
 * @type {Record<string, number>}
 */
const _seqCounters = {};

/**
 * Fills a buffer with cryptographically secure random bytes.
 * @private
 * @param {number} size
 * @returns {Buffer}
 */
const _randomBytes = (size) => crypto.randomBytes(size);

/**
 * Encodes a buffer as Base58 using the Bitcoin alphabet.
 * @private
 * @param {Buffer} buffer - Bytes to encode.
 * @returns {string} The Base58 string.
 */
const _toBase58 = (buffer) => {
  if (buffer.length === 0) return "";
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
  let str = "";
  for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) str += BASE58_ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
};

module.exports = {
  /**
   * Generates a random UUID v4.
   *
   * @example
   * nodeComfort.id.uuid(); // "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
   *
   * @returns {string} A UUID v4 string.
   */
  uuid() {
    return crypto.randomUUID();
  },

  /**
   * Generates a URL-safe, collision-resistant ID (nanoid-compatible alphabet).
   *
   * Uses secure randomness with unbiased rejection sampling.
   *
   * @example
   * nodeComfort.id.nano();    // "V1StGXR8_Z5jdHi6B-myT"
   * nodeComfort.id.nano(10);  // "IRFa-VaY2b"
   *
   * @param {number} [size=21] - Desired length.
   * @param {string} [alphabet] - Custom alphabet.
   * @returns {string} The generated ID.
   */
  nano(size = 21, alphabet = NANOID_ALPHABET) {
    const len = alphabet.length;
    // Bitmask for unbiased sampling.
    const mask = (2 << Math.floor(Math.log2(len - 1))) - 1;
    const step = Math.ceil((1.6 * mask * size) / len);
    let id = "";
    while (id.length < size) {
      const bytes = _randomBytes(step);
      for (let i = 0; i < step && id.length < size; i++) {
        const index = bytes[i] & mask;
        if (index < len) id += alphabet[index];
      }
    }
    return id;
  },

  /**
   * Generates a ULID • a lexicographically-sortable, timestamp-prefixed ID.
   *
   * ULIDs sort by creation time and are a great primary-key alternative to UUIDs.
   *
   * @example
   * nodeComfort.id.ulid(); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
   *
   * @param {number} [time=Date.now()] - Timestamp in ms to encode.
   * @returns {string} A 26-character ULID.
   */
  ulid(time = Date.now()) {
    let timeChars = "";
    let t = time;
    for (let i = 0; i < 10; i++) {
      timeChars = ULID_ALPHABET[t % 32] + timeChars;
      t = Math.floor(t / 32);
    }

    const bytes = _randomBytes(16);
    let randChars = "";
    for (let i = 0; i < 16; i++) {
      randChars += ULID_ALPHABET[bytes[i] % 32];
    }
    return timeChars + randChars;
  },

  /**
   * Generates a cryptographically-secure random token.
   *
   * @example
   * nodeComfort.id.token();               // 32-byte hex string
   * nodeComfort.id.token(16, "base64url"); // 16 bytes, URL-safe base64
   *
   * @param {number} [bytes=32] - Number of random bytes.
   * @param {"hex"|"base64"|"base64url"|"base58"} [encoding="hex"] - Output encoding.
   * @returns {string} The token.
   */
  token(bytes = 32, encoding = "hex") {
    const buffer = _randomBytes(bytes);
    if (encoding === "base58") return _toBase58(buffer);
    return buffer.toString(encoding);
  },

  /**
   * Generates a short, human-friendly random code (uppercase + digits by default).
   *
   * Ambiguous characters (`0/O`, `1/I`) are excluded, making it suitable for
   * coupons, OTP-like codes and invite links.
   *
   * @example
   * nodeComfort.id.code();            // "K7QF9X"
   * nodeComfort.id.code(4, "1234");   // "3142"
   *
   * @param {number} [length=6] - Number of characters.
   * @param {string} [alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"] - Characters to pick from.
   * @returns {string} The random code.
   */
  code(length = 6, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
    const bytes = _randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  },

  /**
   * Hashes a value with a chosen algorithm.
   *
   * @example
   * nodeComfort.id.hash("hello");                  // sha256 hex
   * nodeComfort.id.hash("hello", { algorithm: "md5" });
   *
   * @param {string|Buffer} value - Data to hash.
   * @param {{ algorithm?: string, encoding?: "hex"|"base64"|"base64url" }} [options] - Hash options.
   * @returns {string} The digest.
   */
  hash(value, options = {}) {
    const algorithm = options.algorithm ?? "sha256";
    const encoding = options.encoding ?? "hex";
    return crypto.createHash(algorithm).update(value).digest(encoding);
  },

  /**
   * Computes an HMAC signature for a value using a secret key.
   *
   * @example
   * nodeComfort.id.hmac("payload", "secret"); // sha256 HMAC hex
   *
   * @param {string|Buffer} value - Data to sign.
   * @param {string|Buffer} secret - Secret key.
   * @param {{ algorithm?: string, encoding?: "hex"|"base64"|"base64url" }} [options] - HMAC options.
   * @returns {string} The signature.
   */
  hmac(value, secret, options = {}) {
    const algorithm = options.algorithm ?? "sha256";
    const encoding = options.encoding ?? "hex";
    return crypto.createHmac(algorithm, secret).update(value).digest(encoding);
  },

  /**
   * Compares two strings/buffers in constant time to prevent timing attacks.
   *
   * Use this when comparing secrets, tokens, or signatures.
   *
   * @example
   * if (nodeComfort.id.safeEqual(provided, expected)) { ... }
   *
   * @param {string|Buffer} a - First value.
   * @param {string|Buffer} b - Second value.
   * @returns {boolean} True if equal.
   */
  safeEqual(a, b) {
    const bufA = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
    const bufB = Buffer.isBuffer(b) ? b : Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  },

  /**
   * Returns a monotonically-increasing counter ID prefixed with an optional label.
   *
   * Useful for readable, unique keys within a single process run.
   *
   * @example
   * nodeComfort.id.seq("user"); // "user-1"
   * nodeComfort.id.seq("user"); // "user-2"
   *
   * @param {string} [prefix=""] - Optional prefix.
   * @returns {string} The sequential ID.
   */
  seq(prefix = "") {
    _seqCounters[prefix] = (_seqCounters[prefix] ?? 0) + 1;
    return prefix ? `${prefix}-${_seqCounters[prefix]}` : String(_seqCounters[prefix]);
  },
};
