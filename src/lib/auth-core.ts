import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "capsule_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type SessionRole = "owner" | "guest";

const TOKEN_VERSION = "v2";
const LEGACY_TOKEN_VERSION = "v1";
const MIN_SECRET_LENGTH = 16;
const MAX_CLOCK_SKEW_SECONDS = 60;

const MAX_FAILED_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ponytail: in-memory per-instance limiter; swap to Redis/Upstash if distributed brute-force becomes a concern
const failedUnlockAttempts = new Map<string, RateLimitEntry>();

function sha256Buffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function isValidRole(value: string): value is SessionRole {
  return value === "owner" || value === "guest";
}

function verifySignature(
  payload: string,
  providedSignature: string,
  secret: string
): boolean {
  const expectedSignature = signPayload(payload, secret);
  const providedBuf = Buffer.from(providedSignature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

function isWithinValidityWindow(
  issuedAtStr: string,
  expiresAtStr: string,
  nowMs: number
): boolean {
  const issuedAt = Number(issuedAtStr);
  const expiresAt = Number(expiresAtStr);
  if (!Number.isInteger(issuedAt) || !Number.isInteger(expiresAt)) {
    return false;
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  if (expiresAt <= issuedAt || nowSeconds >= expiresAt) {
    return false;
  }

  return issuedAt <= nowSeconds + MAX_CLOCK_SKEW_SECONDS;
}

export function verifyPasscode(candidate: string, expected: string): boolean {
  if (!candidate || !expected) {
    return false;
  }

  const candidateDigest = sha256Buffer(candidate);
  const expectedDigest = sha256Buffer(expected);
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function resolvePasscodeRole(
  candidate: string,
  ownerPasscode: string,
  guestPasscode = ""
): SessionRole | null {
  if (verifyPasscode(candidate, ownerPasscode)) {
    return "owner";
  }

  if (guestPasscode && verifyPasscode(candidate, guestPasscode)) {
    return "guest";
  }

  return null;
}

export function createSessionToken(
  secret: string,
  role: SessionRole = "owner",
  nowMs = Date.now()
): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error("AUTH_SECRET must be at least 16 characters long.");
  }

  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${TOKEN_VERSION}.${role}.${issuedAt}.${expiresAt}.${nonce}`;
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function parseSessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now()
): SessionRole | null {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length === 6) {
    const [version, role, issuedAtStr, expiresAtStr, nonce, providedSignature] =
      parts;
    if (
      version !== TOKEN_VERSION ||
      !isValidRole(role) ||
      !nonce ||
      !providedSignature
    ) {
      return null;
    }

    if (!isWithinValidityWindow(issuedAtStr, expiresAtStr, nowMs)) {
      return null;
    }

    const payload = `${version}.${role}.${issuedAtStr}.${expiresAtStr}.${nonce}`;
    return verifySignature(payload, providedSignature, secret) ? role : null;
  }

  // Keep existing v1 owner cookies valid until natural expiry
  if (parts.length === 5) {
    const [version, issuedAtStr, expiresAtStr, nonce, providedSignature] = parts;
    if (version !== LEGACY_TOKEN_VERSION || !nonce || !providedSignature) {
      return null;
    }

    if (!isWithinValidityWindow(issuedAtStr, expiresAtStr, nowMs)) {
      return null;
    }

    const payload = `${version}.${issuedAtStr}.${expiresAtStr}.${nonce}`;
    return verifySignature(payload, providedSignature, secret) ? "owner" : null;
  }

  return null;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now()
): boolean {
  return parseSessionToken(token, secret, nowMs) !== null;
}

export function checkUnlockRateLimit(
  clientKey: string,
  nowMs = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const entry = failedUnlockAttempts.get(clientKey);
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (nowMs >= entry.resetAt) {
    failedUnlockAttempts.delete(clientKey);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedUnlock(clientKey: string, nowMs = Date.now()): void {
  const existing = failedUnlockAttempts.get(clientKey);
  if (!existing || nowMs >= existing.resetAt) {
    failedUnlockAttempts.set(clientKey, {
      count: 1,
      resetAt: nowMs + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  existing.count += 1;
}

export function clearFailedUnlocks(clientKey: string): void {
  failedUnlockAttempts.delete(clientKey);
}
