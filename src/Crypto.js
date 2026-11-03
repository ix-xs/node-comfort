"use strict";

/**
 * Crypto without the footguns, built on `node:crypto`: hashes, HMAC,
 * password hashing (scrypt or Argon2id), encryption (AES-256-GCM), JWT,
 * two-factor codes (TOTP) and secure random values.
 *
 * @example
 * const stored = await crypto.hashPassword("hunter2");
 * await crypto.verifyPassword("hunter2", stored); // true
 *
 * const token = crypto.signJWT({ sub: user.id }, SECRET, { expiresIn: "1h" });
 * const claims = crypto.verifyJWT(token, SECRET);
 */

const { types } = require("node:util");
const { JWTError, NodeComfortError } = require("./errors.js");
const { toMs } = require("./internal/shared.js");

/** @type {typeof import("node:crypto") | undefined} */
let _nodeCrypto;
// node:crypto takes a few milliseconds to initialize: load it on first use.
const _crypto = () => (_nodeCrypto ??= require("node:crypto"));

/**
 * @param {import("node:crypto").BinaryLike} password
 * @param {import("node:crypto").BinaryLike} salt
 * @param {number} keylen
 * @param {import("node:crypto").ScryptOptions} options
 * @returns {Promise<Buffer>}
 */
const _scrypt = (password, salt, keylen, options) =>
  new Promise((resolve, reject) => {
    _crypto().scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key)));
  });

/** `crypto.argon2` only exists since Node.js 24.7. */
const _hasArgon2 = () => typeof (/** @type {any} */ (_crypto()).argon2) === "function";

/** @param {string} what */
const _noArgon2 = (what) =>
  new NodeComfortError(`${what} needs Node.js 24.7 or later, this is Node.js ${process.versions.node}`, { code: "ERR_ARGON2_UNAVAILABLE" });

/**
 * @param {"argon2id" | "argon2i" | "argon2d"} algorithm
 * @param {string} password
 * @param {Buffer} salt
 * @param {number} keylen
 * @param {{ memory: number, passes: number, parallelism: number }} cost
 * @returns {Promise<Buffer>}
 */
const _argon2 = (algorithm, password, salt, keylen, cost) =>
  new Promise((resolve, reject) => {
    const params = { message: password, nonce: salt, tagLength: keylen, memory: cost.memory, passes: cost.passes, parallelism: cost.parallelism };
    /** @type {any} */ (_crypto()).argon2(algorithm, params, (/** @type {Error | null} */ error, /** @type {Buffer} */ key) => (error ? reject(error) : resolve(key)));
  });

/**
 * Text encodings for digests.
 * @typedef {"hex" | "base64" | "base64url"} DigestEncoding
 */

/**
 * Options for `hash()` and `hmac()`.
 * @typedef {object} HashOptions
 * @property {"sha256" | "sha384" | "sha512" | "sha1" | "md5" | "sha3-256" | "sha3-512" | (string & {})} [algorithm] Any algorithm OpenSSL supports. Defaults to `"sha256"`.
 * @property {DigestEncoding} [encoding] Defaults to `"hex"`.
 */

/**
 * Options for `hashPassword()` and `needsRehash()`.
 * @typedef {object} HashPasswordOptions
 * @property {"scrypt" | "argon2id"} [algorithm] Defaults to `"scrypt"`, which every supported Node.js version can verify. `"argon2id"` needs Node.js 24.7 or later, to hash and to verify.
 * @property {number} [cost] scrypt work factor as a power of two; each +1 doubles the time. Defaults to `15`.
 * @property {number} [blockSize] scrypt `r`. Defaults to `8`.
 * @property {number} [parallelization] scrypt `p`, at most `16`. Defaults to `1`.
 * @property {number} [memory] Argon2id memory, in KiB, at most `1048576` (1 GiB). Defaults to `19456` (19 MiB), as OWASP recommends.
 * @property {number} [passes] Argon2id passes over the memory (`t`), from `1` to `10`. Defaults to `2`.
 * @property {number} [parallelism] Argon2id lanes (`p`), from `1` to `16`. Defaults to `1`.
 * @property {number} [saltLength] In bytes, at least `8`. Defaults to `16`.
 * @property {number} [keyLength] In bytes, from `16` to `128`. Defaults to `32`.
 */

/**
 * Options for `encrypt()`.
 * @typedef {object} EncryptOptions
 * @property {string | Buffer} [associatedData] Data that's authenticated but not encrypted, like a user id. Pass the same value to `decrypt()`.
 */

/**
 * Options for `decrypt()`.
 * @typedef {object} DecryptOptions
 * @property {string | Buffer} [associatedData] The value given to `encrypt()`, if any.
 * @property {"utf8" | "buffer"} [output] Get a string or a `Buffer`. Defaults to `"utf8"`.
 */

/**
 * A key for `signJWT()` and `verifyJWT()`. For the HS algorithms it's a
 * shared secret. For the others it's a key pair: a PEM string, a
 * `KeyObject` or a JWK, private to sign and public to verify.
 * @typedef {string | Buffer | Uint8Array | import("node:crypto").KeyObject | import("node:crypto").JsonWebKey} JWTKey
 */

/**
 * A pair of keys in PEM, as made by `generateKeyPair()`.
 * @typedef {object} KeyPair
 * @property {string} publicKey Give this one away: it only checks signatures.
 * @property {string} privateKey Keep this one secret: it signs.
 */

/**
 * Standard JWT claims.
 * @typedef {object} JWTClaims
 * @property {string} [iss] Issuer.
 * @property {string} [sub] Subject, usually the user id.
 * @property {string | string[]} [aud] Audience.
 * @property {number} [exp] Expiry, in Unix seconds.
 * @property {number} [nbf] Not valid before, in Unix seconds.
 * @property {number} [iat] Issued at, in Unix seconds.
 * @property {string} [jti] Unique token id.
 */

/**
 * Supported JWT algorithms. HS signs and verifies with one shared secret.
 * RS, PS, ES and EdDSA sign with a private key and verify with the public
 * one, so services that only check tokens never hold the signing key.
 * @typedef {"HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "PS256" | "PS384" | "PS512" | "ES256" | "ES384" | "ES512" | "EdDSA"} JWTAlgorithm
 */

/**
 * Options for `signJWT()`.
 * @typedef {object} SignJWTOptions
 * @property {JWTAlgorithm} [algorithm] Defaults to what fits the key: `"HS256"` for a secret, `"RS256"` for an RSA key, `"ES256"` for a P-256 key, `"EdDSA"` for an Ed25519 key.
 * @property {string | number} [expiresIn] Lifetime in seconds or as a duration like `"15m"`. Sets `exp`.
 * @property {string | number} [notBefore] Delay before the token is valid. Sets `nbf`.
 * @property {string} [issuer] Sets `iss`.
 * @property {string} [subject] Sets `sub`.
 * @property {string | string[]} [audience] Sets `aud`.
 * @property {string} [jwtId] Sets `jti`, handy for revocation lists.
 * @property {boolean} [noTimestamp] Don't add `iat`.
 * @property {Record<string, unknown>} [header] Extra header fields, like `{ kid: "2024-key" }`.
 */

/**
 * Options for `verifyJWT()`.
 * @typedef {object} VerifyJWTOptions
 * @property {JWTAlgorithm[]} [algorithms] Accepted algorithms. Defaults to the ones that fit the key, so a token can't pick a weaker one.
 * @property {string | string[]} [issuer] Required issuer.
 * @property {string | string[]} [audience] Required audience; one match is enough.
 * @property {string} [subject] Required subject.
 * @property {number | string} [clockTolerance] Slack for `exp` and `nbf` when server clocks differ: seconds (`0` or more) or a duration like `"30s"`. Defaults to `0`.
 * @property {string | number} [maxAge] Reject tokens issued longer ago than this.
 * @property {boolean} [ignoreExpiration] Skip the `exp` check.
 * @property {Date | number} [now] What time it is, as a `Date` or Unix milliseconds. Defaults to now. Handy in tests.
 * @property {string} [typ] Required `typ` header, like `"at+jwt"` for OAuth access tokens. Compared ignoring case, with or without `application/`. A token with another `typ`, or none, is refused.
 * @property {string[]} [crit] Header extensions your code understands. A token whose `crit` header lists anything else is refused, as RFC 7515 requires.
 */

