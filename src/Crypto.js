"use strict";

/**
 * Crypto without the footguns, built on `node:crypto`: hashes, HMAC,
 * password hashing (scrypt), encryption (AES-256-GCM), JWT, two-factor
 * codes (TOTP) and secure random values.
 *
 * @example
 * const stored = await crypto.hashPassword("hunter2");
 * await crypto.verifyPassword("hunter2", stored); // true
 *
 * const token = crypto.signJWT({ sub: user.id }, SECRET, { expiresIn: "1h" });
 * const claims = crypto.verifyJWT(token, SECRET);
 */

const { JWTError } = require("./errors.js");
const { parseDuration } = require("./Time.js");

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
 * Options for `hashPassword()`.
 * @typedef {object} HashPasswordOptions
 * @property {number} [cost] Work factor as a power of two; each +1 doubles the time. Defaults to `15`.
 * @property {number} [blockSize] scrypt `r`. Defaults to `8`.
 * @property {number} [parallelization] scrypt `p`. Defaults to `1`.
 * @property {number} [saltLength] In bytes. Defaults to `16`.
 * @property {number} [keyLength] In bytes. Defaults to `32`.
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
 * Supported JWT algorithms.
 * @typedef {"HS256" | "HS384" | "HS512"} JWTAlgorithm
 */

/**
 * Options for `signJWT()`.
 * @typedef {object} SignJWTOptions
 * @property {JWTAlgorithm} [algorithm] Defaults to `"HS256"`.
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
 * @property {JWTAlgorithm[]} [algorithms] Accepted algorithms. Defaults to all three HMAC ones.
 * @property {string | string[]} [issuer] Required issuer.
 * @property {string | string[]} [audience] Required audience; one match is enough.
 * @property {string} [subject] Required subject.
 * @property {number} [clockTolerance] Seconds of slack for `exp` and `nbf` when server clocks differ.
 * @property {string | number} [maxAge] Reject tokens issued longer ago than this.
 * @property {boolean} [ignoreExpiration] Skip the `exp` check.
 * @property {Date | number} [now] What time it is. Defaults to now.
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
 * @property {Date | number} [time] Compute the code for this moment. Defaults to now.
 */

/**
 * Options for `verifyTOTP()`. `window` is how many periods before and after
 * now are accepted (defaults to `1`).
 * @typedef {TOTPOptions & { window?: number }} VerifyTOTPOptions
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

/** @param {unknown} data */
const _toBuffer = (data) => (Buffer.isBuffer(data) ? data : data instanceof Uint8Array ? Buffer.from(data) : Buffer.from(String(data), "utf8"));

/**
 * @param {string | number} value
 * @returns {number}
 */
const _seconds = (value) => {
  if (typeof value === "number") return value;
  const ms = parseDuration(value);
  if (ms === null) throw new TypeError(`Invalid duration "${value}"`);
  return Math.round(ms / 1000);
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
  return _crypto().createHash(options.algorithm ?? "sha256").update(_toBuffer(data)).digest(options.encoding ?? "hex");
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
  return _crypto().createHmac(options.algorithm ?? "sha256", _toBuffer(secret)).update(_toBuffer(data)).digest(options.encoding ?? "hex");
}

/**
 * Compares two secrets in constant time, so the comparison can't leak
 * anything through timing. Use it instead of `===` for tokens, signatures
 * and API keys.
 *
 * @example
 * if (!crypto.safeEqual(providedKey, process.env.API_KEY)) throw new Error("Forbidden");
 *
 * @param {string | Buffer | Uint8Array} a
 * @param {string | Buffer | Uint8Array} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  const x = _toBuffer(a);
  const y = _toBuffer(b);
  if (x.length !== y.length) {
    _crypto().timingSafeEqual(x, x);
    return false;
  }
  return _crypto().timingSafeEqual(x, y);
}

/**
 * Hashes a password with scrypt and a random salt. The result records its
 * own settings, so you can raise the cost later without breaking old
 * hashes.
 *
 * @example
 * const stored = await crypto.hashPassword(password);
 * // "$scrypt$ln=15,r=8,p=1$4xY...$kq9...", store this
 *
 * @param {string} password
 * @param {HashPasswordOptions} [options]
 * @returns {Promise<string>}
 */
