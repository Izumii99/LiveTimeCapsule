const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatDateOnly(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return dateStr;
  }

  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const month = MONTH_NAMES[monthIndex];

  if (!month || !Number.isInteger(year) || !Number.isInteger(day)) {
    return dateStr;
  }

  return `${month} ${day}, ${year}`;
}

export function formatDateTime(isoStr: string): string {
  const parsed = new Date(isoStr);
  if (Number.isNaN(parsed.getTime())) {
    return isoStr;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatCountdown(targetIso: string, nowMs: number): string {
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) {
    return "00m 00s";
  }

  const remainingSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(remainingSec / 86400);
  const hours = Math.floor((remainingSec % 86400) / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const seconds = remainingSec % 60;

  const pad = (value: number) => String(value).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return `${pad(minutes)}m ${pad(seconds)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(0)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

export function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMinDatetimeLocalValue(): string {
  const now = new Date(Date.now() + 5 * 60 * 1000);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
