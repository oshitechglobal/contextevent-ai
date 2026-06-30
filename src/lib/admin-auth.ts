// Uses the Web Crypto API (globalThis.crypto.subtle) exclusively rather than
// Node's `crypto` module, because this code is imported by middleware.ts,
// which runs on Next.js's Edge Runtime — a JS runtime that does NOT support
// Node's `crypto` module but DOES support Web Crypto. Using Web Crypto here
// makes this file work identically whether it's called from middleware
// (Edge Runtime) or from a Node-runtime API route, with no special-casing.

const SESSION_COOKIE_NAME = "ce_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET (or ADMIN_PASSWORD as a fallback) must be set to enable admin authentication."
    );
  }
  return secret;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const digestBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return Array.from(new Uint8Array(digestBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Creates a signed session token: `${expiryTimestamp}.${hmacSignature}`.
 * No external session store needed — the signature itself proves the token
 * was issued by this server and the expiry is embedded and tamper-checked.
 */
export async function createAdminSessionToken(): Promise<string> {
  const secret = getSecret();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = await hmacSha256Hex(secret, payload);
  return `${expiresAt}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const payload = `admin.${expiresAt}`;
  const expectedSignature = await hmacSha256Hex(secret, payload);

  if (expectedSignature.length !== signature.length) return false;

  // Hash-compare rather than direct string equality to avoid short-circuit
  // timing variance leaking signature byte positions.
  const [expectedDigest, actualDigest] = await Promise.all([
    sha256Hex(expectedSignature),
    sha256Hex(signature),
  ]);
  return expectedDigest === actualDigest;
}

export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not configured on the server.");
  }

  const [expectedDigest, candidateDigest] = await Promise.all([
    sha256Hex(expected),
    sha256Hex(candidate),
  ]);
  return expectedDigest === candidateDigest;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
