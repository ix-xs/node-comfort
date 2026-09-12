"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const { id, crypto } = nc;

describe("id", () => {
  it("uuid and uuidv7", () => {
    assert.equal(nc.isUUID(id.uuid(), { version: 4 }), true);
    const ids = Array.from({ length: 500 }, () => id.uuidv7());
    assert.ok(ids.every((u) => nc.isUUID(u, { version: 7 })));
    assert.deepEqual([...ids].sort(), ids, "uuidv7 values are strictly increasing");
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(Math.abs(id.timestamp(ids[0]).getTime() - Date.now()) < 5000);
  });

  it("ulid is sortable, monotonic and decodable", () => {
    const ids = Array.from({ length: 500 }, () => id.ulid());
    assert.ok(ids.every((u) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(u)));
    assert.deepEqual([...ids].sort(), ids);
    assert.ok(id.ulid(1000) < id.ulid(2000));
    assert.equal(id.timestamp(id.ulid(Date.UTC(2024, 0, 1))).toISOString(), "2024-01-01T00:00:00.000Z");
    assert.equal(id.timestamp(id.uuid()), undefined);
  });

  it("nano, customAlphabet, token, code", () => {
    assert.match(id.nano(), /^[\w-]{21}$/);
    assert.equal(id.nano(8, "ab").length, 8);
    assert.equal(new Set(Array.from({ length: 2000 }, () => id.nano())).size, 2000);
    const hex = id.customAlphabet("0123456789abcdef", 12);
    assert.match(hex(), /^[0-9a-f]{12}$/);
    assert.match(hex(4), /^[0-9a-f]{4}$/);
    assert.throws(() => id.customAlphabet("a"), RangeError);
    assert.match(id.token(8), /^[0-9a-f]{16}$/);
    assert.match(id.token(16, "base64url"), /^[\w-]{22}$/);
    assert.match(id.token(16, "base58"), /^[1-9A-HJ-NP-Za-km-z]+$/);
    assert.match(id.token(10, "base32"), /^[0-9A-HJKMNP-TV-Z]{16}$/);
    assert.match(id.code(), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it("code is unbiased with a 10-character alphabet", () => {
    const counts = new Array(10).fill(0);
    for (const digit of id.code(20_000, "0123456789")) counts[Number(digit)]++;
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    assert.ok(max / min < 1.15, `distribution looks biased: ${counts.join(",")}`);
  });

  it("snowflake round-trip and Discord ids", () => {
    const flakes = Array.from({ length: 100 }, () => id.snowflake({ workerId: 3, processId: 7 }));
    assert.equal(new Set(flakes).size, 100);
    const parsed = id.parseSnowflake(flakes[0]);
    assert.equal(parsed.workerId, 3);
    assert.equal(parsed.processId, 7);
    assert.ok(Math.abs(parsed.timestamp - Date.now()) < 5000);
    assert.equal(id.parseSnowflake("175928847299117063").date.toISOString(), "2016-04-30T11:18:25.796Z");
  });

  it("seq and deprecated aliases", () => {
    assert.equal(id.seq("t"), "t-1");
    assert.equal(id.seq("t"), "t-2");
    assert.equal(id.seq("u"), "u-1");
    assert.equal(id.hash("hello"), crypto.hash("hello"));
    assert.equal(id.safeEqual("a", "a"), true);
  });
});

describe("crypto: hashing", () => {
  it("hash, hmac, safeEqual", () => {
    assert.equal(crypto.hash("hello"), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    assert.equal(crypto.hash("hello", { algorithm: "md5" }), "5d41402abc4b2a76b9719d911017c592");
    assert.equal(crypto.hash("hello", { encoding: "base64url" }).length, 43);
    assert.equal(crypto.hmac("payload", "secret"), "b82fcb791acec57859b989b430a826488ce2e479fdf92326bd0a2e8375a42ba4");
    assert.equal(crypto.safeEqual("abc", "abc"), true);
    assert.equal(crypto.safeEqual("abc", "abd"), false);
    assert.equal(crypto.safeEqual("abc", "abcd"), false);
  });
});

describe("crypto: passwords", () => {
  it("hashPassword / verifyPassword / needsRehash", async () => {
    const stored = await crypto.hashPassword("hunter2 é", { cost: 12 });
    assert.match(stored, /^\$scrypt\$ln=12,r=8,p=1\$[\w-]+\$[\w-]+$/);
    assert.equal(await crypto.verifyPassword("hunter2 é", stored), true);
    assert.equal(await crypto.verifyPassword("hunter3", stored), false);
    assert.equal(await crypto.verifyPassword("x", "not a hash"), false);
    assert.notEqual(await crypto.hashPassword("same", { cost: 10 }), await crypto.hashPassword("same", { cost: 10 }));
    assert.equal(crypto.needsRehash(stored, { cost: 12 }), false);
    assert.equal(crypto.needsRehash(stored, { cost: 15 }), true);
    assert.equal(crypto.needsRehash("md5:abc"), true);
  });
});

describe("crypto: encryption", () => {
  it("encrypt / decrypt round-trip with strings, keys and buffers", () => {
    const key = crypto.generateKey();
    assert.match(key, /^[\w-]{43}$/);
    const box = crypto.encrypt("carte 4242 €", key);
    assert.match(box, /^v1\.[\w-]+\.[\w-]+\.[\w-]+\.[\w-]*$/);
    assert.equal(crypto.decrypt(box, key), "carte 4242 €");
    assert.notEqual(crypto.encrypt("same", key), crypto.encrypt("same", key));
    const bytes = crypto.decrypt(crypto.encrypt(Buffer.from([1, 2, 3]), "a long shared secret"), "a long shared secret", { output: "buffer" });
    assert.deepEqual([...bytes], [1, 2, 3]);
  });

  it("rejects wrong secrets, tampering and wrong associated data", () => {
    const box = crypto.encrypt("secret", "k1-long-secret", { associatedData: "user:42" });
    assert.equal(crypto.decrypt(box, "k1-long-secret", { associatedData: "user:42" }), "secret");
    assert.throws(() => crypto.decrypt(box, "k2-long-secret", { associatedData: "user:42" }), /wrong secret or tampered/);
    assert.throws(() => crypto.decrypt(box, "k1-long-secret", { associatedData: "user:43" }), /wrong secret or tampered/);
    const parts = box.split(".");
    parts[4] = parts[4].slice(0, -2) + (parts[4].endsWith("AA") ? "BB" : "AA");
    assert.throws(() => crypto.decrypt(parts.join("."), "k1-long-secret", { associatedData: "user:42" }));
    assert.throws(() => crypto.decrypt("garbage", "k"), TypeError);
    assert.throws(() => crypto.encrypt("x", ""), TypeError);
  });
});

describe("crypto: JWT", () => {
  const SECRET = "your-256-bit-secret";

  it("verifies the reference token from jwt.io", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    assert.deepEqual(crypto.verifyJWT(token, SECRET), { sub: "1234567890", name: "John Doe", iat: 1516239022 });
  });

  it("signs and verifies with claims", () => {
    const token = crypto.signJWT({ role: "admin" }, SECRET, { expiresIn: "1h", issuer: "api", audience: ["web", "app"], subject: "42", algorithm: "HS512", header: { kid: "k1" } });
    const decoded = crypto.decodeJWT(token);
    assert.equal(decoded.header.alg, "HS512");
    assert.equal(decoded.header.kid, "k1");
    assert.equal(decoded.payload.exp - decoded.payload.iat, 3600);
    const payload = crypto.verifyJWT(token, SECRET, { issuer: "api", audience: "app", subject: "42" });
    assert.equal(payload.role, "admin");
  });

  it("reports precise error codes", () => {
    const code = (fn) => {
      try {
        fn();
        return "no error";
      } catch (error) {
        assert.ok(error instanceof nc.errors.JWTError);
        return error.code;
      }
    };
    const expired = crypto.signJWT({}, SECRET, { expiresIn: -10 });
    assert.equal(code(() => crypto.verifyJWT(expired, SECRET)), "ERR_JWT_EXPIRED");
    assert.equal(code(() => crypto.verifyJWT(expired, SECRET, { clockTolerance: 60 })), "no error");
    assert.equal(code(() => crypto.verifyJWT(crypto.signJWT({}, SECRET), "wrong")), "ERR_JWT_SIGNATURE");
    assert.equal(code(() => crypto.verifyJWT(crypto.signJWT({}, SECRET, { notBefore: "1h" }), SECRET)), "ERR_JWT_NOT_BEFORE");
    assert.equal(code(() => crypto.verifyJWT(crypto.signJWT({}, SECRET, { issuer: "a" }), SECRET, { issuer: "b" })), "ERR_JWT_CLAIM");
    assert.equal(code(() => crypto.verifyJWT(crypto.signJWT({}, SECRET, { algorithm: "HS384" }), SECRET, { algorithms: ["HS256"] })), "ERR_JWT_ALGORITHM");
    assert.equal(code(() => crypto.verifyJWT("a.b", SECRET)), "ERR_JWT_MALFORMED");
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from("{}").toString("base64url")}.`;
    assert.equal(code(() => crypto.verifyJWT(none, SECRET)), "ERR_JWT_ALGORITHM");
    const old = crypto.signJWT({ iat: Math.floor(Date.now() / 1000) - 7200 }, SECRET);
    assert.equal(code(() => crypto.verifyJWT(old, SECRET, { maxAge: "1h" })), "ERR_JWT_EXPIRED");
  });
});

describe("crypto: TOTP", () => {
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // "12345678901234567890"

  it("matches the RFC 6238 test vectors", () => {
    assert.equal(crypto.totp(rfcSecret, { digits: 8, time: 59_000 }), "94287082");
    assert.equal(crypto.totp(rfcSecret, { digits: 8, time: 1_111_111_109_000 }), "07081804");
    assert.equal(crypto.totp(rfcSecret, { digits: 8, time: 20_000_000_000_000 }), "65353130");
  });

  it("verifies with a drift window and builds the QR URI", () => {
    const secret = crypto.totpSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/);
    const now = Date.now();
    assert.equal(crypto.verifyTOTP(crypto.totp(secret, { time: now - 30_000 }), secret, { time: now }), true);
    assert.equal(crypto.verifyTOTP(crypto.totp(secret, { time: now - 90_000 }), secret, { time: now }), false);
    assert.equal(crypto.verifyTOTP("12ab56", secret), false);
    const uri = crypto.totpURI(secret, { label: "ada@example.com", issuer: "My App" });
    assert.ok(uri.startsWith("otpauth://totp/My%20App:ada%40example.com?secret="));
    assert.ok(uri.includes("issuer=My%20App"));
  });
});

describe("crypto: random and base64", () => {
  it("randomInt, randomBytes, base64 round-trips", () => {
    for (let i = 0; i < 100; i++) {
      const n = crypto.randomInt(1, 6);
      assert.ok(n >= 1 && n <= 6);
    }
    assert.equal(crypto.randomBytes(8).length, 8);
    assert.equal(crypto.toBase64("héllo"), "aMOpbGxv");
    assert.equal(crypto.fromBase64("aMOpbGxv"), "héllo");
    const url = crypto.toBase64(Buffer.from([251, 255]), { urlSafe: true });
    assert.equal(url, "-_8");
    assert.deepEqual([...crypto.fromBase64(url, { output: "buffer" })], [251, 255]);
  });
});
