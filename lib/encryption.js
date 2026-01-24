import crypto from 'crypto';

// AES-256 requires a 32-byte key
// Make sure your ENCRYPTION_KEY environment variable is 32 bytes (64 hex characters)
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

// Lazy evaluation - only check when actually needed
const getKeyBuffer = () => {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  if (ENCRYPTION_KEY.length === 64) {
    // Hex string (64 chars = 32 bytes)
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  } else if (ENCRYPTION_KEY.length === 32) {
    // Already 32 bytes
    return Buffer.from(ENCRYPTION_KEY);
  } else {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters or 32 characters)');
  }
};

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - The plain text to encrypt
 * @returns {string} - The encrypted text in format: iv:encryptedData
 */
export function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKeyBuffer();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV and encrypted data separated by ':'
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - The encrypted text in format: iv:encryptedData
 * @returns {string} - The decrypted plain text
 */
export function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const key = getKeyBuffer();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Generate a random 32-byte encryption key (for setup)
 * @returns {string} - A random hex string (64 characters)
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}
