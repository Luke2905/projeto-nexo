/**
 * @file localAuth.ts
 * @description Local authentication utilities using scrypt for password hashing.
 */
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 32 * 1024 * 1024;

type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

/**
 * Derives a key from the password and salt using scrypt.
 */
function deriveKey(password: string, salt: Buffer, length: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, length, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

/**
 * Hashes a plaintext password using scrypt and a random salt.
 * @param {string} password - The plaintext password to hash.
 * @returns {Promise<string>} The generated hash string containing the algorithm and parameters.
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, KEY_LENGTH, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: MAX_MEMORY });
  return ["scrypt", COST, BLOCK_SIZE, PARALLELIZATION, salt.toString("base64"), derived.toString("base64")].join("$");
}

/**
 * Verifies a plaintext password against a stored scrypt hash.
 * @param {string} password - The plaintext password to check.
 * @param {string} stored - The stored hash string.
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 */
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, cost, blockSize, parallelization, saltText, hashText] = stored.split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, "base64");
    const expected = Buffer.from(hashText, "base64");
    const derived = await deriveKey(password, salt, expected.length, { N: Number(cost), r: Number(blockSize), p: Number(parallelization), maxmem: MAX_MEMORY });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Normalizes a username for consistent checking (trimming and converting to lowercase).
 * @param {string} value - The username to normalize.
 * @returns {string} The normalized username.
 */
export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}
