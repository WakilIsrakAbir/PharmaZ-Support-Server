import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
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
