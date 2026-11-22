import {
  CAPSULE_AUTHORS,
  MEMORY_CATEGORIES,
  type CapsuleAuthor,
  type MemoryCategory,
} from "../config/capsule.ts";

export const ALLOWED_UPLOAD_FOLDERS = ["memories", "items"] as const;
export type UploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];

export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const STORAGE_PATH_REGEX =
  /^(memories|items)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png|gif)$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isAllowedFolder(value: unknown): value is UploadFolder {
  return (
    typeof value === "string" &&
    (ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(value)
  );
}

export function getExtensionForMimeType(contentType: unknown): string | null {
  if (typeof contentType !== "string") {
    return null;
  }

  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_TO_EXTENSION[normalized] ?? null;
}

export function isValidStoragePath(
  value: unknown,
  allowedFolders: readonly UploadFolder[] = ALLOWED_UPLOAD_FOLDERS
): value is string {
  if (typeof value !== "string" || !STORAGE_PATH_REGEX.test(value)) {
    return false;
  }

  const folder = value.split("/")[0] as UploadFolder;
  return allowedFolders.includes(folder);
}

export function isAllowedCategory(value: unknown): value is MemoryCategory {
  return (
    typeof value === "string" &&
    (MEMORY_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isAllowedAuthor(value: unknown): value is CapsuleAuthor {
  return (
    typeof value === "string" &&
    (CAPSULE_AUTHORS as readonly string[]).includes(value)
  );
}

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseOptionalIsoTimestamp(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return "invalid";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  return parsed.toISOString();
}

export function isMemoryLocked(
  unlockAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!unlockAt) {
    return false;
  }

  const unlockMs = Date.parse(unlockAt);
  if (Number.isNaN(unlockMs)) {
    return false;
  }

  return unlockMs > nowMs;
}

export function isExpectedSupabasePublicUrl(
  imageUrl: unknown,
  supabaseUrl: string,
  bucket: string,
  storagePath: string
): imageUrl is string {
  if (typeof imageUrl !== "string" || !supabaseUrl) {
    return false;
  }

  const base = supabaseUrl.replace(/\/+$/, "");
  const expected = `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
  return imageUrl === expected;
}

export function parseChatMessages(
  value: unknown
): Array<{ sender: CapsuleAuthor; text: string }> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const parsed: Array<{ sender: CapsuleAuthor; text: string }> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const entry = raw as { sender?: unknown; text?: unknown };
    if (!isAllowedAuthor(entry.sender) || typeof entry.text !== "string") {
      return null;
    }

    const text = entry.text.trim();
    if (text.length < 1 || text.length > 600) {
      return null;
    }

    parsed.push({ sender: entry.sender, text });
  }

  return parsed;
}
