import assert from "node:assert/strict";
import {
  deriveTitleFromFilename,
  mergeChatMessages,
  normalizeSenderName,
  parseRawChatLog,
  resolveChatSide,
  serializeChatMessagesToLog,
  splitDateTime,
} from "../src/lib/chat-parser.ts";

// 1. Fancy Unicode normalization
assert.equal(normalizeSenderName("𝓡𝓾𝓲"), "Rui");
assert.equal(normalizeSenderName("  cumi  "), "Cumi");
assert.equal(normalizeSenderName("𝕃𝕦𝕟𝕖𝕝𝕝𝕖"), "Lunelle");

// 2. Smart side detection using capsule config aliases
assert.equal(resolveChatSide("Izumi"), "me");
assert.equal(resolveChatSide("Cumi"), "me");
assert.equal(resolveChatSide("Rui"), "friend");
assert.equal(resolveChatSide("Lunelle"), "friend");
assert.equal(resolveChatSide("kekski"), "friend");
assert.equal(resolveChatSide("GuestPlayer"), "other");

// 3. Date/time splitting (Indonesian BC export format)
assert.deepEqual(splitDateTime("17/08/2026, 22.42.48"), {
  date: "17/08/2026",
  time: "22.42.48",
});

// 4. Filename title extraction
assert.equal(
  deriveTitleFromFilename("Chat_Record_𝕃𝕦𝕟𝕖𝕝𝕝𝕖_2026-11.txt"),
  "Lunelle (2026-11)"
);
assert.equal(deriveTitleFromFilename("late_night_lobby.txt"), "late night lobby");

// 5. Raw BC log parsing, multi-line continuation, and deduplication
const sampleLog = [
  "[17/08/2026, 22.42.48] ℂ𝕦𝕞𝕚: hey rui",
  "[17/08/2026, 22.43.06] 𝓡𝓾𝓲: wait hold on",
  "note: still changing outfit",
  "[Sticker]",
  "[17/08/2026, 22.42.48] Cumi: hey rui",
].join("\n");

const parsed = parseRawChatLog(sampleLog);
assert.equal(parsed.messages.length, 2);
assert.equal(parsed.duplicatesSkipped, 1);
assert.equal(parsed.messages[0]?.sender, "Cumi");
assert.equal(parsed.messages[0]?.date_time, "17/08/2026, 22.42.48");
assert.equal(
  parsed.messages[1]?.text,
  "wait hold on\nnote: still changing outfit\n[Sticker]"
);

// 6. Merging with deduplication
const merged = mergeChatMessages(parsed.messages, [
  { sender: "Cumi", text: "hey rui", date_time: "17/08/2026, 22.42.48" },
  { sender: "Lunelle", text: "ok ready!", date_time: "17/08/2026, 22.44.00" },
]);
assert.equal(merged.addedCount, 1);
assert.equal(merged.duplicatesSkipped, 1);
assert.equal(merged.merged.length, 3);

// 7. Round-trip serialization for bulk editing (including mixed dated + dateless lines)
const mixedMessages = [
  ...merged.merged,
  { sender: "Rui", text: "added manually later" },
];
const serialized = serializeChatMessagesToLog(mixedMessages);
const reparsed = parseRawChatLog(serialized);
assert.deepEqual(reparsed.messages, mixedMessages);

console.log("chat-parser checks passed");
