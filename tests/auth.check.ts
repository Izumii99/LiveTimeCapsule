import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  SESSION_TTL_SECONDS,
  checkUnlockRateLimit,
  clearFailedUnlocks,
  createSessionToken,
  parseSessionToken,
  recordFailedUnlock,
  resolvePasscodeRole,
  verifyPasscode,
  verifySessionToken,
} from "../src/lib/auth-core.ts";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";
const NOW = 1_760_000_000_000;

// 1. Passcode & role resolution checks
assert.equal(verifyPasscode("midnight-rui", "midnight-rui"), true);
assert.equal(verifyPasscode("midnight-rui", "wrong-passcode"), false);
assert.equal(verifyPasscode("", "midnight-rui"), false);
assert.equal(verifyPasscode("midnight-rui", ""), false);

assert.equal(resolvePasscodeRole("owner-key", "owner-key", "guest-key"), "owner");
assert.equal(resolvePasscodeRole("guest-key", "owner-key", "guest-key"), "guest");
assert.equal(resolvePasscodeRole("wrong-key", "owner-key", "guest-key"), null);
assert.equal(resolvePasscodeRole("guest-key", "owner-key", ""), null);

// 2. Role-bound v2 session token checks
const ownerToken = createSessionToken(TEST_SECRET, "owner", NOW);
assert.equal(parseSessionToken(ownerToken, TEST_SECRET, NOW + 5_000), "owner");
assert.equal(verifySessionToken(ownerToken, TEST_SECRET, NOW + 5_000), true);

const guestToken = createSessionToken(TEST_SECRET, "guest", NOW);
assert.equal(parseSessionToken(guestToken, TEST_SECRET, NOW + 5_000), "guest");
assert.equal(verifySessionToken(guestToken, TEST_SECRET, NOW + 5_000), true);

// Tampering role from guest -> owner must fail HMAC check
const guestParts = guestToken.split(".");
const forgedOwner = [
  guestParts[0],
  "owner",
  guestParts[2],
  guestParts[3],
  guestParts[4],
  guestParts[5],
].join(".");
assert.equal(parseSessionToken(forgedOwner, TEST_SECRET, NOW + 5_000), null);

// Wrong secret or tampered expiry must fail
assert.equal(
  parseSessionToken(ownerToken, "different-secret-0123456789abcdef", NOW + 5_000),
  null
);
const ownerParts = ownerToken.split(".");
const tamperedExpiry = [
  ownerParts[0],
  ownerParts[1],
  ownerParts[2],
  String(Number(ownerParts[3]) + 100),
  ownerParts[4],
  ownerParts[5],
].join(".");
assert.equal(parseSessionToken(tamperedExpiry, TEST_SECRET, NOW + 5_000), null);

// Expired token must fail
const afterExpiry = NOW + (SESSION_TTL_SECONDS + 10) * 1000;
assert.equal(parseSessionToken(ownerToken, TEST_SECRET, afterExpiry), null);

// 3. Backwards-compatible legacy v1 token parses as owner
const issuedSec = Math.floor(NOW / 1000);
const expiresSec = issuedSec + SESSION_TTL_SECONDS;
const legacyPayload = `v1.${issuedSec}.${expiresSec}.legacynonce123`;
const legacySig = createHmac("sha256", TEST_SECRET)
  .update(legacyPayload, "utf8")
  .digest("base64url");
assert.equal(
  parseSessionToken(`${legacyPayload}.${legacySig}`, TEST_SECRET, NOW + 5_000),
  "owner"
);

// 4. Rate limiter checks
const client = "test-client";
clearFailedUnlocks(client);
for (let i = 0; i < 10; i += 1) {
  assert.equal(checkUnlockRateLimit(client, NOW).allowed, true);
  recordFailedUnlock(client, NOW);
}
const blocked = checkUnlockRateLimit(client, NOW + 1_000);
assert.equal(blocked.allowed, false);
assert.ok(blocked.retryAfterSeconds > 0);
clearFailedUnlocks(client);
assert.equal(checkUnlockRateLimit(client, NOW + 1_000).allowed, true);

console.log("auth-core checks passed");
