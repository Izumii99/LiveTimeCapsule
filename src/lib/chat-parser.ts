import { CAPSULE_CONFIG } from "../config/capsule.ts";
import type { ChatMessageLine } from "./types.ts";

export type ChatSide = "me" | "friend" | "other";

const BRACKET_LOG_REGEX = /^\[([^\]]+)\]\s+([^:]+):\s*(.*)$/;
const SIMPLE_COLON_REGEX = /^([^:\[\]]{1,40}):\s+(.+)$/;
const CHAT_RECORD_FILENAME_REGEX = /^Chat_Record_(.*?)_(\d{4}-\d{2})/i;

const ME_IDENTIFIERS = new Set(
  [CAPSULE_CONFIG.me, ...CAPSULE_CONFIG.meAliases].map((name) =>
    name.normalize("NFKC").trim().toLowerCase()
  )
);

const FRIEND_IDENTIFIERS = new Set(
  [CAPSULE_CONFIG.friend, ...CAPSULE_CONFIG.friendAliases].map((name) =>
    name.normalize("NFKC").trim().toLowerCase()
  )
);

export function normalizeSenderName(raw: string): string {
  const normalized = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((word) => {
      if (!word) {
        return "";
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function resolveChatSide(sender: string): ChatSide {
  const lower = sender.normalize("NFKC").trim().toLowerCase();
  if (!lower) {
    return "other";
  }

  if (ME_IDENTIFIERS.has(lower)) {
    return "me";
  }

  if (FRIEND_IDENTIFIERS.has(lower)) {
    return "friend";
  }

  for (const id of ME_IDENTIFIERS) {
    if (id.length >= 3 && lower.includes(id)) {
      return "me";
    }
  }

  for (const id of FRIEND_IDENTIFIERS) {
    if (id.length >= 3 && lower.includes(id)) {
      return "friend";
    }
  }

  return "other";
}

export function splitDateTime(dateTime?: string): { date: string; time: string } {
  if (!dateTime) {
    return { date: "", time: "" };
  }

  const trimmed = dateTime.trim();
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex === -1) {
    return { date: trimmed, time: "" };
  }

  return {
    date: trimmed.slice(0, commaIndex).trim(),
    time: trimmed.slice(commaIndex + 1).trim(),
  };
}

export function deriveTitleFromFilename(filename: string): string {
  const baseName = filename.replace(/^.*[\\/]/, "");
  const match = baseName.match(CHAT_RECORD_FILENAME_REGEX);
  if (match) {
    const cleanName = normalizeSenderName(match[1].replace(/[_-]+/g, " "));
    const period = match[2];
    return cleanName ? `${cleanName} (${period})` : period;
  }

  const withoutExt = baseName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExt.normalize("NFKC").replace(/[_]+/g, " ").trim();
  return cleaned || "Imported Chat";
}

export function getMessageSignature(msg: ChatMessageLine): string {
  return `${msg.date_time ?? ""}|${msg.sender}|${msg.text}`;
}

export function mergeChatMessages(
  existing: ChatMessageLine[],
  incoming: ChatMessageLine[]
): {
  merged: ChatMessageLine[];
  addedCount: number;
  duplicatesSkipped: number;
} {
  const seen = new Set(existing.map(getMessageSignature));
  const merged = [...existing];
  let addedCount = 0;
  let duplicatesSkipped = 0;

  for (const msg of incoming) {
    const sig = getMessageSignature(msg);
    if (seen.has(sig)) {
      duplicatesSkipped += 1;
      continue;
    }
    seen.add(sig);
    merged.push(msg);
    addedCount += 1;
  }

  return { merged, addedCount, duplicatesSkipped };
}

export function parseRawChatLog(rawText: string): {
  messages: ChatMessageLine[];
  duplicatesSkipped: number;
} {
  const lines = rawText.replace(/^\uFEFF/, "").split(/\r?\n/);
  const parsed: ChatMessageLine[] = [];
  let usesBracketFormat = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const bracketMatch = line.match(BRACKET_LOG_REGEX);
    if (bracketMatch) {
      usesBracketFormat = true;
      const dateTime = bracketMatch[1].trim();
      const sender = normalizeSenderName(bracketMatch[2]);
      const text = bracketMatch[3].trim();

      if (sender && text) {
        parsed.push({
          sender,
          text,
          date_time: dateTime,
        });
      }
      continue;
    }

    // Continuation line (e.g. [Sticker] or wrapped multi-line message)
    if (parsed.length > 0 && line.startsWith("[") && line.endsWith("]") && !line.includes(" ")) {
      parsed[parsed.length - 1].text += `\n${line}`;
      continue;
    }

    if (!usesBracketFormat) {
      const colonMatch = line.match(SIMPLE_COLON_REGEX);
      if (colonMatch) {
        const sender = normalizeSenderName(colonMatch[1]);
        const text = colonMatch[2].trim();
        if (sender && text) {
          parsed.push({ sender, text });
          continue;
        }
      }
    }

    if (parsed.length > 0) {
      parsed[parsed.length - 1].text += `\n${line}`;
    }
  }

  const { merged, duplicatesSkipped } = mergeChatMessages([], parsed);
  return { messages: merged, duplicatesSkipped };
}
