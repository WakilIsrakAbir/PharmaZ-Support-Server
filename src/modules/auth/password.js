import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt is built into Node and designed for passwords: slow on purpose, salted per user.
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/** Returns "salt:hash" to store in the database. */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, salt, KEY_LENGTH);

  // Compares in constant time, so response timing doesn't leak how close a guess was
  return timingSafeEqual(expected, actual);
}

// No 0/O, 1/l/I: the password is read out or typed by hand
const TEMPORARY_PASSWORD_CHARACTERS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** A one-time password for a new account, like "Kp7v-m2Qx-9hTa". */
export function createTemporaryPassword() {
  const group = () =>
    Array.from({ length: 4 }, () => TEMPORARY_PASSWORD_CHARACTERS[randomInt(TEMPORARY_PASSWORD_CHARACTERS.length)]).join("");
  return [group(), group(), group()].join("-");
}

const RESET_LINK_LIFETIME_MS = 30 * 60 * 1000;

/** A one-time forgot-password token. Email `token`, store only `tokenHash`. */
export function createResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_LINK_LIFETIME_MS) };
}

// The token is already long and random, so a fast hash is enough here (unlike passwords)
export function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