async function hashPassword(password, options = {}) {
  const ln = options.cost ?? 15;
  const r = options.blockSize ?? 8;
  const p = options.parallelization ?? 1;
  const salt = _crypto().randomBytes(options.saltLength ?? 16);
  const N = 2 ** ln;
  const key = await _scrypt(password.normalize("NFKC"), salt, options.keyLength ?? 32, { N, r, p, maxmem: 256 * N * r + 1024 * 1024 });
  return `$scrypt$ln=${ln},r=${r},p=${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/**
 * Checks a password against a stored hash, in constant time. A wrong
 * password or a broken hash gives `false`, never an error.
 *
 * @example
 * if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
 *
 * @param {string} password
 * @param {string} stored
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, stored) {
  const match = /^\$scrypt\$ln=(\d+),r=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/.exec(String(stored));
  if (!match) return false;
  const [, ln, r, p, salt, key] = match;
  const expected = Buffer.from(key, "base64url");
  const N = 2 ** Number(ln);
  try {
    const actual = await _scrypt(String(password).normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
      N, r: Number(r), p: Number(p), maxmem: 256 * N * Number(r) + 1024 * 1024,
    });
    return _crypto().timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Was this hash made with weaker settings than yours? If so, re-hash the
 * password right after a successful login.
 *
 * @example
 * if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { cost: 16 })) {
 *   user.hash = await crypto.hashPassword(input, { cost: 16 });
 * }
 *
 * @param {string} stored
 * @param {HashPasswordOptions} [options] The settings you use today.
 * @returns {boolean}
 */
function needsRehash(stored, options = {}) {
  const match = /^\$scrypt\$ln=(\d+),r=(\d+),p=(\d+)\$/.exec(String(stored));
  if (!match) return true;
  return Number(match[1]) < (options.cost ?? 15) || Number(match[2]) < (options.blockSize ?? 8) || Number(match[3]) < (options.parallelization ?? 1);
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
  const raw = typeof secret === "string" && /^[A-Za-z0-9_-]{43}$/.test(secret) ? Buffer.from(secret, "base64url") : _toBuffer(secret);
  if (!raw.length) throw new TypeError("The encryption secret must not be empty");
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
  const salt = _crypto().randomBytes(16);
  const iv = _crypto().randomBytes(12);
  const cipher = _crypto().createCipheriv("aes-256-gcm", _deriveKey(secret, salt), iv);
  if (options.associatedData !== undefined) cipher.setAAD(_toBuffer(options.associatedData));
  const encrypted = Buffer.concat([cipher.update(_toBuffer(data)), cipher.final()]);
  return ["v1", salt, iv, cipher.getAuthTag(), encrypted].map((part) => (typeof part === "string" ? part : part.toString("base64url"))).join(".");
}

/**
 * Decrypts what `encrypt()` produced. Throws if the secret is wrong or the
 * data was changed.
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
 * @throws {Error} If the secret is wrong or the payload was modified.
 */
function decrypt(payload, secret, options = {}) {
  const parts = String(payload).split(".");
  if (parts.length !== 5 || parts[0] !== "v1") throw new TypeError("Invalid encrypted payload");
  const [salt, iv, tag, encrypted] = parts.slice(1).map((part) => Buffer.from(part, "base64url"));
  const decipher = _crypto().createDecipheriv("aes-256-gcm", _deriveKey(secret, salt), iv);
  decipher.setAuthTag(tag);
  if (options.associatedData !== undefined) decipher.setAAD(_toBuffer(options.associatedData));
  let decrypted;
  try {
    decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (error) {
    throw new Error("Unable to decrypt: wrong secret or tampered data", { cause: error });
  }
  return options.output === "buffer" ? decrypted : decrypted.toString("utf8");
}

/**
 * Creates a signed JSON Web Token. `iat` is added for you.
 *
 * @example
 * const token = crypto.signJWT({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
 *   expiresIn: "15m",
 *   issuer: "api.example.com",
 * });
 *
 * @param {Record<string, unknown>} payload
 * @param {string | Buffer} secret At least 32 random bytes.
 * @param {SignJWTOptions} [options]
 * @returns {string}
 */
function signJWT(payload, secret, options = {}) {
  const algorithm = options.algorithm ?? "HS256";
  if (!/^HS(256|384|512)$/.test(algorithm)) throw new JWTError(`Unsupported algorithm "${algorithm}"`, { code: "ERR_JWT_ALGORITHM" });
  const now = Math.floor(Date.now() / 1000);
  /** @type {Record<string, unknown>} */
  const claims = { ...payload };
  if (!options.noTimestamp && claims.iat === undefined) claims.iat = now;
  if (options.expiresIn !== undefined) claims.exp = now + _seconds(options.expiresIn);
  if (options.notBefore !== undefined) claims.nbf = now + _seconds(options.notBefore);
  if (options.issuer !== undefined) claims.iss = options.issuer;
  if (options.subject !== undefined) claims.sub = options.subject;
  if (options.audience !== undefined) claims.aud = options.audience;
  if (options.jwtId !== undefined) claims.jti = options.jwtId;
  const header = { ...options.header, alg: algorithm, typ: "JWT" };
  const body = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
  return `${body}.${hmac(body, secret, { algorithm: `sha${algorithm.slice(2)}`, encoding: "base64url" })}`;
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
  const parts = String(token).split(".");
  if (parts.length !== 3) throw new JWTError("Malformed JWT: expected 3 parts", { code: "ERR_JWT_MALFORMED" });
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!header || typeof header !== "object" || !payload || typeof payload !== "object") throw new TypeError("not an object");
    return { header, payload, signature: parts[2] };
  } catch (error) {
    throw new JWTError("Malformed JWT: header or payload is not valid JSON", { code: "ERR_JWT_MALFORMED", cause: error });
  }
}

/**
 * Verifies a JWT: algorithm, signature, expiry, and whichever claims you
 * require. Returns the payload, or throws a `JWTError` whose `code` says
 * what's wrong.
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
 * @param {string | Buffer} secret
 * @param {VerifyJWTOptions} [options]
 * @returns {P & JWTClaims}
 * @throws {JWTError}
 */
function verifyJWT(token, secret, options = {}) {
  const { header, payload } = decodeJWT(token);
  const allowed = options.algorithms ?? ["HS256", "HS384", "HS512"];
  if (typeof header.alg !== "string" || !allowed.includes(/** @type {JWTAlgorithm} */ (header.alg))) {
    throw new JWTError(`Algorithm "${String(header.alg)}" is not allowed`, { code: "ERR_JWT_ALGORITHM" });
  }
  const [head, body, signature] = String(token).split(".");
  const expected = hmac(`${head}.${body}`, secret, { algorithm: `sha${header.alg.slice(2)}`, encoding: "base64url" });
  if (!safeEqual(expected, signature)) throw new JWTError("Invalid signature", { code: "ERR_JWT_SIGNATURE" });

  const now = Math.floor((options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now()) / 1000);
  const tolerance = options.clockTolerance ?? 0;
  const claims = /** @type {JWTClaims & Record<string, unknown>} */ (payload);
  if (!options.ignoreExpiration && typeof claims.exp === "number" && now - tolerance >= claims.exp) {
    throw new JWTError("Token expired", { code: "ERR_JWT_EXPIRED", expiredAt: new Date(claims.exp * 1000) });
  }
  if (typeof claims.nbf === "number" && now + tolerance < claims.nbf) throw new JWTError("Token not active yet", { code: "ERR_JWT_NOT_BEFORE" });
  if (options.maxAge !== undefined && (typeof claims.iat !== "number" || now - tolerance > claims.iat + _seconds(options.maxAge))) {
    throw new JWTError("Token is too old", { code: "ERR_JWT_EXPIRED" });
  }
  if (options.issuer !== undefined && ![options.issuer].flat().includes(/** @type {string} */ (claims.iss))) {
    throw new JWTError("Invalid issuer", { code: "ERR_JWT_CLAIM" });
  }
  if (options.subject !== undefined && claims.sub !== options.subject) throw new JWTError("Invalid subject", { code: "ERR_JWT_CLAIM" });
  if (options.audience !== undefined) {
    const expectedAud = [options.audience].flat();
    const actualAud = [claims.aud ?? []].flat();
    if (!actualAud.some((aud) => expectedAud.includes(/** @type {string} */ (aud)))) throw new JWTError("Invalid audience", { code: "ERR_JWT_CLAIM" });
  }
  return /** @type {P & JWTClaims} */ (payload);
}

/**
 * A new two-factor secret, in the Base32 format authenticator apps expect.
 * Store it encrypted.
 *
 * @example
 * user.totpSecret = crypto.totpSecret();
 *
 * @param {number} [bytes=20]
 * @returns {string}
 */
function totpSecret(bytes = 20) {
  return _base32Encode(_crypto().randomBytes(bytes));
}

/**
 * The current 6-digit code for a two-factor secret, as shown by
 * authenticator apps.
 *
 * @example
 * crypto.totp(user.totpSecret); // "492039"
 *
 * @param {string} secret
 * @param {TOTPOptions} [options]
 * @returns {string}
 */
function totp(secret, options = {}) {
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  const time = options.time instanceof Date ? options.time.getTime() : options.time ?? Date.now();
  const counter = Math.floor(time / 1000 / period);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = _crypto().createHmac((options.algorithm ?? "SHA1").toLowerCase(), _base32Decode(secret)).update(buffer).digest();
  const off = digest[digest.length - 1] & 0x0f;
  const code = ((digest[off] & 0x7f) << 24) | (digest[off + 1] << 16) | (digest[off + 2] << 8) | digest[off + 3];
  return String(code % 10 ** digits).padStart(digits, "0");
}

/**
 * Checks a code typed by a user. Codes from the neighbouring periods are
 * accepted too, to cope with clock drift.
 *
 * @example
 * if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
 *
 * @param {string} token Spaces are ignored.
 * @param {string} secret
 * @param {VerifyTOTPOptions} [options]
 * @returns {boolean}
 */
function verifyTOTP(token, secret, options = {}) {
  const code = String(token).replace(/\s/g, "");
  const digits = options.digits ?? 6;
  if (!new RegExp(`^\\d{${digits}}$`).test(code)) return false;
  const period = options.period ?? 30;
  const time = options.time instanceof Date ? options.time.getTime() : options.time ?? Date.now();
  const window = options.window ?? 1;
  let valid = false;
  for (let i = -window; i <= window; i++) {
    if (safeEqual(totp(secret, { ...options, time: time + i * period * 1000 }), code)) valid = true;
  }
  return valid;
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
  return _crypto().randomInt(Math.ceil(min), Math.floor(max) + 1);
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
  const buffer = Buffer.from(String(text).replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return options.output === "buffer" ? buffer : buffer.toString("utf8");
}

module.exports = {
  hash,
  hmac,
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
  totpSecret,
  totp,
  verifyTOTP,
  totpURI,
  randomBytes,
  randomInt,
  toBase64,
  fromBase64,
};
