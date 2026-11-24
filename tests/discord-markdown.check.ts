import assert from "node:assert/strict";
import { parseDiscordMarkdown } from "../src/lib/discord-markdown.ts";

// 1. Italic RP action like Discord
const italicBlock = parseDiscordMarkdown("*giggle ^-^*");
assert.deepEqual(italicBlock, [
  {
    type: "line",
    nodes: [{ type: "italic", children: [{ type: "text", value: "giggle ^-^" }] }],
  },
]);

// 2. Single cute tildes (~) MUST remain literal text, NOT strikethrough
const cuteTilde = parseDiscordMarkdown(
  "nini cutie~ i will come back later at night~ say cumi"
);
assert.deepEqual(cuteTilde, [
  {
    type: "line",
    nodes: [
      {
        type: "text",
        value: "nini cutie~ i will come back later at night~ say cumi",
      },
    ],
  },
]);

// 3. Double tilde ~~strike~~, **bold**, ***bold italic***, __underline__, `code`, ||spoiler||
const mixed = parseDiscordMarkdown(
  "**bold** __under__ ~~strike~~ ***both*** `code` ||*secret*||"
);
assert.equal(mixed[0]?.nodes[0]?.type, "bold");
assert.equal(mixed[0]?.nodes[2]?.type, "underline");
assert.equal(mixed[0]?.nodes[4]?.type, "strike");
assert.equal(mixed[0]?.nodes[6]?.type, "bold");
assert.equal(mixed[0]?.nodes[8]?.type, "code");
assert.equal(mixed[0]?.nodes[10]?.type, "spoiler");

// 4. snake_case stays literal, _italic_ works at word boundary
const snake = parseDiscordMarkdown("keep_this_name and _tilt_");
assert.deepEqual(snake[0]?.nodes, [
  { type: "text", value: "keep_this_name and " },
  { type: "italic", children: [{ type: "text", value: "tilt" }] },
]);

// 5. Blockquote requires space after '>', so '>w>' stays plain emoticon
const quoteAndEmote = parseDiscordMarkdown("> quoted line\n>w> still emote");
assert.equal(quoteAndEmote[0]?.type, "quote");
assert.equal(quoteAndEmote[1]?.type, "line");

console.log("discord-markdown checks passed");
