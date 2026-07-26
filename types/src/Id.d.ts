/**
 * Generates a random UUID v4.
 *
 * @example
 * nodeComfort.id.uuid(); // "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
 *
 * @returns {string} A UUID v4 string.
 */
export function uuid(): string;
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
export function nano(size?: number, alphabet?: string): string;
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
export function ulid(time?: number): string;
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
export function token(bytes?: number, encoding?: "hex" | "base64" | "base64url" | "base58"): string;
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
export function code(length?: number, alphabet?: string): string;
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
export function hash(value: string | Buffer, options?: {
    algorithm?: string;
    encoding?: "hex" | "base64" | "base64url";
}): string;
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
export function hmac(value: string | Buffer, secret: string | Buffer, options?: {
    algorithm?: string;
    encoding?: "hex" | "base64" | "base64url";
}): string;
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
export function safeEqual(a: string | Buffer, b: string | Buffer): boolean;
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
export function seq(prefix?: string): string;
//# sourceMappingURL=Id.d.ts.map