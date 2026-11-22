import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "capsule_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_VERSION = "v1";
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

export function verifyPasscode(candidate: string, expected: string): boolean {
  if (!candidate || !expected) {
    return false;
  }

  const candidateDigest = sha256Buffer(candidate);
  const expectedDigest = sha256Buffer(expected);
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function createSessionToken(secret: string, nowMs = Date.now()): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error("AUTH_SECRET must be at least 16 characters long.");
  }

  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${TOKEN_VERSION}.${issuedAt}.${expiresAt}.${nonce}`;
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now()
): boolean {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 5) {
    return false;
  }

  const [version, issuedAtStr, expiresAtStr, nonce, providedSignature] = parts;
  if (version !== TOKEN_VERSION || !nonce || !providedSignature) {
    return false;
  }

  const issuedAt = Number(issuedAtStr);
  const expiresAt = Number(expiresAtStr);
  if (!Number.isInteger(issuedAt) || !Number.isInteger(expiresAt)) {
    return false;
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  if (expiresAt <= issuedAt || nowSeconds >= expiresAt) {
    return false;
  }

  if (issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const payload = `${version}.${issuedAtStr}.${expiresAtStr}.${nonce}`;
  const expectedSignature = signPayload(payload, secret);

  const providedBuf = Buffer.from(providedSignature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
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
