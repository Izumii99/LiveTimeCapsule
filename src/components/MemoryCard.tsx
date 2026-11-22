"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Lock, MessageCircle } from "lucide-react";
import { formatCountdown, formatDateOnly, formatDateTime } from "@/lib/format";
import type { MemoryItem } from "@/lib/types";
import { isMemoryLocked } from "@/lib/validation";
import { AuthorBadge } from "./AuthorBadge";

interface MemoryCardProps {
  memory: MemoryItem;
  onSelect: (memory: MemoryItem) => void;
}

export function MemoryCard({ memory, onSelect }: MemoryCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const locked = isMemoryLocked(memory.unlock_at, nowMs);

  useEffect(() => {
    if (!memory.unlock_at || !isMemoryLocked(memory.unlock_at)) {
      return;
    }

    const interval = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (!isMemoryLocked(memory.unlock_at, current)) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [memory.unlock_at]);

  return (
    <article className="mb-5 break-inside-avoid">
      <button
        type="button"
        onClick={() => onSelect(memory)}
        className="capsule-surface group block w-full overflow-hidden rounded-2xl p-3 pb-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(192,132,252,0.34)]"
      >
        <div className="relative overflow-hidden rounded-xl bg-[#0D0B14]">
          <Image
            src={memory.image_url}
            alt={locked ? "Sealed time capsule memory" : memory.title}
            width={800}
            height={600}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={
              locked
                ? "h-auto w-full scale-105 object-cover blur-xl brightness-50 transition-transform duration-300"
                : "h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            }
          />

          {locked && memory.unlock_at ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(11,10,16,0.52)] p-4 text-center backdrop-blur-[2px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(192,132,252,0.42)] bg-[rgba(168,85,247,0.2)] text-[var(--accent-soft)]">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="mt-2.5 text-xs font-semibold text-[var(--text-primary)]">
                Time Capsule Sealed
              </span>
              <span className="tabular-nums mt-1 text-sm font-semibold text-[var(--accent-soft)]">
                {formatCountdown(memory.unlock_at, nowMs)}
              </span>
              <span className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Opens {formatDateTime(memory.unlock_at)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="px-1 pt-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-[1.06rem] font-medium leading-snug text-[var(--text-primary)]">
              {memory.title}
            </h3>
          </div>

          {locked ? (
            <p className="mt-1.5 text-xs italic text-[var(--text-muted)]">
              Sealed until the unlock date arrives.
            </p>
          ) : memory.caption ? (
            <p className="mt-1.5 line-clamp-2 text-[0.84rem] leading-relaxed text-[var(--text-secondary)]">
              {memory.caption}
            </p>
          ) : null}

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <div className="flex items-center gap-2">
              <AuthorBadge author={memory.author} />
              <span className="text-xs font-medium text-[var(--accent-soft)]">
                {memory.category}
              </span>
            </div>

            <div className="tabular-nums flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
              <span>{formatDateOnly(memory.memory_date)}</span>
              {memory.notes_count > 0 ? (
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{memory.notes_count}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