/**
 * A decoded JWT.
 * @template [P=Record<string, unknown>]
 * @typedef {object} DecodedJWT
 * @property {{ alg: string, typ?: string, [key: string]: unknown }} header
 * @property {P & JWTClaims} payload
 * @property {string} signature Base64URL.
 */

/**
 * Options for `totp()` and `verifyTOTP()`.
 * @typedef {object} TOTPOptions
 * @property {number} [digits] Defaults to `6`.
 * @property {number} [period] How long a code lasts, in seconds. Defaults to `30`.
 * @property {"SHA1" | "SHA256" | "SHA512"} [algorithm] Defaults to `"SHA1"`, which is what authenticator apps expect.
 * @property {Date | number} [time] Compute the code for this moment, as a `Date` or Unix milliseconds. Defaults to now.
 */

/**
 * Options for `verifyTOTP()` and `totpStep()`.
 * @typedef {object} VerifyTOTPOptions
 * @property {number} [digits] Defaults to `6`.
 * @property {number} [period] How long a code lasts, in seconds. Defaults to `30`.
 * @property {"SHA1" | "SHA256" | "SHA512"} [algorithm] Defaults to `"SHA1"`, which is what authenticator apps expect.
 * @property {Date | number} [time] Check the code at this moment, as a `Date` or Unix milliseconds. Defaults to now.
 * @property {number} [window] How many periods before and after now are accepted, from `0` to `10`. Defaults to `1`.
 * @property {number} [after] The time step of the last code you accepted, from `totpStep()`. Codes from that step or an earlier one are refused, so a code can't be used twice.
 */

/**
 * Options for `totpURI()`.
 * @typedef {object} TOTPURIOptions
 * @property {string} label The account shown in the app, usually the email.
 * @property {string} [issuer] Your app's name.
 * @property {number} [digits] Defaults to `6`.
 * @property {number} [period] Defaults to `30`.
 * @property {"SHA1" | "SHA256" | "SHA512"} [algorithm] Defaults to `"SHA1"`.
 */

const _BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * @param {Buffer} buffer
 * @returns {string}
 */
const _base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += _BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += _BASE32[(value << (5 - bits)) & 31];
  return out;
};

/**
 * @param {string} text
 * @returns {Buffer}
 */
