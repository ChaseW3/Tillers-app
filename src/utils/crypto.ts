import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.BSN_ENCRYPTION_KEY!;

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("BSN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(KEY_HEX, "hex");
}

/**
 * Encrypts a BSN string. Returns a single string: iv:authTag:ciphertext (all hex).
 * Only call server-side — never in client components.
 */
export function encryptBsn(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a BSN string encrypted by encryptBsn.
 * Only call server-side in ADMIN context — never expose result to client.
 */
export function decryptBsn(encrypted: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted BSN format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
