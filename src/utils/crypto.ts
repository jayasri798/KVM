/**
 * Client-Side E2EE Cryptographic Utility File for KAM
 * Uses standard browser Web Crypto API (window.crypto.subtle)
 * Implements a Hybrid Encryption Scheme:
 * 1. Generates an ephemeral AES-GCM key to encrypt the payload.
 * 2. Encrypts the ephemeral AES key with the recipient's RSA-OAEP public key.
 */

// Helper to convert ArrayBuffer or Uint8Array to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to convert ArrayBuffer or Uint8Array to Hex string (useful for debugger)
export function arrayBufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface EncryptedPayload {
  wrappedKey: string;   // Ephemeral AES key encrypted with RSA-OAEP (Base64)
  iv: string;           // Initialization Vector for AES-GCM (Base64)
  ciphertext: string;   // Ciphertext of the message encrypted with AES-GCM (Base64)
  aesKeyHex?: string;   // Placed for debug views only
}

export interface KeyPairJwk {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

/**
 * Generates an RSA-OAEP 2048-bit keypair for E2EE messaging
 */
export async function generateE2EKeyPair(): Promise<CryptoKeyPair> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment");
  }

  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Exports a CryptoKeyPair to JSON Web Key (JWK) format
 */
export async function exportKeyPairToJwk(keyPair: CryptoKeyPair): Promise<KeyPairJwk> {
  const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicKey, privateKey };
}

/**
 * Imports an RSA-OAEP public key from JWK format
 */
export async function importPublicKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

/**
 * Imports an RSA-OAEP private key from JWK format
 */
export async function importPrivateKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

/**
 * Encrypts clear text using the recipient's RSA Public Key JWK (Hybrid Scheme)
 * Returns the EncryptedPayload and metadata for visual debuggers
 */
export async function encryptMessage(
  text: string,
  recipientPublicKeyJwk: JsonWebKey
): Promise<EncryptedPayload> {
  // 1. Import recipient's RSA-OAEP public key
  const recipientPublicKey = await importPublicKeyFromJwk(recipientPublicKeyJwk);

  // 2. Generate a random ephemeral AES-GCM 256-bit key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 3. Encrypt the plaintext message with the AES key
  const encoder = new TextEncoder();
  const plaintextData = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is standard for GCM

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    plaintextData
  );

  // 4. Export the raw AES key to encrypt it with RSA
  const rawAesKeyBuffer = await window.crypto.subtle.exportKey("raw", aesKey);
  const aesKeyHex = arrayBufferToHex(rawAesKeyBuffer);

  // 5. Encrypt the AES key with the recipient's RSA Public Key
  const wrappedKeyBuffer = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    recipientPublicKey,
    rawAesKeyBuffer
  );

  // 6. Return the base64-encoded encrypted package
  return {
    wrappedKey: arrayBufferToBase64(wrappedKeyBuffer),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    aesKeyHex,
  };
}

/**
 * Decrypts E2EE payload using the recipient's RSA Private Key JWK
 */
export async function decryptMessage(
  payload: EncryptedPayload,
  userPrivateKeyJwk: JsonWebKey
): Promise<string> {
  // 1. Import user's RSA-OAEP private key
  const userPrivateKey = await importPrivateKeyFromJwk(userPrivateKeyJwk);

  // 2. Decrypt the wrapped AES key
  const wrappedKeyBuffer = base64ToArrayBuffer(payload.wrappedKey);
  const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    userPrivateKey,
    wrappedKeyBuffer
  );

  // 3. Import the AES key from raw bytes
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawAesKeyBuffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["decrypt"]
  );

  // 4. Decrypt the message ciphertext with the AES key
  const ivBuffer = base64ToArrayBuffer(payload.iv);
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(ivBuffer),
    },
    aesKey,
    ciphertextBuffer
  );

  // 5. Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
