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
 * @property {number} [clockTolerance] Seconds of slack for `exp` and `nbf` when server clocks differ.
 * @property {string | number} [maxAge] Reject tokens issued longer ago than this.
 * @property {boolean} [ignoreExpiration] Skip the `exp` check.
 * @property {Date | number} [now] What time it is. Defaults to now. Handy in tests.
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
 * @returns {number} Milliseconds.
 */
const _now = (value) => (value === undefined ? Date.now() : +value);

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
 * never equals anything.
 *
 * @example
 * if (!crypto.safeEqual(providedKey, process.env.API_KEY)) throw new Error("Forbidden");
 *
 * @param {string | Buffer | Uint8Array} a
 * @param {string | Buffer | Uint8Array} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  const x = _maybeBuffer(a);
  const y = _maybeBuffer(b);
  if (!x || !y) return false;
  const crypto = _crypto();
  // Digests have one length, whatever went in.
  return crypto.timingSafeEqual(crypto.hash("sha256", x, "buffer"), crypto.hash("sha256", y, "buffer"));
}

const _SCRYPT_HASH = /^\$scrypt\$ln=(\d{1,2}),r=(\d{1,4}),p=(\d{1,4})\$([\w-]+)\$([\w-]+)$/;
// scrypt needs 128 * N * r bytes. Past 1 GiB it's a mistake, or a doctored hash meant to stall the server.
const _SCRYPT_MAX_MEMORY = 2 ** 30;

/**
 * @param {number} ln
 * @param {number} r
 * @param {number} p
 * @returns {import("node:crypto").ScryptOptions | undefined} `undefined` if the settings are out of bounds.
 */
const _scryptOptions = (ln, r, p) => {
  if (![ln, r, p].every(Number.isInteger) || ln < 1 || ln > 30 || r < 1 || p < 1 || p > 1024) return undefined;
  const N = 2 ** ln;
  if (128 * N * r > _SCRYPT_MAX_MEMORY) return undefined;
  return { N, r, p, maxmem: 256 * N * r + 128 * r * p + 1024 * 1024 };
};

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
 * @throws {RangeError} If the settings are out of bounds, like a cost that needs more than 1 GiB of memory.
 */
