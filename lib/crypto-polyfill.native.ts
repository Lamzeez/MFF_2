import * as Crypto from "expo-crypto";

// Polyfill WebCrypto for React Native / Expo environment
// This enables @supabase/auth-js to perform real SHA-256 PKCE code challenges
// and silences "WARN WebCrypto API is not supported"
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = {};
}

const gCrypto = globalThis.crypto as any;

if (typeof gCrypto.getRandomValues !== "function") {
  gCrypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (array) {
      return Crypto.getRandomValues(array as any) as T;
    }
    return array;
  };
}

if (!gCrypto.subtle) {
  gCrypto.subtle = {
    digest: async (algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> => {
      const algoName = typeof algorithm === "string" ? algorithm : algorithm.name;
      const normalized = (algoName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (normalized === "SHA256") {
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
      }
      if (normalized === "SHA512") {
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA512, data);
      }
      if (normalized === "SHA1") {
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA1, data);
      }
      throw new Error(`Unsupported digest algorithm: ${algoName}`);
    },
  };
}

export {};
