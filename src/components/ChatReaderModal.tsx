"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FilePlus2, Loader2, Search, X } from "lucide-react";
import { parseRawChatLog } from "@/lib/chat-parser";
import type { ChatHighlight } from "@/lib/types";
import { ChatBubbleStream } from "./ChatBubbleStream";
import { useToast } from "./ToastProvider";

interface ChatReaderModalProps {
  chat: ChatHighlight;
  onClose: () => void;
  onUpdated: (updated: ChatHighlight) => void;
}

export function ChatReaderModal({
  chat,
  onClose,
  onUpdated,
}: ChatReaderModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAppending, setIsAppending] = useState(false);

  const participants = useMemo(() => {
    const names = new Set<string>();
    for (const msg of chat.messages) {
      names.add(msg.sender);
    }
    return Array.from(names);
  }, [chat.messages]);

  const filteredMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return chat.messages;
    }

    return chat.messages.filter(
      (msg) =>
        msg.text.toLowerCase().includes(query) ||
        msg.sender.toLowerCase().includes(query) ||
        (msg.date_time?.toLowerCase().includes(query) ?? false)
    );
  }, [chat.messages, searchQuery]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isAppending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAppending, onClose]);

  async function handleAppendFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const validFiles = Array.from(fileList).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain"
    );

    if (validFiles.length === 0) {
      notify("Select .txt chat log files to append.", "error");
      return;
    }

    setIsAppending(true);

    try {
      const texts = await Promise.all(validFiles.map((file) => file.text()));
      const parsed = parseRawChatLog(texts.join("\n"));

      if (parsed.messages.length === 0) {
        notify("No readable chat lines found in the selected file.", "error");
        return;
      }

      const response = await fetch(`/api/chats/${encodeURIComponent(chat.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: parsed.messages }),
      });

      const data = (await response.json()) as {
        chat?: ChatHighlight;
        addedCount?: number;
        duplicatesSkipped?: number;
        error?: string;
      };

      if (!response.ok || !data.chat) {
        throw new Error(data.error ?? "Could not append messages.");
      }

      onUpdated(data.chat);

      const added = data.addedCount ?? 0;
      const skipped = data.duplicatesSkipped ?? 0;
      if (added === 0) {
        notify(`No new lines — all ${skipped} messages were already archived.`);
      } else {
        notify(
          `Appended ${added} new ${added === 1 ? "message" : "messages"}${
            skipped > 0 ? ` (${skipped} duplicates skipped)` : ""
          }.`
        );
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not append chat log.",
        "error"
      );
    } finally {
      setIsAppending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-reader-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,5,10,0.84)] p-3 backdrop-blur-sm sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isAppending) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="capsule-surface flex h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
      >
        {/* Header */}
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="chat-reader-title"
                className="truncate font-serif text-xl font-medium text-[var(--text-primary)]"
              >
                {chat.title}
              </h2>
              <p className="tabular-nums mt-0.5 text-xs text-[var(--text-muted)]">
                {participants.join(" & ")} &middot; {chat.messages.length}{" "}
                {chat.messages.length === 1 ? "message" : "messages"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                multiple
                disabled={isAppending}
                onChange={(event) => {
                  void handleAppendFiles(event.target.files);
                  event.target.value = "";
                }}
                className="sr-only"
              />

              <button
                type="button"
                disabled={isAppending}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {isAppending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FilePlus2 className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
                )}
                <span>Append .txt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isAppending}
                aria-label="Close chat reader"
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-3.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search messages, sender, or date..."
              aria-label="Search messages in this chat"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] py-2 pl-9 pr-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
            />
          </div>
        </div>

        {/* Scrollable chat transcript */}
        <div className="flex-1 overflow-y-auto bg-[#0D0B14] px-4 py-5 sm:px-6">
          {filteredMessages.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--text-muted)]">
              No messages match &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            <ChatBubbleStream messages={filteredMessages} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
