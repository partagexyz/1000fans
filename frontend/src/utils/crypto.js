// frontend/src/utils/crypto.js
// wraps the group key with the user’s public key during onboarding, storing it in MongoDB.
const nacl = require('tweetnacl');

// Wrap a symmetric group key with the user's public key using nacl.box
function wrapKey(groupKey, userPublicKey) {
  try {
    // Ensure groupKey is a Uint8Array (assuming it's base64-encoded)
    const groupKeyBytes = Buffer.from(groupKey, 'base64');
    if (groupKeyBytes.length !== 32) {
      throw new Error('Invalid group key length');
    }

    // Parse user public key (ed25519:<base58> format)
    if (!userPublicKey.startsWith('ed25519:')) {
      throw new Error('Invalid public key format');
    }
    const publicKeyBase58 = userPublicKey.replace('ed25519:', '');
    const publicKeyBytes = Buffer.from(publicKeyBase58, 'base58');
    if (publicKeyBytes.length !== 32) {
      throw new Error('Invalid public key length');
    }

    // Generate an ephemeral keypair for wrapping
    const ephemeralKeyPair = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt the group key using the user's public key and ephemeral private key
    const encrypted = nacl.box(
      groupKeyBytes,
      nonce,
      publicKeyBytes,
      ephemeralKeyPair.secretKey
    );

    // Return the wrapped key: ephemeral public key + nonce + encrypted data
    const wrappedKey = Buffer.concat([
      Buffer.from(ephemeralKeyPair.publicKey),
      Buffer.from(nonce),
      Buffer.from(encrypted),
    ]).toString('base64');

    return wrappedKey;
  } catch (error) {
    console.error('Key wrapping error:', error.message);
    return null; // Return null to allow graceful failure
  }
}

module.exports = { wrapKey };