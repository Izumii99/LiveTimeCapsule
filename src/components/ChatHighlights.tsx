"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import { formatDateTime } from "@/lib/format";
import type { ChatHighlight } from "@/lib/types";
import { AddChatModal } from "./AddChatModal";
import { useToast } from "./ToastProvider";

interface ChatHighlightsProps {
  externalAddOpen: boolean;
  onExternalAddClose: () => void;
  onOpenAdd: () => void;
}

export function ChatHighlights({
  externalAddOpen,
  onExternalAddClose,
  onOpenAdd,
}: ChatHighlightsProps) {
  const { notify } = useToast();
  const [chats, setChats] = useState<ChatHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/chats", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          chats?: ChatHighlight[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load chat highlights.");
        }
        return data.chats ?? [];
      })
      .then((loaded) => {
        if (active) {
          setChats(loaded);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Could not load chat highlights right now."
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  const handleCreated = useCallback(
    (created: ChatHighlight) => {
      setChats((prev) => [created, ...prev]);
      notify(`Saved "${created.title}" to Chat Highlights.`);
    },
    [notify]
  );

  async function handleDelete(chat: ChatHighlight) {
    setDeletingId(chat.id);

    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chat.id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete chat highlight.");
      }

      setChats((prev) => prev.filter((entry) => entry.id !== chat.id));
      setConfirmDeleteId(null);
      notify(`Deleted "${chat.title}".`);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not delete chat highlight.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-labelledby="chat-highlights-heading">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="chat-highlights-heading"
            className="font-serif text-2xl font-medium text-[var(--text-primary)] sm:text-[1.75rem]"
          >
            Chat Highlights
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Late-night quotes and chaotic exchanges between {CAPSULE_CONFIG.friend}{" "}
            and {CAPSULE_CONFIG.me}.
          </p>
        </div>

        <span className="tabular-nums text-xs font-medium text-[var(--text-muted)]">
          {chats.length} {chats.length === 1 ? "exchange" : "exchanges"}
        </span>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-4 text-sm text-[var(--danger)]"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--danger-border)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[rgba(251,113,133,0.14)]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="columns-1 gap-5 lg:columns-2">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="capsule-surface mb-5 break-inside-avoid animate-pulse rounded-2xl p-6"
            >
              <div className="h-5 w-1/2 rounded bg-[var(--bg-elevated)]" />
              <div className="mt-5 space-y-3">
                <div className="h-10 w-3/4 rounded-2xl bg-[var(--bg-elevated)]" />
                <div className="ml-auto h-10 w-2/3 rounded-2xl bg-[var(--bg-elevated)]" />
                <div className="h-10 w-1/2 rounded-2xl bg-[var(--bg-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="columns-1 gap-5 lg:columns-2">
          {/* Open Slot Invitation Card */}
          <div className="mb-5 break-inside-avoid">
            <button
              type="button"
              onClick={onOpenAdd}
              className="group flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(168,85,247,0.38)] bg-[rgba(168,85,247,0.04)] p-7 text-center transition-all duration-200 hover:border-[rgba(192,132,252,0.72)] hover:bg-[rgba(168,85,247,0.09)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(192,132,252,0.38)] bg-[rgba(168,85,247,0.14)] text-[var(--accent-soft)] transition-transform duration-200 group-hover:scale-105">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-4 font-serif text-lg font-medium text-[var(--text-primary)]">
                Archive a Chat Exchange
              </span>
              <span className="mt-1.5 max-w-[30ch] text-xs leading-relaxed text-[var(--text-secondary)]">
                {chats.length === 0
                  ? "Save a funny back-and-forth without digging through messy screenshots."
                  : "Capture another iconic conversation line between the two of you."}
              </span>
            </button>
          </div>

          {chats.map((chat) => {
            const isConfirming = confirmDeleteId === chat.id;
            const isDeleting = deletingId === chat.id;

            return (
              <article
                key={chat.id}
                className="capsule-surface mb-5 break-inside-avoid rounded-2xl p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
                  <div>
                    <h3 className="font-serif text-lg font-medium text-[var(--text-primary)]">
                      {chat.title}
                    </h3>
                    <p className="tabular-nums mt-0.5 text-xs text-[var(--text-muted)]">
                      {formatDateTime(chat.created_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDeleteId(isConfirming ? null : chat.id)
                    }
                    disabled={isDeleting}
                    aria-label={`Delete ${chat.title}`}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {isConfirming ? (
                  <div className="mt-3.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
                    <p className="text-xs font-medium text-[var(--danger)]">
                      Delete this chat highlight permanently?
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(chat)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#BE123C] disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span>Delete</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Dual-side chat bubbles */}
                <div className="mt-4 space-y-2.5">
                  {chat.messages.map((line, index) => {
                    const isMe = line.sender === CAPSULE_CONFIG.me;
                    const previousSender = chat.messages[index - 1]?.sender;
                    const showLabel = previousSender !== line.sender;

                    return (
                      <div
                        key={index}
                        className={
                          isMe
                            ? "flex flex-col items-end"
                            : "flex flex-col items-start"
                        }
                      >
                        {showLabel ? (
                          <span
                            className={
                              isMe
                                ? "mb-1 px-1 text-[11px] font-medium text-[#D8B4FE]"
                                : "mb-1 px-1 text-[11px] font-medium text-[#F9A8D4]"
                            }
                          >
                            {line.sender}
                          </span>
                        ) : null}

                        <div
                          className={
                            isMe
                              ? "max-w-[85%] rounded-2xl rounded-br-md border border-[rgba(192,132,252,0.28)] bg-[rgba(168,85,247,0.16)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-primary)]"
                              : "max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-primary)]"
                          }
                        >
                          {line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AddChatModal
        isOpen={externalAddOpen}
        onClose={onExternalAddClose}
        onCreated={handleCreated}
      />
    </section>
  );
}
