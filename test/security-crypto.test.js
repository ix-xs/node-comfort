"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nodeCrypto = require("node:crypto");
const nc = require("..");

const { crypto } = nc;
const noArgon2 = { skip: typeof nodeCrypto.argon2 !== "function" };

const SECRET = "a-shared-secret-of-at-least-32-bytes!";

/** @param {() => unknown} fn */
const codeOf = (fn) => {
  try {
    fn();
    return "no error";
  } catch (error) {
    if (!(error instanceof nc.errors.JWTError)) throw error;
    return error.code;
  }
};

/**
 * An HS256 token signed with whatever bytes the attacker has.
 * @param {string | Buffer} key
 * @param {Record<string, unknown>} [header]
 * @param {Record<string, unknown>} [payload]
 */
const hs256 = (key, header = { alg: "HS256", typ: "JWT" }, payload = { sub: "admin" }) => {
  const signed = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  return `${signed}.${nodeCrypto.createHmac("sha256", key).update(signed).digest("base64url")}`;
};

/**
 * A scrypt hash written by hand, to try settings hashPassword() refuses to make.
 * @param {string} password
 * @param {{ ln: number, r: number, p: number, salt: Buffer, keyLength: number }} settings
 */
const scryptHash = (password, { ln, r, p, salt, keyLength }) => {
  const key = nodeCrypto.scryptSync(password, salt, keyLength, { N: 2 ** ln, r, p, maxmem: 2 ** 31 });
  return `$scrypt$ln=${ln},r=${r},p=${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
};

describe("crypto security: JWT keys", () => {
  const { publicKey } = nodeCrypto.generateKeyPairSync("ed25519", { publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });

  it("finding 1: a public key in disguise is never an HMAC secret", () => {
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(publicKey)]);
    assert.equal(codeOf(() => crypto.verifyJWT(hs256(bom), bom)), "ERR_JWT_ALGORITHM", "PEM bytes with a BOM");
    assert.equal(codeOf(() => crypto.verifyJWT(hs256(`﻿${publicKey}`), `﻿${publicKey}`)), "ERR_JWT_ALGORITHM", "PEM text with a BOM");
    const preamble = `Bag Attributes\n    localKeyID: 01 02 03\nsubject=/CN=api.example.com\n${publicKey}`;
    assert.equal(codeOf(() => crypto.verifyJWT(hs256(preamble), preamble)), "ERR_JWT_ALGORITHM", "PEM text with an OpenSSL preamble");
    assert.equal(codeOf(() => crypto.verifyJWT(hs256(Buffer.from(preamble)), Buffer.from(preamble))), "ERR_JWT_ALGORITHM", "PEM bytes with an OpenSSL preamble");

    const der = nodeCrypto.createPublicKey(publicKey).export({ format: "der", type: "spki" });
    assert.throws(() => crypto.verifyJWT(hs256(der), der), TypeError, "DER bytes of an SPKI public key");
    const body = der.toString("base64");
    assert.throws(() => crypto.verifyJWT(hs256(body), body), TypeError, "the Base64 body of a PEM");
    const rsa = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "der", type: "pkcs1" });
    assert.throws(() => crypto.verifyJWT(hs256(rsa), rsa), TypeError, "DER bytes of a PKCS#1 public key");
    assert.throws(() => crypto.signJWT({}, der), TypeError);
    assert.throws(() => crypto.signJWT({}, `${"x".repeat(40)}-----BEGIN nothing`), TypeError);
  });

  it("finding 1: an HS secret has at least 32 bytes, to sign and to verify", () => {
    const short = "your-256-bit-secret";
    assert.throws(() => crypto.signJWT({}, short), { name: "TypeError", message: /32 bytes.*generateKey\(\)/ });
    assert.throws(() => crypto.verifyJWT(hs256(short), short), { name: "TypeError", message: /32 bytes/ });
    assert.throws(() => crypto.signJWT({}, Buffer.alloc(31, 1)), TypeError);
    assert.throws(() => crypto.signJWT({}, nodeCrypto.createSecretKey(Buffer.alloc(16, 1))), TypeError);
    assert.throws(() => crypto.signJWT({}, { kty: "oct", k: Buffer.alloc(16, 1).toString("base64url") }), TypeError);

    const key = crypto.generateKey();
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "1" }, key), key).sub, "1");
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "2" }, SECRET), SECRET).sub, "2");
    const bytes = nodeCrypto.randomBytes(32);
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "3" }, bytes), bytes).sub, "3");
    const hex = nodeCrypto.randomBytes(32).toString("hex");
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "4" }, hex), hex).sub, "4", "a random secret in hex");
  });

  it("a JWK in JSON or a DER key in hex is never an HMAC secret", () => {
    const ec = nodeCrypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey;
    const json = JSON.stringify(ec.export({ format: "jwk" }));
    assert.throws(() => crypto.verifyJWT(hs256(json), json), { name: "TypeError", message: /looks like a JWK/ }, "an EC public JWK as JSON");
    assert.throws(() => crypto.signJWT({}, `  ${json}\n`), { name: "TypeError", message: /looks like a JWK/ });
    const oct = JSON.stringify({ kty: "oct", k: nodeCrypto.randomBytes(32).toString("base64url") });
    assert.throws(() => crypto.signJWT({}, oct), { name: "TypeError", message: /looks like a JWK/ }, "even a secret JWK, as text");
    const notJWK = JSON.stringify({ secret: "a-shared-secret-of-at-least-32-bytes!" });
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "5" }, notJWK), notJWK).sub, "5", "other JSON is just text");

    const rsa = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey;
    for (const type of /** @type {const} */ (["spki", "pkcs1"])) {
      const hex = rsa.export({ format: "der", type }).toString("hex");
      assert.throws(() => crypto.verifyJWT(hs256(hex), hex), { name: "TypeError", message: /looks like a public or private key/ }, `RSA ${type} DER in hex`);
      assert.throws(() => crypto.verifyJWT(hs256(hex.toUpperCase()), hex.toUpperCase()), TypeError, `RSA ${type} DER in upper-case hex`);
    }
    const ecHex = ec.export({ format: "der", type: "spki" }).toString("hex");
    assert.throws(() => crypto.verifyJWT(hs256(ecHex), ecHex), TypeError, "EC SPKI DER in hex");
    const pemHex = Buffer.from(/** @type {string} */ (ec.export({ format: "pem", type: "spki" }))).toString("hex");
    assert.throws(() => crypto.verifyJWT(hs256(pemHex), pemHex), TypeError, "a PEM in hex");
  });

  it("a Buffer secret is checked once, and again if its bytes change", () => {
    const secret = nodeCrypto.randomBytes(32);
    secret[0] = 0x30; // starts like DER, so the check isn't skipped
    const token = crypto.signJWT({ sub: "1" }, secret);
    assert.equal(crypto.verifyJWT(token, secret).sub, "1");
    assert.equal(crypto.verifyJWT(token, secret).sub, "1", "from the cache");

    const der = nodeCrypto.generateKeyPairSync("ed25519").publicKey.export({ format: "der", type: "spki" });
    const bytes = Buffer.alloc(der.length, 1);
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "2" }, bytes), bytes).sub, "2");
    der.copy(bytes);
    // the same object, now holding a public key: the cached answer no longer applies
    assert.throws(() => crypto.verifyJWT(hs256(bytes), bytes), TypeError);

    const view = new Uint8Array(40).fill(7);
    const signed = crypto.signJWT({ sub: "3" }, view);
    assert.equal(crypto.verifyJWT(signed, view).sub, "3");
    view.fill(8);
    assert.equal(codeOf(() => crypto.verifyJWT(signed, view)), "ERR_JWT_SIGNATURE", "the old bytes aren't kept");
    assert.equal(crypto.verifyJWT(crypto.signJWT({ sub: "4" }, view), Buffer.alloc(40, 8)).sub, "4");
  });
});

describe("crypto security: JWT verification", () => {
  it("finding 2: clockTolerance and now can't turn the expiry checks off", () => {
    const expired = crypto.signJWT({}, SECRET, { expiresIn: -10 });
    const early = crypto.signJWT({}, SECRET, { notBefore: "1h" });
    for (const clockTolerance of [NaN, -1, Infinity, "60", "soon", null, {}]) {
      assert.throws(() => crypto.verifyJWT(expired, SECRET, { clockTolerance: /** @type {any} */ (clockTolerance) }), TypeError, String(clockTolerance));
      assert.throws(() => crypto.verifyJWT(early, SECRET, { clockTolerance: /** @type {any} */ (clockTolerance) }), TypeError, String(clockTolerance));
    }
    for (const now of [NaN, Infinity, new Date("not a date"), "2030-01-01", null]) {
      assert.throws(() => crypto.verifyJWT(expired, SECRET, { now: /** @type {any} */ (now) }), TypeError, String(now));
    }
    assert.equal(codeOf(() => crypto.verifyJWT(expired, SECRET, { clockTolerance: 60 })), "no error");
    assert.equal(codeOf(() => crypto.verifyJWT(expired, SECRET, { clockTolerance: "1m" })), "no error");
    assert.equal(codeOf(() => crypto.verifyJWT(expired, SECRET, { clockTolerance: "5s" })), "ERR_JWT_EXPIRED");
    assert.equal(codeOf(() => crypto.verifyJWT(expired, SECRET, { now: new Date(Date.now() - 60_000) })), "no error");
  });

  it("finding 3: a signature has only one spelling", async () => {
    const { publicKey, privateKey } = await crypto.generateKeyPair("EdDSA");
    const token = crypto.signJWT({ sub: "42" }, privateKey);
    assert.equal(crypto.verifyJWT(token, publicKey).sub, "42");
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // 64 bytes take 86 characters, and the last one carries 4 unused bits.
    const flipped = `${token.slice(0, -1)}${alphabet[alphabet.indexOf(token.at(-1) ?? "A") ^ 1]}`;
    const inserted = `${token.slice(0, -signature.length)}${signature.slice(0, 10)}*${signature.slice(10)}`;
    for (const variant of [`${token}=`, `${token}==`, `${token}!!`, inserted, flipped]) {
      assert.equal(codeOf(() => crypto.verifyJWT(variant, publicKey)), "ERR_JWT_MALFORMED", variant.slice(-12));
    }
    const [header, payload] = token.split(".");
    assert.equal(codeOf(() => crypto.verifyJWT(`${header}=.${payload}.${signature}`, publicKey)), "ERR_JWT_MALFORMED");
    assert.equal(codeOf(() => crypto.verifyJWT(`${header}.${payload}+.${signature}`, publicKey)), "ERR_JWT_MALFORMED");
    assert.throws(() => crypto.decodeJWT(`${token}=`), { code: "ERR_JWT_MALFORMED" });
  });

  it("finding 4: crit and typ headers are checked", () => {
    const critical = hs256(SECRET, { alg: "HS256", crit: ["b64"], b64: true });
    assert.equal(codeOf(() => crypto.verifyJWT(critical, SECRET)), "ERR_JWT_CLAIM");
    assert.equal(codeOf(() => crypto.verifyJWT(critical, SECRET, { crit: ["other"] })), "ERR_JWT_CLAIM");
    assert.equal(codeOf(() => crypto.verifyJWT(critical, SECRET, { crit: ["b64"] })), "no error");
    const absent = hs256(SECRET, { alg: "HS256", crit: ["b64"] });
    assert.equal(codeOf(() => crypto.verifyJWT(absent, SECRET, { crit: ["b64"] })), "ERR_JWT_CLAIM", "listed in crit but missing from the header");
    for (const crit of [[], "b64", [1]]) {
      assert.equal(codeOf(() => crypto.verifyJWT(hs256(SECRET, { alg: "HS256", crit, b64: true }), SECRET, { crit: ["b64"] })), "ERR_JWT_CLAIM", JSON.stringify(crit));
    }
    assert.throws(() => crypto.verifyJWT(critical, SECRET, { crit: /** @type {any} */ ("b64") }), TypeError);

    const plain = crypto.signJWT({ sub: "1" }, SECRET);
    assert.equal(codeOf(() => crypto.verifyJWT(plain, SECRET, { typ: "at+jwt" })), "ERR_JWT_CLAIM");
    assert.equal(codeOf(() => crypto.verifyJWT(plain, SECRET, { typ: "jwt" })), "no error");
    assert.equal(codeOf(() => crypto.verifyJWT(plain, SECRET, { typ: "application/JWT" })), "no error");
    const access = crypto.signJWT({ sub: "1" }, SECRET, { header: { typ: "at+jwt" } });
    assert.equal(codeOf(() => crypto.verifyJWT(access, SECRET, { typ: "AT+JWT" })), "no error");
    assert.equal(codeOf(() => crypto.verifyJWT(access, SECRET, { typ: "JWT" })), "ERR_JWT_CLAIM");
    assert.equal(codeOf(() => crypto.verifyJWT(hs256(SECRET, { alg: "HS256" }), SECRET, { typ: "JWT" })), "ERR_JWT_CLAIM", "a token without typ");
    assert.throws(() => crypto.verifyJWT(plain, SECRET, { typ: /** @type {any} */ (1) }), TypeError);
  });
});

describe("crypto security: TOTP", () => {
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // "12345678901234567890"

  it("finding 5: empty and short secrets are refused", () => {
    assert.throws(() => crypto.totp(""), TypeError);
    assert.throws(() => crypto.verifyTOTP(crypto.totp(rfcSecret), ""), TypeError);
    assert.throws(() => crypto.totp("GEZDGNBVGY3TQOJ"), { name: "TypeError", message: /10 bytes/ }, "9 bytes");
    assert.throws(() => crypto.totpStep("123456", "GEZDGNBVGY3TQOJ"), TypeError, "9 bytes");
    assert.throws(() => crypto.totp(/** @type {any} */ (undefined)), TypeError);
    assert.equal(crypto.totp("GEZDGNBVGY3TQOJQGEZDGNBV", { time: 0 }).length, 6, "15 bytes is enough");
    assert.throws(() => crypto.totpSecret(10), RangeError);
    assert.throws(() => crypto.totpSecret(15), RangeError);
    assert.match(crypto.totpSecret(16), /^[A-Z2-7]{26}$/);
  });

  it("80-bit secrets (16 Base32 characters) from older setups still work", () => {
    const old = "JBSWY3DPEHPK3PXP"; // "Hello!" and 0xdeadbeef
    const time = 1_700_000_000_000;
    const counter = Buffer.alloc(8);
    counter.writeUInt32BE(Math.floor(time / 30_000), 4);
    const digest = nodeCrypto.createHmac("sha1", Buffer.from("48656c6c6f21deadbeef", "hex")).update(counter).digest();
    const offset = digest[19] & 0x0f;
    const expected = String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
    assert.equal(crypto.totp(old, { time }), expected);
    assert.equal(crypto.verifyTOTP(expected, old, { time }), true);
    assert.equal(crypto.totpStep(expected, old, { time }), Math.floor(time / 30_000));
    assert.equal(crypto.totp("jbsw y3dp ehpk 3pxp", { time }), expected, "lower case, in groups");
    assert.throws(() => crypto.totpSecret(10), RangeError, "new secrets still need 16 bytes");
  });

  it("finding 5: the window is an integer from 0 to 10", () => {
    const code = crypto.totp(rfcSecret, { time: 59_000 });
    for (const window of [11, -1, 1.5, NaN, Infinity]) {
      assert.throws(() => crypto.verifyTOTP(code, rfcSecret, { time: 59_000, window }), RangeError, String(window));
    }
    assert.equal(crypto.verifyTOTP(code, rfcSecret, { time: 59_000, window: 0 }), true);
    assert.equal(crypto.verifyTOTP(code, rfcSecret, { time: 59_000 + 300_000, window: 10 }), true);
    assert.throws(() => crypto.verifyTOTP(code, rfcSecret, { time: NaN }), TypeError);
  });

  it("finding 5: totpStep() and after refuse a code used twice", () => {
    const time = 1_111_111_109_000;
    const step = Math.floor(time / 30_000);
    const code = crypto.totp(rfcSecret, { time });
    assert.equal(crypto.totpStep(code, rfcSecret, { time }), step);
    assert.equal(crypto.totpStep(code, rfcSecret, { time: time + 30_000 }), step, "the previous period still matches");
    assert.equal(crypto.totpStep("000000", rfcSecret, { time }), code === "000000" ? step : undefined);
    assert.equal(crypto.totpStep(/** @type {any} */ (undefined), rfcSecret, { time }), undefined);

    assert.equal(crypto.verifyTOTP(code, rfcSecret, { time, after: step - 1 }), true);
    assert.equal(crypto.verifyTOTP(code, rfcSecret, { time, after: step }), false, "replayed");
    assert.equal(crypto.verifyTOTP(code, rfcSecret, { time: time + 30_000, after: step }), false, "replayed a period later");
    const next = crypto.totp(rfcSecret, { time: time + 30_000 });
    assert.equal(crypto.totpStep(next, rfcSecret, { time: time + 30_000, after: step }), step + 1);
    assert.throws(() => crypto.verifyTOTP(code, rfcSecret, { time, after: /** @type {any} */ ("12") }), TypeError);
  });
});

describe("crypto security: passwords", () => {
  const salt = Buffer.alloc(16, 7);

  it("finding 6: a stored hash can't ask for more than 16 lanes or 2**30 of work", async () => {
    // Over the limits it throws rather than say "wrong password", so a genuine hash gets noticed and replaced.
    const tooCostly = { name: "RangeError", message: /more work than allowed.*rehash/ };
    const many = scryptHash("pw", { ln: 4, r: 1, p: 17, salt, keyLength: 32 });
    await assert.rejects(crypto.verifyPassword("pw", many), tooCostly);
    await assert.rejects(crypto.verifyPassword("wrong", many), tooCostly);
    assert.equal(await crypto.verifyPassword("pw", scryptHash("pw", { ln: 4, r: 1, p: 16, salt, keyLength: 32 })), true);
    await assert.rejects(crypto.hashPassword("pw", { cost: 4, parallelization: 17 }), RangeError);
    // 128 * 2**17 * 8 * 16 = 2**31: each lane fits in memory, all of them take too long.
    await assert.rejects(crypto.hashPassword("pw", { cost: 17, parallelization: 16 }), RangeError);
    const key = Buffer.alloc(32).toString("base64url");
    const started = Date.now();
    await assert.rejects(crypto.verifyPassword("pw", `$scrypt$ln=17,r=8,p=16$${salt.toString("base64url")}$${key}`), tooCostly);
    await assert.rejects(crypto.verifyPassword("pw", `$scrypt$ln=20,r=8,p=2$${salt.toString("base64url")}$${key}`), tooCostly);
    await assert.rejects(crypto.verifyPassword("pw", `$scrypt$ln=4,r=1,p=1024$${salt.toString("base64url")}$${key}`), tooCostly, "what 2.1 accepted");
    assert.ok(Date.now() - started < 500, "without doing the work");
    // A broken hash is still just false, over the limits or not, and so is one no version ever accepted.
    assert.equal(await crypto.verifyPassword("pw", `$scrypt$ln=4,r=1,p=1025$${salt.toString("base64url")}$${key}`), false);
    assert.equal(await crypto.verifyPassword("pw", `$scrypt$ln=21,r=8,p=1$${salt.toString("base64url")}$${key}`), false, "a lane over 1 GiB");
    assert.equal(await crypto.verifyPassword("pw", `$scrypt$ln=0,r=8,p=1$${salt.toString("base64url")}$${key}`), false);
    assert.equal(await crypto.verifyPassword("pw", `$scrypt$ln=4,r=8,p=0$${salt.toString("base64url")}$${key}`), false);
    assert.equal(await crypto.verifyPassword("pw", `$scrypt$ln=4,r=1,p=17$${salt.toString("base64url")}$${key.slice(0, 20)}`), false, "a short key");
    assert.equal(await crypto.verifyPassword("pw", `$scrypt$ln=4,r=1,p=17$AAAA$${key}`), false, "a short salt");
  });

  it("finding 6: a stored key under 16 bytes or a salt under 8 bytes is refused", async () => {
    const tiny = scryptHash("pw", { ln: 4, r: 1, p: 1, salt, keyLength: 1 });
    assert.equal(await crypto.verifyPassword("pw", tiny), false);
    assert.equal(await crypto.verifyPassword("pw", scryptHash("pw", { ln: 4, r: 1, p: 1, salt, keyLength: 15 })), false);
    assert.equal(await crypto.verifyPassword("pw", scryptHash("pw", { ln: 4, r: 1, p: 1, salt, keyLength: 16 })), true);
    assert.equal(await crypto.verifyPassword("pw", scryptHash("pw", { ln: 4, r: 1, p: 1, salt: Buffer.alloc(4, 1), keyLength: 32 })), false);
    assert.equal(await crypto.verifyPassword("pw", scryptHash("pw", { ln: 4, r: 1, p: 1, salt: Buffer.alloc(8, 1), keyLength: 32 })), true);
  });

  it("finding 6: needsRehash() wants a 32-byte key and a 16-byte salt", () => {
    const settings = { cost: 4, blockSize: 1 };
    assert.equal(crypto.needsRehash(scryptHash("pw", { ln: 4, r: 1, p: 1, salt, keyLength: 32 }), settings), false);
    assert.equal(crypto.needsRehash(scryptHash("pw", { ln: 4, r: 1, p: 1, salt, keyLength: 16 }), settings), true);
    assert.equal(crypto.needsRehash(scryptHash("pw", { ln: 4, r: 1, p: 1, salt: Buffer.alloc(8, 1), keyLength: 32 }), settings), true);
  });

  it("finding 7: safeEqual() of two empty values is false", () => {
    assert.equal(crypto.safeEqual("", ""), false);
    assert.equal(crypto.safeEqual(Buffer.alloc(0), ""), false);
    assert.equal(crypto.safeEqual("", "a"), false);
    assert.equal(crypto.safeEqual(new Uint8Array(0), new Uint8Array(0)), false);
    assert.equal(crypto.safeEqual("a", "a"), true);
  });
});

describe("crypto security: Argon2id", () => {
  const cheap = /** @type {const} */ ({ algorithm: "argon2id", memory: 64, passes: 1 });

  it("hashes to a standard PHC string and verifies", noArgon2, async () => {
    const stored = await crypto.hashPassword("hunter2 é", { algorithm: "argon2id" });
    assert.match(stored, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/);
    assert.equal(await crypto.verifyPassword("hunter2 é", stored), true);
    assert.equal(await crypto.verifyPassword("hunter3", stored), false);
    const custom = await crypto.hashPassword("pw", { ...cheap, parallelism: 2, saltLength: 8, keyLength: 16 });
    assert.match(custom, /^\$argon2id\$v=19\$m=64,t=1,p=2\$[A-Za-z0-9+/]{11}\$[A-Za-z0-9+/]{22}$/);
    assert.equal(await crypto.verifyPassword("pw", custom), true);
    // the default stays scrypt, so hashes keep working on every supported Node.js
    assert.match(await crypto.hashPassword("pw", { cost: 4 }), /^\$scrypt\$/);
  });

  it("verifies hashes from the reference implementation", noArgon2, async () => {
    // echo -n "password" | argon2 somesalt -t 2 -m 16 -p 4 -l 24
    const reference = "$argon2i$v=19$m=65536,t=2,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";
    assert.equal(await crypto.verifyPassword("password", reference), true);
    assert.equal(await crypto.verifyPassword("passwore", reference), false);
  });

  it("refuses unreasonable or broken hashes", noArgon2, async () => {
    const stored = await crypto.hashPassword("pw", cheap);
    const [, , , , saltText, keyText] = stored.split("$");
    const make = (/** @type {string} */ params, s = saltText, k = keyText) => `$argon2id$v=19$${params}$${s}$${k}`;
    assert.equal(await crypto.verifyPassword("pw", make("m=64,t=1,p=1")), true);
    for (const params of ["m=1048577,t=1,p=1", "m=64,t=11,p=1", "m=544,t=1,p=17"]) {
      await assert.rejects(crypto.verifyPassword("pw", make(params)), { name: "RangeError", message: /more work than allowed.*rehash/ }, params);
    }
    for (const params of ["m=4,t=1,p=1", "m=64,t=0,p=1", "m=64,t=1,p=0"]) {
      assert.equal(await crypto.verifyPassword("pw", make(params)), false, params);
    }
    assert.equal(await crypto.verifyPassword("pw", make("m=544,t=1,p=17", "AAAAAAA")), false, "over the limits, but broken first");
    assert.equal(await crypto.verifyPassword("pw", make("m=64,t=1,p=1", saltText, Buffer.from(keyText, "base64").subarray(0, 15).toString("base64").replace(/=+$/, ""))), false, "a short tag");
    assert.equal(await crypto.verifyPassword("pw", make("m=64,t=1,p=1", "AAAAAAA")), false, "a short salt");
    assert.equal(await crypto.verifyPassword("pw", make("m=64,t=1,p=1", saltText, "!!!")), false);
    assert.equal(await crypto.verifyPassword("pw", stored.replace("v=19", "v=16")), false);
    assert.equal(await crypto.verifyPassword("pw", stored.replace("$argon2id$", "$argon2d$")), false);
    await assert.rejects(crypto.hashPassword("pw", { ...cheap, passes: 11 }), RangeError);
    await assert.rejects(crypto.hashPassword("pw", { ...cheap, memory: 2 ** 20 + 1 }), RangeError);
    await assert.rejects(crypto.hashPassword("pw", { ...cheap, parallelism: 17 }), RangeError);
    await assert.rejects(crypto.hashPassword("pw", { algorithm: /** @type {any} */ ("bcrypt") }), TypeError);
  });

  it("needsRehash() compares algorithms and Argon2 settings", noArgon2, async () => {
    const weak = await crypto.hashPassword("pw", cheap);
    assert.equal(crypto.needsRehash(weak, { algorithm: "argon2id" }), true, "below the OWASP settings");
    assert.equal(crypto.needsRehash(weak, { algorithm: "argon2id", memory: 64, passes: 1 }), false);
    assert.equal(crypto.needsRehash(weak), true, "the wanted algorithm defaults to scrypt");
    assert.equal(crypto.needsRehash(await crypto.hashPassword("pw", { ...cheap, keyLength: 16 }), { algorithm: "argon2id", memory: 64, passes: 1 }), true);
    assert.equal(crypto.needsRehash(await crypto.hashPassword("pw", { cost: 4 }), { algorithm: "argon2id" }), true);
    assert.equal(crypto.needsRehash(weak.replace("$argon2id$", "$argon2i$"), { algorithm: "argon2id", memory: 64, passes: 1 }), true);
  });

  it("says so when this Node.js has no Argon2", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(nodeCrypto, "argon2");
    /** @type {any} */ (nodeCrypto).argon2 = undefined;
    try {
      await assert.rejects(crypto.hashPassword("pw", cheap), { code: "ERR_ARGON2_UNAVAILABLE", message: /Node\.js 24\.7/ });
      const reference = "$argon2i$v=19$m=65536,t=2,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";
      await assert.rejects(crypto.verifyPassword("password", reference), { code: "ERR_ARGON2_UNAVAILABLE", message: /Node\.js 24\.7/ });
      assert.equal(await crypto.verifyPassword("pw", scryptHash("pw", { ln: 4, r: 1, p: 1, salt: Buffer.alloc(16), keyLength: 32 })), true, "scrypt still works");
    } finally {
      if (descriptor) Object.defineProperty(nodeCrypto, "argon2", descriptor);
      else delete (/** @type {any} */ (nodeCrypto).argon2);
    }
  });
});
