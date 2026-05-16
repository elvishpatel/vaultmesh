import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;

/**
 * Derive an encryption key from a passphrase using PBKDF2
 */
export function deriveKey(passphrase, salt) {
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'hex');
  return crypto.pbkdf2Sync(passphrase, saltBuffer, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Generate a random salt
 */
export function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Generate a random data key for file encryption
 */
export function generateDataKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encrypt the file's data key with a master key (key wrapping)
 * Returns { encrypted, iv, authTag } as hex strings
 */
export function encryptDataKey(dataKey, masterKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt the file's data key with a master key (key unwrapping)
 */
export function decryptDataKey(encryptedHex, ivHex, authTagHex, masterKey) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    masterKey,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted;
}