const _base32Decode = (text) => {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of clean) {
    const index = _BASE32.indexOf(char);
    if (index === -1) throw new TypeError(`Invalid Base32 character "${char}"`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

/**
 * @param {unknown} data
 * @returns {Buffer | undefined} `undefined` for what has no obvious bytes: `null`, objects...
 */
const _maybeBuffer = (data) => {
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (Buffer.isBuffer(data)) return data;
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (types.isAnyArrayBuffer(data)) return Buffer.from(data);
  if (typeof data === "number" || typeof data === "bigint") return Buffer.from(String(data), "utf8");
  return undefined;
};

/**
 * @param {unknown} data
 * @param {string} [what]
 * @returns {Buffer}
 */
const _toBuffer = (data, what = "the data") => {
  const buffer = _maybeBuffer(data);
  // Hashing "undefined" because a variable was missing is how secrets end up guessable.
  if (!buffer) throw new TypeError(`Expected ${what} to be a string, a Buffer or a Uint8Array, got ${data === null ? "null" : typeof data}`);
  return buffer;
};

/**
 * @param {unknown} secret
 * @param {string} what
 * @returns {Buffer}
 */
const _secret = (secret, what) => {
  const buffer = _toBuffer(secret, what);
  if (!buffer.length) throw new TypeError(`Expected ${what} not to be empty`);
  return buffer;
};

/**
 * @param {string | number} value
 * @param {string} what
 * @returns {number}
 */
const _seconds = (value, what) => {
  const seconds = typeof value === "number" ? value : Math.round(toMs(value, what) / 1000);
  if (!Number.isFinite(seconds)) throw new TypeError(`Invalid ${what}: ${String(value)}`);
  return seconds;
};

/**
 * @param {Date | number | undefined} value
 * @param {string} what
 * @returns {number} Milliseconds.
 */
const _now = (value, what) => {
  if (value === undefined) return Date.now();
  const ms = value instanceof Date || typeof value === "number" ? +value : NaN;
  // NaN would make every time comparison false, and so skip the expiry checks.
  if (!Number.isFinite(ms)) throw new TypeError(`Invalid ${what}: expected a valid Date or Unix milliseconds, got ${String(value)}`);
  return ms;
};

/**
 * Hashes data, SHA-256 in hex by default.
 *
 * @example
 * crypto.hash("hello");
 * crypto.hash("hello", { algorithm: "sha512", encoding: "base64url" });
 *
 * @param {string | Buffer | Uint8Array} data Strings are read as UTF-8.
 * @param {HashOptions} [options]
 * @returns {string}
 */
function hash(data, options = {}) {
  return _crypto().hash(options.algorithm ?? "sha256", typeof data === "string" ? data : _toBuffer(data), options.encoding ?? "hex");
}

/**
 * An HMAC signature: a hash keyed with a secret. The usual way to sign and
 * check webhooks.
 *
 * @example
 * const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET);
 * crypto.safeEqual(signature, req.headers["x-signature"]);
 *
 * @param {string | Buffer | Uint8Array} data
 * @param {string | Buffer | Uint8Array} secret
 * @param {HashOptions} [options]
 * @returns {string}
 */
function hmac(data, secret, options = {}) {
  return _crypto()
    .createHmac(options.algorithm ?? "sha256", _secret(secret, "the secret"))
    .update(typeof data === "string" ? data : _toBuffer(data))
    .digest(options.encoding ?? "hex");
}

/**
 * Checks an HMAC signature you received, in constant time. A leading
 * `sha256=`, as GitHub and others send, is ignored.
 *
 * @example
 * // an Express webhook route: sign the raw body, not the parsed JSON
 * if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
 *   return res.status(401).end();
 * }
 *
 * @param {string | Buffer | Uint8Array} data
 * @param {unknown} signature What the sender computed. Anything but a matching string gives `false`.
 * @param {string | Buffer | Uint8Array} secret
 * @param {HashOptions} [options] Must match what the sender used.
 * @returns {boolean}
 */
function verifyHmac(data, signature, secret, options = {}) {
  const expected = hmac(data, secret, options);
  if (typeof signature !== "string") return false;
  const given = signature.replace(/^sha(?:1|256|384|512)=/i, "");
  return safeEqual(expected, (options.encoding ?? "hex") === "hex" ? given.toLowerCase() : given);
}

/**
 * Compares two secrets in constant time, so the comparison can't leak
 * anything through timing, not even their lengths. Use it instead of `===`
 * for tokens, signatures and API keys. A missing value (`undefined`, `null`)
 * or an empty one (`""`) never equals anything, not even another empty
 * value, so an unset secret can't match an empty header.
 *
 * @example
 * if (!crypto.safeEqual(providedKey, process.env.API_KEY)) throw new Error("Forbidden");
 *
 * @param {string | Buffer | Uint8Array} a
 * @param {string | Buffer | Uint8Array} b
 * @returns {boolean} `false` when either side is missing or empty.
 */
function safeEqual(a, b) {
  const x = _maybeBuffer(a);
  const y = _maybeBuffer(b);
  if (!x?.length || !y?.length) return false;
  const crypto = _crypto();
  // Digests have one length, whatever went in.
  return crypto.timingSafeEqual(crypto.hash("sha256", x, "buffer"), crypto.hash("sha256", y, "buffer"));
}

const _SCRYPT_HASH = /^\$scrypt\$ln=(\d{1,2}),r=(\d{1,4}),p=(\d{1,4})\$([\w-]+)\$([\w-]+)$/;
// The PHC string of the Argon2 reference implementation: standard Base64, no padding.
const _ARGON2_HASH = /^\$(argon2id|argon2i|argon2d)\$v=19\$m=(\d{1,8}),t=(\d{1,3}),p=(\d{1,3})\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;
// Past 1 GiB of memory, or 2**30 bytes of total scrypt work (32 times the default cost), it's a
// mistake, or a doctored hash meant to stall the server.
const _MAX_MEMORY = 2 ** 30;
const _ARGON2_DEFAULTS = { memory: 19456, passes: 2, parallelism: 1 };

/**
 * @param {number} ln
 * @param {number} r
 * @param {number} p
 * @returns {import("node:crypto").ScryptOptions | "invalid" | "too costly"}
 */
const _scryptOptions = (ln, r, p) => {
  if (![ln, r, p].every(Number.isInteger) || ln < 1 || r < 1 || p < 1) return "invalid";
  const N = 2 ** ln;
  // Version 2.1 never made nor accepted more than this, so such a hash is broken, not merely costly.
  if (p > 1024 || 128 * N * r > _MAX_MEMORY) return "invalid";
  // Each lane needs 128 * N * r bytes, and the lanes run one after the other.
  if (p > 16 || 128 * N * r * p > _MAX_MEMORY) return "too costly";
  return { N, r, p, maxmem: 256 * N * r + 128 * r * p + 1024 * 1024 };
};

/**
 * @param {number} memory In KiB.
 * @param {number} passes
 * @param {number} parallelism
 * @returns {"ok" | "invalid" | "too costly"}
 */
const _argon2Cost = (memory, passes, parallelism) => {
  if (![memory, passes, parallelism].every(Number.isInteger) || parallelism < 1 || passes < 1 || memory < 8 * parallelism) return "invalid";
  return parallelism > 16 || passes > 10 || memory * 1024 > _MAX_MEMORY ? "too costly" : "ok";
};

/**
 * A stored hash over the limits is refused without doing the work, but not
 * with `false`: the password may well be right, the hash has to be replaced.
 * @param {string} settings
 * @param {string} limits
 */
const _tooCostly = (settings, limits) =>
  new RangeError(`verifyPassword(): this hash asks for more work than allowed (${settings}, the limits are ${limits}). It isn't a wrong password: rehash it with hashPassword() and settings within the limits`);

/** @param {Buffer} buffer */
const _phcBase64 = (buffer) => buffer.toString("base64").replace(/=+$/, "");

/**
 * Hashes a password with a random salt: scrypt by default, or Argon2id. The
 * result records its own settings, so you can raise the cost, or move to
 * Argon2id, later without breaking old hashes.
 *
 * Argon2id hashes are standard PHC strings, readable by the other Argon2
 * libraries. Hashing and verifying them needs Node.js 24.7 or later; scrypt
 * works on every supported version.
 *
 * @example
 * const stored = await crypto.hashPassword(password);
 * // "$scrypt$ln=15,r=8,p=1$4xY...$kq9...", store this
 *
 * const modern = await crypto.hashPassword(password, { algorithm: "argon2id" });
 * // "$argon2id$v=19$m=19456,t=2,p=1$Zm9v...$YmFy..."
 *
 * @param {string} password
 * @param {HashPasswordOptions} [options]
 * @returns {Promise<string>}
 * @throws {RangeError} If the settings are out of bounds, like a cost that needs more than 1 GiB of memory.
 * @throws {NodeComfortError} With code `ERR_ARGON2_UNAVAILABLE` for `"argon2id"` on a Node.js older than 24.7.
 */
async function hashPassword(password, options = {}) {
  if (typeof password !== "string") throw new TypeError(`hashPassword(): expected the password to be a string, got ${password === null ? "null" : typeof password}`);
  const algorithm = options.algorithm ?? "scrypt";
  if (algorithm !== "scrypt" && algorithm !== "argon2id") throw new TypeError(`hashPassword(): expected the algorithm "scrypt" or "argon2id", got ${JSON.stringify(algorithm) ?? String(algorithm)}`);
  const saltLength = options.saltLength ?? 16;
  const keyLength = options.keyLength ?? 32;
  if (!Number.isInteger(saltLength) || saltLength < 8) throw new RangeError("hashPassword(): saltLength must be at least 8 bytes");
  if (!Number.isInteger(keyLength) || keyLength < 16 || keyLength > 128) throw new RangeError("hashPassword(): keyLength must be between 16 and 128 bytes");

  if (algorithm === "argon2id") {
    if (!_hasArgon2()) throw _noArgon2("hashPassword(): Argon2id");
    const memory = options.memory ?? _ARGON2_DEFAULTS.memory;
    const passes = options.passes ?? _ARGON2_DEFAULTS.passes;
    const parallelism = options.parallelism ?? _ARGON2_DEFAULTS.parallelism;
    if (_argon2Cost(memory, passes, parallelism) !== "ok") {
      throw new RangeError(`hashPassword(): memory ${memory} KiB, passes ${passes}, parallelism ${parallelism} is out of bounds (memory up to 1048576 KiB and at least 8 per lane, passes 1 to 10, parallelism 1 to 16)`);
    }
    const salt = _crypto().randomBytes(saltLength);
    const key = await _argon2("argon2id", password.normalize("NFKC"), salt, keyLength, { memory, passes, parallelism });
    return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${_phcBase64(salt)}$${_phcBase64(key)}`;
  }

  const ln = options.cost ?? 15;
  const r = options.blockSize ?? 8;
  const p = options.parallelization ?? 1;
  const scrypt = _scryptOptions(ln, r, p);
  if (typeof scrypt === "string") throw new RangeError(`hashPassword(): cost ${ln}, blockSize ${r}, parallelization ${p} is out of bounds`);
  const salt = _crypto().randomBytes(saltLength);
  const key = await _scrypt(password.normalize("NFKC"), salt, keyLength, scrypt);
  return `$scrypt$ln=${ln},r=${r},p=${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/**
 * Checks a password against a stored hash, in constant time: scrypt hashes
 * from `hashPassword()`, and Argon2 PHC strings (`$argon2id$`, `$argon2i$`,
 * `$argon2d$`) from here or from another library. A wrong password or a
 * broken hash gives `false`. A hash asking for more work than allowed (more
 * than 1 GiB of memory, for instance) throws instead, without doing that
 * work: a doctored hash would stall the server that way, and a genuine one
 * isn't a wrong password but a hash to replace.
 *
 * @example
 * if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
 *
 * @param {string} password
 * @param {string} stored
 * @returns {Promise<boolean>}
 * @throws {RangeError} If the hash asks for more work than allowed: scrypt with `p` over 16 or `128 * N * r * p` over 2**30 bytes (up to what version 2.1 accepted: past that, the hash is broken and gives `false`), Argon2 with more than 1 GiB of memory, 10 passes or 16 lanes. Rehash such passwords with settings within these limits.
 * @throws {NodeComfortError} With code `ERR_ARGON2_UNAVAILABLE` if the hash is Argon2 and this Node.js is older than 24.7. That is a deployment problem, not a wrong password, so it isn't hidden behind `false`.
 */
async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;
  if (/^\$argon2(?:id|i|d)\$/.test(stored)) {
    if (!_hasArgon2()) throw _noArgon2("verifyPassword(): this hash uses Argon2, which");
    const match = _ARGON2_HASH.exec(stored);
    if (!match) return false;
    const [memory, passes, parallelism] = [Number(match[2]), Number(match[3]), Number(match[4])];
    const salt = Buffer.from(match[5], "base64");
    const expected = Buffer.from(match[6], "base64");
    const cost = _argon2Cost(memory, passes, parallelism);
    if (cost === "invalid" || salt.length < 8 || expected.length < 16 || expected.length > 128) return false;
    if (cost === "too costly") throw _tooCostly(`${match[1]} m=${memory},t=${passes},p=${parallelism}`, "m up to 1048576 KiB, t up to 10 and p up to 16");
    try {
      const actual = await _argon2(/** @type {"argon2id" | "argon2i" | "argon2d"} */ (match[1]), password.normalize("NFKC"), salt, expected.length, { memory, passes, parallelism });
      return _crypto().timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
  const match = _SCRYPT_HASH.exec(stored);
  if (!match) return false;
  const scrypt = _scryptOptions(Number(match[1]), Number(match[2]), Number(match[3]));
  const salt = Buffer.from(match[4], "base64url");
  const expected = Buffer.from(match[5], "base64url");
  // A key cut short would let some wrong passwords match.
  if (scrypt === "invalid" || salt.length < 8 || expected.length < 16 || expected.length > 128) return false;
  if (scrypt === "too costly") throw _tooCostly(`scrypt ln=${match[1]},r=${match[2]},p=${match[3]}`, "p up to 16 and 128 * N * r * p up to 2**30 bytes");
  try {
    const actual = await _scrypt(password.normalize("NFKC"), salt, expected.length, scrypt);
    return _crypto().timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Was this hash made with another algorithm, or with weaker settings than
 * yours (lower cost, a key under 32 bytes, a salt under 16)? If so, re-hash
 * the password right after a successful login.
 *
 * @example
 * if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { cost: 16 })) {
 *   user.hash = await crypto.hashPassword(input, { cost: 16 });
 * }
 *
 * // moving everyone to Argon2id, one login at a time
 * if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { algorithm: "argon2id" })) {
 *   user.hash = await crypto.hashPassword(input, { algorithm: "argon2id" });
 * }
 *
 * @param {string} stored
 * @param {HashPasswordOptions} [options] The settings you use today. `algorithm` defaults to `"scrypt"`.
 * @returns {boolean}
 */
function needsRehash(stored, options = {}) {
  const text = String(stored);
  const algorithm = options.algorithm ?? "scrypt";
  const keyLength = options.keyLength ?? 32;
  const saltLength = options.saltLength ?? 16;
  const argon2 = _ARGON2_HASH.exec(text);
  if (argon2) {
    if (argon2[1] !== algorithm) return true;
    return (
      Number(argon2[2]) < (options.memory ?? _ARGON2_DEFAULTS.memory) ||
      Number(argon2[3]) < (options.passes ?? _ARGON2_DEFAULTS.passes) ||
      Number(argon2[4]) < (options.parallelism ?? _ARGON2_DEFAULTS.parallelism) ||
      Buffer.from(argon2[5], "base64").length < saltLength ||
      Buffer.from(argon2[6], "base64").length < keyLength
    );
  }
  const match = _SCRYPT_HASH.exec(text);
  if (!match || algorithm !== "scrypt") return true;
  return (
    Number(match[1]) < (options.cost ?? 15) ||
    Number(match[2]) < (options.blockSize ?? 8) ||
    Number(match[3]) < (options.parallelization ?? 1) ||
    Buffer.from(match[4], "base64url").length < saltLength ||
    Buffer.from(match[5], "base64url").length < keyLength
  );
}

/**
 * A random 256-bit key for `encrypt()`, as text you can put in an
 * environment variable.
 *
 * @returns {string}
 */
function generateKey() {
  return _crypto().randomBytes(32).toString("base64url");
}

/**
 * @param {string | Buffer | Uint8Array} secret
 * @param {Buffer} salt
 * @returns {Buffer}
 */
const _deriveKey = (secret, salt) => {
  const raw = typeof secret === "string" && /^[A-Za-z0-9_-]{43}$/.test(secret) ? Buffer.from(secret, "base64url") : _secret(secret, "the encryption secret");
  return Buffer.from(_crypto().hkdfSync("sha256", raw, salt, "node-comfort:aes-256-gcm", 32));
};

/**
 * Encrypts data with AES-256-GCM, which also detects tampering. Every call
 * uses a fresh salt and nonce, so the same text never encrypts the same way
 * twice.
 *
 * Use a key from `generateKey()` or another long random secret, not a
 * password someone typed: that would be easy to brute-force.
 *
 * @example
 * const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
 * const card = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY));
 *
 * @param {string | Buffer | Uint8Array} data
 * @param {string | Buffer | Uint8Array} secret
 * @param {EncryptOptions} [options]
 * @returns {string} A compact, URL-safe string.
 */
function encrypt(data, secret, options = {}) {
  const crypto = _crypto();
  const salt = crypto.randomBytes(28);
  const iv = salt.subarray(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", _deriveKey(secret, salt.subarray(0, 16)), iv);
  if (options.associatedData !== undefined) cipher.setAAD(_toBuffer(options.associatedData, "associatedData"));
  const head = cipher.update(_toBuffer(data));
  const tail = cipher.final();
  const encrypted = tail.length ? Buffer.concat([head, tail]) : head;
  return `v1.${salt.toString("base64url", 0, 16)}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

/**
 * Decrypts what `encrypt()` produced. Throws an error with code
 * `ERR_DECRYPT` if the secret is wrong or the data was changed.
 *
 * @example
 * const text = crypto.decrypt(box, SECRET);
 * const bytes = crypto.decrypt(box, SECRET, { output: "buffer" });
 *
 * @overload
 * @param {string} payload
 * @param {string | Buffer | Uint8Array} secret
 * @param {DecryptOptions & { output: "buffer" }} options
 * @returns {Buffer}
 */
/**
 * Decrypts what `encrypt()` produced, as text.
 *
 * @overload
 * @param {string} payload
 * @param {string | Buffer | Uint8Array} secret
 * @param {DecryptOptions} [options]
 * @returns {string}
 */
/**
 * @param {string} payload
 * @param {string | Buffer | Uint8Array} secret
 * @param {DecryptOptions} [options]
 * @returns {string | Buffer}
 * @throws {NodeComfortError} With code `ERR_DECRYPT` if the secret is wrong or the payload was modified.
 */
function decrypt(payload, secret, options = {}) {
  const parts = typeof payload === "string" ? payload.split(".") : [];
  const [salt, iv, tag, encrypted] = parts.slice(1).map((part) => Buffer.from(part, "base64url"));
  // A tag cut short is far easier to forge, so only whole ones are read.
  if (parts.length !== 5 || parts[0] !== "v1" || salt.length !== 16 || iv.length !== 12 || tag.length !== 16) {
    throw new NodeComfortError("Unable to decrypt: this isn't something encrypt() produced", { code: "ERR_DECRYPT" });
  }
  const key = _deriveKey(secret, salt);
  const associated = options.associatedData === undefined ? undefined : _toBuffer(options.associatedData, "associatedData");
  let decrypted;
  try {
    const decipher = _crypto().createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    if (associated) decipher.setAAD(associated);
    decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (error) {
    throw new NodeComfortError("Unable to decrypt: wrong secret or tampered data", { code: "ERR_DECRYPT", cause: error });
  }
  return options.output === "buffer" ? decrypted : decrypted.toString("utf8");
}

/** @type {readonly JWTAlgorithm[]} */
const _HS = ["HS256", "HS384", "HS512"];
/** @type {Record<string, JWTAlgorithm>} */
const _CURVE_ALGORITHMS = { prime256v1: "ES256", secp384r1: "ES384", secp521r1: "ES512" };
/** @type {Record<string, string>} */
const _ALGORITHM_CURVES = { ES256: "prime256v1", ES384: "secp384r1", ES512: "secp521r1" };

/**
 * A key, ready to use, with the algorithms it may be used with.
 * @typedef {{ secret: Buffer, key?: undefined, algorithms: readonly JWTAlgorithm[] } | { secret?: undefined, key: import("node:crypto").KeyObject, algorithms: readonly JWTAlgorithm[] }} _ResolvedKey
 */

/**
 * @param {string} message
 * @param {unknown} [cause]
 */
const _keyError = (message, cause) => new TypeError(message, { cause });

/**
 * @param {import("node:crypto").KeyObject} key
 * @returns {_ResolvedKey}
 */
const _asymmetric = (key) => {
  const type = key.asymmetricKeyType;
  if (type === "rsa" || type === "rsa-pss") {
    if ((key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw _keyError("RSA keys must be at least 2048 bits long");
    return { key, algorithms: type === "rsa" ? ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512"] : ["PS256", "PS384", "PS512"] };
  }
  if (type === "ec") {
    const algorithm = _CURVE_ALGORITHMS[key.asymmetricKeyDetails?.namedCurve ?? ""];
    if (!algorithm) throw _keyError(`Unsupported curve "${key.asymmetricKeyDetails?.namedCurve}": use P-256, P-384 or P-521`);
    return { key, algorithms: [algorithm] };
  }
  if (type === "ed25519" || type === "ed448") return { key, algorithms: ["EdDSA"] };
  throw _keyError(`Unsupported key type "${type}"`);
};

/**
 * PEM text, as a string or bytes, ready for `createPublicKey()`. A BOM or an
 * OpenSSL preamble ("Bag Attributes", "subject=") can come before the
 * `-----BEGIN` line, so it's looked for anywhere.
 * @param {unknown} key
 * @returns {string | Buffer | undefined} `undefined` if it isn't PEM.
 */
const _pem = (key) => {
  if (typeof key === "string") return key.includes("-----BEGIN") ? key.replace(/^﻿/, "") : undefined;
  if (!ArrayBuffer.isView(key) && !types.isAnyArrayBuffer(key)) return undefined;
  const buffer = /** @type {Buffer} */ (_maybeBuffer(key));
  if (!buffer.includes("-----BEGIN")) return undefined;
  return buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf ? buffer.subarray(3) : buffer;
};

/** @type {[keyof Pick<typeof import("node:crypto"), "createPublicKey" | "createPrivateKey">, string][]} */
const _DER_TYPES = [
  ["createPublicKey", "spki"],
  ["createPublicKey", "pkcs1"],
  ["createPrivateKey", "pkcs8"],
  ["createPrivateKey", "pkcs1"],
  ["createPrivateKey", "sec1"],
];

/**
 * Does this read as a public or private key, in DER?
 * @param {Buffer} bytes
 * @returns {boolean}
 */
const _isDER = (bytes) => {
  // Every DER key is an ASN.1 SEQUENCE, so anything else is skipped for free.
  if (bytes[0] !== 0x30) return false;
  const crypto = _crypto();
  for (const [create, type] of _DER_TYPES) {
    try {
      crypto[create](/** @type {any} */ ({ key: bytes, format: "der", type }));
      return true;
    } catch {}
  }
  return false;
};

/**
 * Is this text a JWK in JSON, an object with a `kty` member?
 * @param {string} text
 * @returns {boolean}
 */
const _isJWKText = (text) => {
  const json = text.replace(/^﻿/, "").trim();
  if (json[0] !== "{") return false;
  try {
    const value = JSON.parse(json);
    return value !== null && typeof value === "object" && Object.hasOwn(value, "kty");
  } catch {
    return false;
  }
};

/**
 * Checks a shared secret before HMAC uses it. A public key is public: used
 * as an HMAC secret, it would let anyone sign tokens (the "algorithm
 * confusion" attack), so whatever looks like an asymmetric key is refused.
 * @param {Buffer} secret
 * @param {unknown} [original] What the caller passed, when it was text.
 * @returns {Buffer}
 */
const _hmacSecret = (secret, original) => {
  const candidates = [secret];
  if (typeof original === "string") {
    // A JWK kept in an environment variable is JSON text.
    if (_isJWKText(original)) {
      throw _keyError("This looks like a JWK written as JSON, not a shared secret: its text is never used as an HMAC secret. Pass the parsed object (JSON.parse()) instead, or use a random secret from crypto.generateKey()");
    }
    candidates.push(Buffer.from(original, "latin1"));
    // A PEM body without its header lines is Base64 DER.
    if (/^[A-Za-z0-9+/_\-\s]+={0,2}\s*$/.test(original)) candidates.push(Buffer.from(original.replace(/\s/g, ""), "base64"));
    // And DER is sometimes written out in hex. 32 bytes is the shortest secret allowed anyway.
    if (/^(?:[0-9A-Fa-f]{2}){32,}$/.test(original)) candidates.push(Buffer.from(original, "hex"));
  }
  if (candidates.some((bytes) => bytes.includes("-----BEGIN") || _isDER(bytes))) {
    throw _keyError("This looks like a public or private key, not a shared secret: an asymmetric key is never used as an HMAC secret. Pass a key as PEM text, a KeyObject or a JWK, or use a random secret from crypto.generateKey()");
  }
  // RFC 7518, section 3.2: a shorter secret can be brute-forced from one token.
  if (secret.length < 32) throw _keyError(`A JWT secret must be at least 32 bytes long, this one has ${secret.length}: crypto.generateKey() gives a good one`);
  return secret;
};

/**
 * @param {JWTKey} key
 * @param {"sign" | "verify"} use
 * @returns {_ResolvedKey}
 */
const _readKey = (key, use) => {
  const crypto = _crypto();
  if (types.isKeyObject(key)) {
    if (key.type === "secret") return { secret: _hmacSecret(key.export()), algorithms: _HS };
    if (use === "sign" && key.type !== "private") throw _keyError("Signing takes a private key, this one is public");
    return _asymmetric(use === "verify" && key.type === "private" ? crypto.createPublicKey(key) : key);
  }
  const jwk = key !== null && typeof key === "object" && !ArrayBuffer.isView(key) && typeof (/** @type {{ kty?: unknown }} */ (key).kty) === "string";
  if (jwk && /** @type {import("node:crypto").JsonWebKey} */ (key).kty === "oct") {
    return { secret: _hmacSecret(_secret(Buffer.from(String(/** @type {import("node:crypto").JsonWebKey} */ (key).k ?? ""), "base64url"), "the JWT secret")), algorithms: _HS };
  }
  const pem = jwk ? undefined : _pem(key);
  if (jwk || pem !== undefined) {
    const input = /** @type {any} */ (jwk ? { key, format: "jwk" } : pem);
    let object;
    try {
      object = use === "sign" ? crypto.createPrivateKey(input) : crypto.createPublicKey(input);
    } catch (error) {
      throw _keyError(use === "sign" ? "Signing takes a private key, and this can't be read as one" : "This key can't be read", error);
    }
    return _asymmetric(object);
  }
  return { secret: _hmacSecret(_secret(key, "the JWT secret"), key), algorithms: _HS };
};

// Reading a PEM, or making sure a secret isn't a key in disguise, takes far
// longer than checking a signature, and a server uses the same few keys for
// every request.
/** @type {Record<"sign" | "verify", Map<string, _ResolvedKey>>} */
const _textKeys = { sign: new Map(), verify: new Map() };
/** @type {Record<"sign" | "verify", WeakMap<object, _ResolvedKey>>} */
const _objectKeys = { sign: new WeakMap(), verify: new WeakMap() };
/** @type {Record<"sign" | "verify", WeakMap<object, { bytes: Buffer, resolved: _ResolvedKey }>>} */
const _byteKeys = { sign: new WeakMap(), verify: new WeakMap() };

/**
 * @param {JWTKey} key
 * @param {"sign" | "verify"} use
 * @returns {_ResolvedKey}
 */
const _jwtKey = (key, use) => {
  if (typeof key === "string") {
    let resolved = _textKeys[use].get(key);
    if (!resolved) {
      resolved = _readKey(key, use);
      if (_textKeys[use].size >= 20) _textKeys[use].clear();
      _textKeys[use].set(key, resolved);
    }
    return resolved;
  }
  if (ArrayBuffer.isView(key) || types.isAnyArrayBuffer(key)) {
    // Bytes can change after the call: the result is read from a copy, and
    // reused only while the bytes still match it.
    const bytes = /** @type {Buffer} */ (_maybeBuffer(key));
    const cached = _byteKeys[use].get(key);
    if (cached?.bytes.equals(bytes)) return cached.resolved;
    const copy = Buffer.from(bytes);
    const resolved = _readKey(copy, use);
    _byteKeys[use].set(key, { bytes: copy, resolved });
    return resolved;
  }
  if (key === null || typeof key !== "object") return _readKey(key, use);
  let resolved = _objectKeys[use].get(key);
  if (!resolved) _objectKeys[use].set(key, (resolved = _readKey(key, use)));
  return resolved;
};

/**
 * @param {JWTAlgorithm} algorithm
 * @param {import("node:crypto").KeyObject} key
 * @returns {any}
 */
const _signingKey = (algorithm, key) => {
  if (algorithm[0] === "P") {
    const { constants } = _crypto();
    return { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: constants.RSA_PSS_SALTLEN_DIGEST };
  }
  // JWTs carry ECDSA signatures as r and s side by side, not in DER.
  return algorithm[0] === "E" && algorithm !== "EdDSA" ? { key, dsaEncoding: "ieee-p1363" } : key;
};

/** @param {JWTAlgorithm} algorithm */
const _digestOf = (algorithm) => (algorithm === "EdDSA" ? null : `sha${algorithm.slice(2)}`);

/**
 * @param {JWTAlgorithm} algorithm
 * @param {string} signed The header and the payload, as sent.
 * @param {_ResolvedKey} key
 * @returns {string}
 */
const _signature = (algorithm, signed, key) => {
  const crypto = _crypto();
  if (key.secret) return crypto.createHmac(/** @type {string} */ (_digestOf(algorithm)), key.secret).update(signed).digest("base64url");
  return crypto.sign(_digestOf(algorithm), Buffer.from(signed), _signingKey(algorithm, key.key)).toString("base64url");
};

/**
 * @param {JWTAlgorithm} algorithm
 * @param {string} signed
 * @param {string} signature
 * @param {_ResolvedKey} key
 * @returns {boolean}
 */
const _signatureMatches = (algorithm, signed, signature, key) => {
  const crypto = _crypto();
  if (key.secret) {
    const expected = Buffer.from(_signature(algorithm, signed, key));
    const given = Buffer.from(signature);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  }
  try {
    return crypto.verify(_digestOf(algorithm), Buffer.from(signed), _signingKey(algorithm, key.key), Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
};

/** @type {Map<JWTAlgorithm, string>} */
const _plainHeaders = new Map();

/**
 * @param {JWTAlgorithm} algorithm
 * @param {Record<string, unknown> | undefined} extra
 * @returns {string}
 */
const _header = (algorithm, extra) => {
  if (extra) return Buffer.from(JSON.stringify({ typ: "JWT", ...extra, alg: algorithm })).toString("base64url");
  let header = _plainHeaders.get(algorithm);
  if (!header) _plainHeaders.set(algorithm, (header = Buffer.from(JSON.stringify({ alg: algorithm, typ: "JWT" })).toString("base64url")));
  return header;
};

const _BASE64URL = /^[A-Za-z0-9_-]*$/;

/**
 * @param {number | string | undefined} value
 * @returns {number} Seconds.
 */
const _tolerance = (value) => {
  if (value === undefined) return 0;
  // A bare "60" would read as milliseconds where numbers mean seconds, so text needs its unit.
  const seconds = typeof value === "string" ? (/[a-z]/i.test(value) ? toMs(value, "clockTolerance") / 1000 : NaN) : value;
  // NaN or a string here would turn every expiry check off.
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError(`verifyJWT(): clockTolerance must be 0 or more seconds, or a duration like "30s", got ${typeof value === "string" ? JSON.stringify(value) : String(value)}`);
  }
  return seconds;
};

/**
 * RFC 7515, section 4.1.9: `typ` is a media type, case-insensitive, whose
 * `application/` prefix may be left out.
 * @param {string} type
 */
const _mediaType = (type) => {
  const lower = type.toLowerCase();
  return lower.startsWith("application/") && !lower.includes("/", 12) ? lower.slice(12) : lower;
};

/**
 * @param {unknown} token
 * @returns {{ header: { alg: string, typ?: string, [key: string]: unknown }, payload: Record<string, unknown>, signature: string, signed: string }}
 */
const _decode = (token) => {
  const text = typeof token === "string" ? token : "";
  const first = text.indexOf(".");
  const second = text.indexOf(".", first + 1);
  if (first < 1 || second === -1 || text.includes(".", second + 1)) throw new JWTError("Malformed JWT: expected 3 parts", { code: "ERR_JWT_MALFORMED" });
  // Node's Base64 decoder skips what it doesn't know and ignores padding and
  // unused bits, so one signature could be written many ways. Only the one
  // canonical spelling is read.
  const signature = text.slice(second + 1);
  if (!_BASE64URL.test(text.slice(0, second).replace(".", "")) || !_BASE64URL.test(signature)) {
    throw new JWTError("Malformed JWT: expected Base64URL parts", { code: "ERR_JWT_MALFORMED" });
  }
  if (Buffer.from(signature, "base64url").toString("base64url") !== signature) throw new JWTError("Malformed JWT: the signature isn't canonical Base64URL", { code: "ERR_JWT_MALFORMED" });
  try {
    const header = JSON.parse(Buffer.from(text.slice(0, first), "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(text.slice(first + 1, second), "base64url").toString("utf8"));
    if (!header || typeof header !== "object" || Array.isArray(header) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("not an object");
    }
    return { header, payload, signature, signed: text.slice(0, second) };
  } catch (error) {
    throw new JWTError("Malformed JWT: header or payload is not valid JSON", { code: "ERR_JWT_MALFORMED", cause: error });
  }
};

/**
 * Creates a signed JSON Web Token. `iat` is added for you.
 *
 * With a secret, the token is signed with HMAC. With a private key, it's
 * signed with that key, and anyone holding the public key can verify it
 * without being able to issue tokens.
 *
 * @example
 * const token = crypto.signJWT({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
 *   expiresIn: "15m",
 *   issuer: "api.example.com",
 * });
 *
 * // key pair: the auth service signs, every other service verifies
 * const { publicKey, privateKey } = await crypto.generateKeyPair("ES256");
 * const signed = crypto.signJWT({ sub: "42" }, privateKey, { expiresIn: "15m" });
 * crypto.verifyJWT(signed, publicKey);
 *
 * @param {Record<string, unknown>} payload
 * @param {JWTKey} secret For HS algorithms, at least 32 random bytes. Otherwise a private key.
 * @param {SignJWTOptions} [options]
 * @returns {string}
 * @throws {TypeError} If the key can't be used, or doesn't fit the algorithm.
 */
function signJWT(payload, secret, options = {}) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("signJWT(): the payload must be an object");
  const key = _jwtKey(secret, "sign");
  const algorithm = options.algorithm ?? key.algorithms[0];
  if (!key.algorithms.includes(algorithm)) {
    throw new TypeError(`signJWT(): algorithm "${algorithm}" doesn't fit this key, use ${key.algorithms.join(", ")}`);
  }
  const now = Math.floor(Date.now() / 1000);
  /** @type {Record<string, unknown>} */
  const claims = { ...payload };
  if (!options.noTimestamp && claims.iat === undefined) claims.iat = now;
  if (options.expiresIn !== undefined) claims.exp = now + _seconds(options.expiresIn, "expiresIn");
  if (options.notBefore !== undefined) claims.nbf = now + _seconds(options.notBefore, "notBefore");
  if (options.issuer !== undefined) claims.iss = options.issuer;
  if (options.subject !== undefined) claims.sub = options.subject;
  if (options.audience !== undefined) claims.aud = options.audience;
  if (options.jwtId !== undefined) claims.jti = options.jwtId;
  const signed = `${_header(algorithm, options.header)}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
  return `${signed}.${_signature(algorithm, signed, key)}`;
}

/**
 * Reads a JWT without checking it. Fine for display; call `verifyJWT()`
 * before trusting anything in it.
 *
 * @example
 * crypto.decodeJWT(token).payload.exp;
 *
 * @template [P=Record<string, unknown>]
 * @param {string} token
 * @returns {DecodedJWT<P>}
 * @throws {JWTError} With code `ERR_JWT_MALFORMED` if the token can't be read.
 */
function decodeJWT(token) {
  const { header, payload, signature } = _decode(token);
  return { header, payload: /** @type {P & JWTClaims} */ (payload), signature };
}

/**
 * Verifies a JWT: algorithm, signature, expiry, and whichever claims you
 * require. Returns the payload, or throws a `JWTError` whose `code` says
 * what's wrong.
 *
 * The accepted algorithms follow from the key you pass, so a token signed
 * with HMAC is never accepted where a public key is expected.
 *
 * @example
 * try {
 *   const { sub } = crypto.verifyJWT(token, process.env.JWT_SECRET, { issuer: "api.example.com" });
 * } catch (error) {
 *   res.status(401).json({ error: error.code }); // "ERR_JWT_EXPIRED"...
 * }
 *
 * @template [P=Record<string, unknown>]
 * @param {string} token
 * @param {JWTKey} secret The shared secret (at least 32 bytes), or the public key for RS, PS, ES and EdDSA tokens.
 * @param {VerifyJWTOptions} [options]
 * @returns {P & JWTClaims}
 * @throws {JWTError} If the token is malformed, badly signed, expired or doesn't meet your options.
 * @throws {TypeError} If the key can't be used (a secret under 32 bytes, a public key passed as raw bytes...) or an option is invalid.
 */
function verifyJWT(token, secret, options = {}) {
  // Checked first: a bad option is a bug in the caller, whatever the token.
  const now = Math.floor(_now(options.now, "now") / 1000);
  const tolerance = _tolerance(options.clockTolerance);
  if (options.typ !== undefined && typeof options.typ !== "string") throw new TypeError("verifyJWT(): typ must be a string");
  if (options.crit !== undefined && !(Array.isArray(options.crit) && options.crit.every((name) => typeof name === "string"))) {
    throw new TypeError("verifyJWT(): crit must be an array of header names");
  }
  const { header, payload, signature, signed } = _decode(token);
  const key = _jwtKey(secret, "verify");
  const algorithm = /** @type {JWTAlgorithm} */ (header.alg);
  if (typeof algorithm !== "string" || !key.algorithms.includes(algorithm) || (options.algorithms !== undefined && !options.algorithms.includes(algorithm))) {
    throw new JWTError(`Algorithm "${String(header.alg)}" is not allowed`, { code: "ERR_JWT_ALGORITHM" });
  }
  if (!_signatureMatches(algorithm, signed, signature, key)) throw new JWTError("Invalid signature", { code: "ERR_JWT_SIGNATURE" });

  // RFC 7515, section 4.1.11: an extension the token marks as critical must be understood, or the token refused.
  if (header.crit !== undefined) {
    const crit = header.crit;
    const known = options.crit ?? [];
    if (!Array.isArray(crit) || !crit.length || !crit.every((name) => typeof name === "string" && known.includes(name) && Object.hasOwn(header, name))) {
      throw new JWTError(`Unsupported critical header: ${JSON.stringify(crit)}`, { code: "ERR_JWT_CLAIM" });
    }
  }
  if (options.typ !== undefined && (typeof header.typ !== "string" || _mediaType(header.typ) !== _mediaType(options.typ))) {
    throw new JWTError(`Invalid "typ" header: expected "${options.typ}"`, { code: "ERR_JWT_CLAIM" });
  }

  const claims = /** @type {JWTClaims & Record<string, unknown>} */ (payload);
  for (const name of /** @type {const} */ (["exp", "nbf", "iat"])) {
    if (claims[name] !== undefined && !Number.isFinite(claims[name])) throw new JWTError(`Invalid "${name}" claim: expected a number`, { code: "ERR_JWT_CLAIM" });
  }
  if (!options.ignoreExpiration && claims.exp !== undefined && now - tolerance >= claims.exp) {
    throw new JWTError("Token expired", { code: "ERR_JWT_EXPIRED", expiredAt: new Date(claims.exp * 1000) });
  }
  if (claims.nbf !== undefined && now + tolerance < claims.nbf) throw new JWTError("Token not active yet", { code: "ERR_JWT_NOT_BEFORE" });
  if (options.maxAge !== undefined && (claims.iat === undefined || now - tolerance > claims.iat + _seconds(options.maxAge, "maxAge"))) {
    throw new JWTError("Token is too old", { code: "ERR_JWT_EXPIRED" });
  }
  if (options.issuer !== undefined && !(typeof claims.iss === "string" && (Array.isArray(options.issuer) ? options.issuer.includes(claims.iss) : options.issuer === claims.iss))) {
    throw new JWTError("Invalid issuer", { code: "ERR_JWT_CLAIM" });
  }
  if (options.subject !== undefined && claims.sub !== options.subject) throw new JWTError("Invalid subject", { code: "ERR_JWT_CLAIM" });
  if (options.audience !== undefined) {
    const wanted = Array.isArray(options.audience) ? options.audience : [options.audience];
    const actual = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!actual.some((audience) => typeof audience === "string" && wanted.includes(audience))) throw new JWTError("Invalid audience", { code: "ERR_JWT_CLAIM" });
  }
  return /** @type {P & JWTClaims} */ (payload);
}

/**
 * Makes a pair of keys for signing JWTs: the private one signs, the public
 * one verifies. Both come as PEM text, ready for an environment variable or
 * a file.
 *
 * `"EdDSA"` (Ed25519) is the fastest with the shortest keys and signatures.
 * `"ES256"` is the most widely supported after RSA. Pick `"RS256"` when the
 * other side asks for it.
 *
 * @example
 * const { publicKey, privateKey } = await crypto.generateKeyPair();
 * const token = crypto.signJWT({ sub: "42" }, privateKey);
 * crypto.verifyJWT(token, publicKey);
 *
 * @param {Exclude<JWTAlgorithm, "HS256" | "HS384" | "HS512">} [algorithm="EdDSA"] The JWT algorithm the keys are for.
 * @param {{ modulusLength?: number }} [options] RSA key size in bits. Defaults to `2048`.
 * @returns {Promise<KeyPair>}
 */
function generateKeyPair(algorithm = "EdDSA", options = {}) {
  /** @type {[string, object]} */
  let spec;
  if (algorithm === "EdDSA") spec = ["ed25519", {}];
  else if (Object.hasOwn(_ALGORITHM_CURVES, algorithm)) spec = ["ec", { namedCurve: _ALGORITHM_CURVES[algorithm] }];
  else if (/^(RS|PS)(256|384|512)$/.test(algorithm)) {
    const modulusLength = options.modulusLength ?? 2048;
    if (!Number.isInteger(modulusLength) || modulusLength < 2048) return Promise.reject(new RangeError("generateKeyPair(): modulusLength must be at least 2048"));
    spec = ["rsa", { modulusLength }];
  } else {
    return Promise.reject(new TypeError(`generateKeyPair(): expected an RS, PS, ES or EdDSA algorithm, got "${String(algorithm)}"`));
  }
  const encoding = { publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } };
  return new Promise((resolve, reject) => {
    /** @type {any} */ (_crypto().generateKeyPair)(spec[0], { ...spec[1], ...encoding }, (/** @type {Error | null} */ error, /** @type {string} */ publicKey, /** @type {string} */ privateKey) =>
      error ? reject(error) : resolve({ publicKey, privateKey }),
    );
  });
}

/**
 * A new two-factor secret, in the Base32 format authenticator apps expect.
 * Store it encrypted.
 *
 * @example
 * user.totpSecret = crypto.totpSecret();
 *
 * @param {number} [bytes=20] At least `16` (128 bits, the minimum of RFC 4226). `20` is what most apps use.
 * @returns {string}
 * @throws {RangeError} If `bytes` is under 16.
 */
function totpSecret(bytes = 20) {
  if (!Number.isInteger(bytes) || bytes < 16) throw new RangeError(`totpSecret(): a TOTP secret needs at least 16 bytes, got ${bytes}`);
  return _base32Encode(_crypto().randomBytes(bytes));
}

/**
 * @param {Buffer} key
 * @param {number} counter
 * @param {number} digits
 * @param {string} algorithm
 * @returns {string}
 */
const _hotp = (key, counter, digits, algorithm) => {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);
  const digest = _crypto().createHmac(algorithm.toLowerCase(), key).update(buffer).digest();
  const off = digest[digest.length - 1] & 0x0f;
  const code = ((digest[off] & 0x7f) << 24) | (digest[off + 1] << 16) | (digest[off + 2] << 8) | digest[off + 3];
  return String(code % 10 ** digits).padStart(digits, "0");
};

/**
 * @param {TOTPOptions} options
 * @returns {{ digits: number, period: number, algorithm: string, time: number }}
 */
const _totpOptions = (options) => {
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  if (!Number.isInteger(digits) || digits < 4 || digits > 10) throw new RangeError(`TOTP codes have 4 to 10 digits, got ${digits}`);
  if (!(period > 0) || !Number.isFinite(period)) throw new RangeError(`The TOTP period must be a positive number of seconds, got ${period}`);
  return { digits, period, algorithm: options.algorithm ?? "SHA1", time: _now(options.time, "time") };
};

/**
 * @param {unknown} secret
 * @returns {Buffer}
 */
const _totpKey = (secret) => {
  if (typeof secret !== "string") throw new TypeError(`Expected the TOTP secret to be a Base32 string, got ${secret === null ? "null" : typeof secret}`);
  const key = _base32Decode(secret);
  // An empty secret makes codes anyone can compute. 10 bytes (16 Base32
  // characters) is what many authenticator setups made, so it still works;
  // totpSecret() makes longer ones.
  if (key.length < 10) throw new TypeError(`A TOTP secret must be at least 10 bytes (16 Base32 characters), this one has ${key.length}: crypto.totpSecret() makes one`);
  return key;
};

/**
 * The current 6-digit code for a two-factor secret, as shown by
 * authenticator apps.
 *
 * @example
 * crypto.totp(user.totpSecret); // "492039"
 *
 * @param {string} secret Base32, at least 10 bytes once decoded (16 characters), so older 80-bit secrets keep working. Make new ones with `totpSecret()`, which gives 20 bytes.
 * @param {TOTPOptions} [options]
 * @returns {string}
 * @throws {TypeError} If the secret isn't Base32 or is too short.
 */
function totp(secret, options = {}) {
  const { digits, period, algorithm, time } = _totpOptions(options);
  return _hotp(_totpKey(secret), Math.floor(time / 1000 / period), digits, algorithm);
}

/**
 * Finds which time step a code typed by a user belongs to. Codes from the
 * neighbouring periods are accepted too, to cope with clock drift.
 *
 * Store the step of the last code you accepted and pass it as `after` next
 * time: the same code, or an older one, is then refused, so a code seen
 * over someone's shoulder can't be used again.
 *
 * @example
 * const step = crypto.totpStep(req.body.code, user.totpSecret, { after: user.totpLastStep });
 * if (step === undefined) throw new Error("Invalid code");
 * user.totpLastStep = step; // save it with the user
 *
 * @param {string} code Spaces are ignored.
 * @param {string} secret Base32, at least 10 bytes once decoded (16 characters), so older 80-bit secrets keep working. Make new ones with `totpSecret()`, which gives 20 bytes.
 * @param {VerifyTOTPOptions} [options]
 * @returns {number | undefined} The time step of the code (Unix time divided by the period), or `undefined` if it doesn't match.
 * @throws {RangeError} If `window` isn't an integer from 0 to 10.
 * @throws {TypeError} If the secret isn't Base32 or is too short, or `after` isn't an integer.
 */
function totpStep(code, secret, options = {}) {
  const { digits, period, algorithm, time } = _totpOptions(options);
  const key = _totpKey(secret);
  const window = options.window ?? 1;
  // Every period of the window costs an HMAC, and a wide window lets guesses through.
  if (!Number.isInteger(window) || window < 0 || window > 10) throw new RangeError(`The TOTP window must be an integer from 0 to 10, got ${window}`);
  const after = options.after;
  if (after !== undefined && !Number.isSafeInteger(after)) throw new TypeError(`The TOTP "after" option must be a time step from totpStep(), got ${String(after)}`);
  if (typeof code !== "string" && typeof code !== "number") return undefined;
  const given = Buffer.from(String(code).replace(/\s/g, ""));
  if (given.length !== digits) return undefined;
  const counter = Math.floor(time / 1000 / period);
  /** @type {number | undefined} */
  let step;
  // Every candidate is checked, so the time taken says nothing about which one matched.
  for (let i = -window; i <= window; i++) {
    const candidate = counter + i;
    if (candidate >= 0 && _crypto().timingSafeEqual(Buffer.from(_hotp(key, candidate, digits, algorithm)), given) && (after === undefined || candidate > after)) step = candidate;
  }
  return step;
}

/**
 * Checks a code typed by a user. Codes from the neighbouring periods are
 * accepted too, to cope with clock drift.
 *
 * On its own it accepts the same code again until it expires. To refuse
 * reuse, keep the step of the last accepted code from `totpStep()` and
 * pass it as `after`.
 *
 * @example
 * if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
 *
 * @param {string} token Spaces are ignored.
 * @param {string} secret Base32, at least 10 bytes once decoded (16 characters), so older 80-bit secrets keep working. Make new ones with `totpSecret()`, which gives 20 bytes.
 * @param {VerifyTOTPOptions} [options]
 * @returns {boolean}
 * @throws {RangeError} If `window` isn't an integer from 0 to 10.
 * @throws {TypeError} If the secret isn't Base32 or is too short.
 */
function verifyTOTP(token, secret, options = {}) {
  return totpStep(token, secret, options) !== undefined;
}

/**
 * The `otpauth://` link to show as a QR code when a user turns on 2FA.
 *
 * @example
 * const uri = crypto.totpURI(user.totpSecret, { label: user.email, issuer: "My App" });
 *
 * @param {string} secret
 * @param {TOTPURIOptions} options
 * @returns {string}
 */
function totpURI(secret, options) {
  const label = options.issuer ? `${encodeURIComponent(options.issuer)}:${encodeURIComponent(options.label)}` : encodeURIComponent(options.label);
  const params = new URLSearchParams({ secret: secret.replace(/\s/g, "").toUpperCase() });
  if (options.issuer) params.set("issuer", options.issuer);
  params.set("algorithm", options.algorithm ?? "SHA1");
  params.set("digits", String(options.digits ?? 6));
  params.set("period", String(options.period ?? 30));
  return `otpauth://totp/${label}?${params.toString().replace(/\+/g, "%20")}`;
}

/**
 * Secure random bytes.
 *
 * @param {number} size
 * @returns {Buffer}
 */
function randomBytes(size) {
  return _crypto().randomBytes(size);
}

/**
 * A secure random integer from `min` to `max`, both included, with no bias.
 * For anything that has to be fair or unpredictable.
 *
 * @example
 * crypto.randomInt(1, 6);       // a fair dice roll
 * crypto.randomInt(0, 999_999); // a 6-digit code
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  if (!(high >= low)) throw new RangeError(`randomInt(): expected min <= max, got ${min} and ${max}`);
  return _crypto().randomInt(low, high + 1);
}

/**
 * Encodes to Base64, or URL-safe Base64.
 *
 * @example
 * crypto.toBase64("héllo");                  // "aMOpbGxv"
 * crypto.toBase64("héllo", { urlSafe: true });
 *
 * @param {string | Buffer | Uint8Array} data
 * @param {{ urlSafe?: boolean }} [options]
 * @returns {string}
 */
function toBase64(data, options = {}) {
  return _toBuffer(data).toString(options.urlSafe ? "base64url" : "base64");
}

/**
 * Decodes Base64 or URL-safe Base64.
 *
 * @example
 * crypto.fromBase64("aMOpbGxv");                     // "héllo"
 * crypto.fromBase64("aMOpbGxv", { output: "buffer" }); // <Buffer 68 c3 a9 6c 6c 6f>
 *
 * @overload
 * @param {string} text
 * @param {{ output: "buffer" }} options
 * @returns {Buffer}
 */
/**
 * Decodes Base64 or URL-safe Base64 into text.
 *
 * @overload
 * @param {string} text
 * @param {{ output?: "utf8" }} [options]
 * @returns {string}
 */
/**
 * @param {string} text
 * @param {{ output?: "utf8" | "buffer" }} [options]
 * @returns {string | Buffer}
 */
function fromBase64(text, options = {}) {
  // Node reads both alphabets, padded or not.
  const buffer = Buffer.from(String(text), "base64");
  return options.output === "buffer" ? buffer : buffer.toString("utf8");
}

module.exports = {
  hash,
  hmac,
  verifyHmac,
  safeEqual,
  hashPassword,
  verifyPassword,
  needsRehash,
  generateKey,
  encrypt,
  decrypt,
  signJWT,
  decodeJWT,
  verifyJWT,
  generateKeyPair,
  totpSecret,
  totp,
  verifyTOTP,
  totpStep,
  totpURI,
  randomBytes,
  randomInt,
  toBase64,
  fromBase64,
};
