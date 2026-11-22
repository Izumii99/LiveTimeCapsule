import assert from "node:assert/strict";
import {
  SESSION_TTL_SECONDS,
  checkUnlockRateLimit,
  clearFailedUnlocks,
  createSessionToken,
  recordFailedUnlock,
  verifyPasscode,
  verifySessionToken,
} from "../src/lib/auth-core.ts";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";
const NOW = 1_760_000_000_000;

// 1. Passcode checks
assert.equal(verifyPasscode("midnight-rui", "midnight-rui"), true);
assert.equal(verifyPasscode("midnight-rui", "wrong-passcode"), false);
assert.equal(verifyPasscode("", "midnight-rui"), false);
assert.equal(verifyPasscode("midnight-rui", ""), false);

// 2. Signed session token checks
const token = createSessionToken(TEST_SECRET, NOW);
assert.equal(verifySessionToken(token, TEST_SECRET, NOW + 5_000), true);
assert.equal(verifySessionToken(token, "different-secret-0123456789abcdef", NOW + 5_000), false);
assert.equal(verifySessionToken(`${token}x`, TEST_SECRET, NOW + 5_000), false);
assert.equal(verifySessionToken("v1.bad.token.parts", TEST_SECRET, NOW), false);

// Tampered expiry must fail HMAC check
const parts = token.split(".");
const tampered = `${parts[0]}.${parts[1]}.${Number(parts[2]) + 100}.${parts[3]}.${parts[4]}`;
assert.equal(verifySessionToken(tampered, TEST_SECRET, NOW + 5_000), false);

// Expired token must fail
const afterExpiry = NOW + (SESSION_TTL_SECONDS + 10) * 1000;
assert.equal(verifySessionToken(token, TEST_SECRET, afterExpiry), false);

// 3. Rate limiter checks
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
