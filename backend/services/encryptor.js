import crypto from 'crypto';
import { generateDataKey, generateSalt, deriveKey, encryptDataKey, decryptDataKey } from '../utils/crypto.js';

/**
 * Encrypt a single chunk using AES-256-GCM
 * Returns { encrypted, iv, authTag } with buffers
 */
export function encryptChunk(chunkBuffer, dataKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(chunkBuffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt a single chunk using AES-256-GCM
 */
export function decryptChunk(encryptedBuffer, ivHex, authTagHex, dataKey) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    dataKey,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  return decrypted;
}

/**
 * Encrypt all chunks for a file.
 * Generates a unique data key, encrypts each chunk, then wraps the data key.
 *
 * @param {Array} chunks - Array of { buffer, index, checksum, ... }
 * @param {string} secretPhrase - User's secret phrase for key derivation
 * @returns {Object} { encryptedChunks, encryptedDataKey, salt }
 */
export function encryptAllChunks(chunks, secretPhrase) {
  // Generate per-file data key
  const dataKey = generateDataKey();
  const salt = generateSalt();

  // Derive master key from user's secret phrase
  const masterKey = deriveKey(secretPhrase, salt);

  // Encrypt each chunk with the data key
  const encryptedChunks = chunks.map((chunk) => {
    const { encrypted, iv, authTag } = encryptChunk(chunk.buffer, dataKey);
    return {
      index: chunk.index,
      encrypted,
      iv,
      authTag,
      originalSize: chunk.size,
      encryptedSize: encrypted.length,
      checksum: chunk.checksum, // Original plaintext checksum for integrity
    };
  });

  // Wrap the data key with the master key
  const wrappedKey = encryptDataKey(dataKey, masterKey);

  return {
    encryptedChunks,
    encryptedDataKey: `${wrappedKey.encrypted}:${wrappedKey.iv}:${wrappedKey.authTag}`,
    salt: salt.toString('hex'),
  };
}

/**
 * Recover the data key for decryption during retrieval
 */
export function recoverDataKey(encryptedDataKeyStr, secretPhrase, saltHex) {
  const [encrypted, iv, authTag] = encryptedDataKeyStr.split(':');
  const masterKey = deriveKey(secretPhrase, saltHex);
  return decryptDataKey(encrypted, iv, authTag, masterKey);
}