async function hashPassword(password, options = {}) {
  if (typeof password !== "string") throw new TypeError(`hashPassword(): expected the password to be a string, got ${password === null ? "null" : typeof password}`);
  const ln = options.cost ?? 15;
  const r = options.blockSize ?? 8;
  const p = options.parallelization ?? 1;
  const saltLength = options.saltLength ?? 16;
  const keyLength = options.keyLength ?? 32;
  const scrypt = _scryptOptions(ln, r, p);
  if (!scrypt) throw new RangeError(`hashPassword(): cost ${ln}, blockSize ${r}, parallelization ${p} is out of bounds`);
  if (!Number.isInteger(saltLength) || saltLength < 8) throw new RangeError("hashPassword(): saltLength must be at least 8 bytes");
  if (!Number.isInteger(keyLength) || keyLength < 16 || keyLength > 128) throw new RangeError("hashPassword(): keyLength must be between 16 and 128 bytes");
  const salt = _crypto().randomBytes(saltLength);
  const key = await _scrypt(password.normalize("NFKC"), salt, keyLength, scrypt);
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
  const match = typeof password === "string" && typeof stored === "string" ? _SCRYPT_HASH.exec(stored) : null;
  if (!match) return false;
  const scrypt = _scryptOptions(Number(match[1]), Number(match[2]), Number(match[3]));
  const expected = Buffer.from(match[5], "base64url");
  if (!scrypt || !expected.length || expected.length > 128) return false;
  try {
    const actual = await _scrypt(password.normalize("NFKC"), Buffer.from(match[4], "base64url"), expected.length, scrypt);
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
  const match = _SCRYPT_HASH.exec(String(stored));
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

/** @param {unknown} key */
const _isPEM = (key) => {
  const start = typeof key === "string" ? key.slice(0, 64) : Buffer.isBuffer(key) ? key.toString("latin1", 0, 64) : "";
  return start.trimStart().startsWith("-----BEGIN ");
};

/**
 * @param {JWTKey} key
 * @param {"sign" | "verify"} use
 * @returns {_ResolvedKey}
 */
const _readKey = (key, use) => {
  const crypto = _crypto();
  if (types.isKeyObject(key)) {
    if (key.type === "secret") return { secret: key.export(), algorithms: _HS };
    if (use === "sign" && key.type !== "private") throw _keyError("Signing takes a private key, this one is public");
    return _asymmetric(use === "verify" && key.type === "private" ? crypto.createPublicKey(key) : key);
  }
  const jwk = key !== null && typeof key === "object" && !ArrayBuffer.isView(key) && typeof (/** @type {{ kty?: unknown }} */ (key).kty) === "string";
  if (jwk && /** @type {import("node:crypto").JsonWebKey} */ (key).kty === "oct") {
    return { secret: _secret(Buffer.from(String(/** @type {import("node:crypto").JsonWebKey} */ (key).k ?? ""), "base64url"), "the JWT secret"), algorithms: _HS };
  }
  if (jwk || _isPEM(key)) {
    const input = /** @type {any} */ (jwk ? { key, format: "jwk" } : key);
    let object;
    try {
      object = use === "sign" ? crypto.createPrivateKey(input) : crypto.createPublicKey(input);
    } catch (error) {
      throw _keyError(use === "sign" ? "Signing takes a private key, and this can't be read as one" : "This key can't be read", error);
    }
    return _asymmetric(object);
  }
  return { secret: _secret(key, "the JWT secret"), algorithms: _HS };
};

// Reading a PEM takes far longer than checking a signature, and a server
// uses the same few keys for every request.
/** @type {Record<"sign" | "verify", Map<string, _ResolvedKey>>} */
const _textKeys = { sign: new Map(), verify: new Map() };
/** @type {Record<"sign" | "verify", WeakMap<object, _ResolvedKey>>} */
const _objectKeys = { sign: new WeakMap(), verify: new WeakMap() };

/**
 * @param {JWTKey} key
 * @param {"sign" | "verify"} use
 * @returns {_ResolvedKey}
 */
const _jwtKey = (key, use) => {
  if (typeof key === "string") {
    if (!_isPEM(key)) return _readKey(key, use);
    let resolved = _textKeys[use].get(key);
    if (!resolved) {
      resolved = _readKey(key, use);
      if (_textKeys[use].size >= 20) _textKeys[use].clear();
      _textKeys[use].set(key, resolved);
    }
    return resolved;
  }
  // Buffers can change after the call, so only immutable key objects and JWKs are remembered.
  if (key === null || typeof key !== "object" || ArrayBuffer.isView(key)) return _readKey(key, use);
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

/**
 * @param {unknown} token
 * @returns {{ header: { alg: string, typ?: string, [key: string]: unknown }, payload: Record<string, unknown>, signature: string, signed: string }}
 */
const _decode = (token) => {
  const text = typeof token === "string" ? token : "";
  const first = text.indexOf(".");
  const second = text.indexOf(".", first + 1);
  if (first < 1 || second === -1 || text.includes(".", second + 1)) throw new JWTError("Malformed JWT: expected 3 parts", { code: "ERR_JWT_MALFORMED" });
  try {
    const header = JSON.parse(Buffer.from(text.slice(0, first), "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(text.slice(first + 1, second), "base64url").toString("utf8"));
    if (!header || typeof header !== "object" || Array.isArray(header) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("not an object");
    }
    return { header, payload, signature: text.slice(second + 1), signed: text.slice(0, second) };
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
 * @param {JWTKey} secret The shared secret, or the public key for RS, PS, ES and EdDSA tokens.
 * @param {VerifyJWTOptions} [options]
 * @returns {P & JWTClaims}
 * @throws {JWTError}
 */
function verifyJWT(token, secret, options = {}) {
  const { header, payload, signature, signed } = _decode(token);
  const key = _jwtKey(secret, "verify");
  const algorithm = /** @type {JWTAlgorithm} */ (header.alg);
  if (typeof algorithm !== "string" || !key.algorithms.includes(algorithm) || (options.algorithms !== undefined && !options.algorithms.includes(algorithm))) {
    throw new JWTError(`Algorithm "${String(header.alg)}" is not allowed`, { code: "ERR_JWT_ALGORITHM" });
  }
  if (!_signatureMatches(algorithm, signed, signature, key)) throw new JWTError("Invalid signature", { code: "ERR_JWT_SIGNATURE" });

  const claims = /** @type {JWTClaims & Record<string, unknown>} */ (payload);
  for (const name of /** @type {const} */ (["exp", "nbf", "iat"])) {
    if (claims[name] !== undefined && !Number.isFinite(claims[name])) throw new JWTError(`Invalid "${name}" claim: expected a number`, { code: "ERR_JWT_CLAIM" });
  }
  const now = Math.floor(_now(options.now) / 1000);
  const tolerance = options.clockTolerance ?? 0;
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
 * @param {number} [bytes=20]
 * @returns {string}
 */
function totpSecret(bytes = 20) {
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
  if (!(period > 0)) throw new RangeError(`The TOTP period must be a positive number of seconds, got ${period}`);
  return { digits, period, algorithm: options.algorithm ?? "SHA1", time: _now(options.time) };
};

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
  const { digits, period, algorithm, time } = _totpOptions(options);
  return _hotp(_base32Decode(secret), Math.floor(time / 1000 / period), digits, algorithm);
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
  const { digits, period, algorithm, time } = _totpOptions(options);
  const key = _base32Decode(secret);
  const code = Buffer.from(String(token).replace(/\s/g, ""));
  if (code.length !== digits) return false;
  const window = Math.max(0, Math.floor(options.window ?? 1));
  const counter = Math.floor(time / 1000 / period);
  let valid = false;
  // Every candidate is checked, so the time taken says nothing about which one matched.
  for (let i = -window; i <= window; i++) {
    if (counter + i >= 0 && _crypto().timingSafeEqual(Buffer.from(_hotp(key, counter + i, digits, algorithm)), code)) valid = true;
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
  totpURI,
  randomBytes,
  randomInt,
  toBase64,
  fromBase64,
};
