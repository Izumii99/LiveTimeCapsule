import assert from "node:assert/strict";
import {
  getExtensionForMimeType,
  isAllowedAuthor,
  isAllowedCategory,
  isAllowedFolder,
  isExpectedSupabasePublicUrl,
  isMemoryLocked,
  isValidDateOnly,
  isValidStoragePath,
  isValidUuid,
  parseChatMessages,
  parseOptionalIsoTimestamp,
} from "../src/lib/validation.ts";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

assert.equal(isValidUuid(VALID_UUID), true);
assert.equal(isValidUuid("not-a-uuid"), false);

assert.equal(isAllowedFolder("memories"), true);
assert.equal(isAllowedFolder("items"), true);
assert.equal(isAllowedFolder("../secrets"), false);

assert.equal(getExtensionForMimeType("image/webp"), "webp");
assert.equal(getExtensionForMimeType("image/jpeg; charset=utf-8"), "jpg");
assert.equal(getExtensionForMimeType("text/html"), null);

assert.equal(isValidStoragePath(`memories/${VALID_UUID}.webp`, ["memories"]), true);
assert.equal(isValidStoragePath(`items/${VALID_UUID}.webp`, ["memories"]), false);
assert.equal(isValidStoragePath(`memories/../${VALID_UUID}.webp`, ["memories"]), false);
assert.equal(isValidStoragePath(`memories/${VALID_UUID}.svg`, ["memories"]), false);

assert.equal(isAllowedCategory("#Moment"), true);
assert.equal(isAllowedCategory("#Unknown"), false);

assert.equal(isAllowedAuthor("Izumi"), true);
assert.equal(isAllowedAuthor("Rui"), true);
assert.equal(isAllowedAuthor("Freya"), true);
assert.equal(isAllowedAuthor("Stranger"), false);

assert.equal(isValidDateOnly("2026-11-22"), true);
assert.equal(isValidDateOnly("2026-02-30"), false);
assert.equal(isValidDateOnly("22-11-2026"), false);

assert.equal(parseOptionalIsoTimestamp(null), null);
assert.equal(parseOptionalIsoTimestamp(""), null);
assert.equal(parseOptionalIsoTimestamp("bad-date"), "invalid");
assert.ok(typeof parseOptionalIsoTimestamp("2026-12-01T00:00:00Z") === "string");

const NOW = Date.parse("2026-11-22T00:00:00Z");
assert.equal(isMemoryLocked("2026-11-23T00:00:00Z", NOW), true);
assert.equal(isMemoryLocked("2026-11-21T00:00:00Z", NOW), false);
assert.equal(isMemoryLocked(null, NOW), false);

assert.equal(
  isExpectedSupabasePublicUrl(
    `https://abc.supabase.co/storage/v1/object/public/capsule-media/memories/${VALID_UUID}.webp`,
    "https://abc.supabase.co/",
    "capsule-media",
    `memories/${VALID_UUID}.webp`
  ),
  true
);
assert.equal(
  isExpectedSupabasePublicUrl(
    `https://evil.example/memories/${VALID_UUID}.webp`,
    "https://abc.supabase.co",
    "capsule-media",
    `memories/${VALID_UUID}.webp`
  ),
  false
);

assert.deepEqual(
  parseChatMessages([
    { sender: "Rui", text: "  queue one more? ", date_time: "17/08/2026, 22.42.48" },
    { sender: "Cumi", text: "always" },
  ]),
  [
    { sender: "Rui", text: "queue one more?", date_time: "17/08/2026, 22.42.48" },
    { sender: "Cumi", text: "always" },
  ]
);
assert.equal(parseChatMessages([]), null);
assert.equal(parseChatMessages([{ sender: "   ", text: "hi" }]), null);
assert.equal(parseChatMessages([{ sender: "Rui", text: "   " }]), null);

console.log("validation checks passed");
