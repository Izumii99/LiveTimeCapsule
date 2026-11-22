"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, MessageSquarePlus, Plus, Trash2, X } from "lucide-react";
import { CAPSULE_CONFIG, type CapsuleAuthor } from "@/config/capsule";
import type { ChatHighlight, ChatMessageLine } from "@/lib/types";

interface AddChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (chat: ChatHighlight) => void;
}

interface DraftLine extends ChatMessageLine {
  key: number;
}

function createInitialLines(): DraftLine[] {
  return [
    { key: 1, sender: CAPSULE_CONFIG.friend, text: "" },
    { key: 2, sender: CAPSULE_CONFIG.me, text: "" },
  ];
}

export function AddChatModal({
  isOpen,
  onClose,
  onCreated,
}: AddChatModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(createInitialLines);
  const [nextKey, setNextKey] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  function resetForm() {
    setTitle("");
    setLines(createInitialLines());
    setNextKey(3);
    setErrorMessage(null);
  }

  function toggleSpeaker(lineKey: number) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== lineKey) {
          return line;
        }
        const flipped: CapsuleAuthor =
          line.sender === CAPSULE_CONFIG.me
            ? CAPSULE_CONFIG.friend
            : CAPSULE_CONFIG.me;
        return { ...line, sender: flipped };
      })
    );
  }

  function updateLineText(lineKey: number, text: string) {
    setLines((prev) =>
      prev.map((line) => (line.key === lineKey ? { ...line, text } : line))
    );
  }

  function addLine() {
    if (lines.length >= 50) {
      return;
    }

    const lastSender = lines[lines.length - 1]?.sender ?? CAPSULE_CONFIG.me;
    const nextSender: CapsuleAuthor =
      lastSender === CAPSULE_CONFIG.me
        ? CAPSULE_CONFIG.friend
        : CAPSULE_CONFIG.me;

    setLines((prev) => [...prev, { key: nextKey, sender: nextSender, text: "" }]);
    setNextKey((prev) => prev + 1);
  }

  function removeLine(lineKey: number) {
    if (lines.length <= 1) {
      return;
    }
    setLines((prev) => prev.filter((line) => line.key !== lineKey));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Give this chat highlight a short title.");
      return;
    }

    const cleanedMessages: ChatMessageLine[] = lines
      .map((line) => ({ sender: line.sender, text: line.text.trim() }))
      .filter((line) => line.text.length > 0);

    if (cleanedMessages.length === 0) {
      setErrorMessage("Write at least one chat line before saving.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          messages: cleanedMessages,
        }),
      });

      const data = (await response.json()) as {
        chat?: ChatHighlight;
        error?: string;
      };

      if (!response.ok || !data.chat) {
        throw new Error(data.error ?? "Could not save this chat highlight.");
      }

      onCreated(data.chat);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save chat highlight."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-chat-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,5,10,0.78)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="capsule-surface max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-chat-title"
              className="font-serif text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
            >
              Archive a Chat Exchange
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Tap a name pill to switch speaker between {CAPSULE_CONFIG.friend}{" "}
              and {CAPSULE_CONFIG.me}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="chat-highlight-title"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Moment title
            </label>
            <input
              id="chat-highlight-title"
              type="text"
              required
              maxLength={120}
              disabled={isSaving}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="3 AM lobby logic, matching outfit debate..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Conversation lines
              </span>
              <span className="tabular-nums text-xs text-[var(--text-muted)]">
                {lines.length} / 50
              </span>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, index) => {
                const isMe = line.sender === CAPSULE_CONFIG.me;
                return (
                  <div key={line.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleSpeaker(line.key)}
                      title="Click to switch speaker"
                      className={
                        isMe
                          ? "w-20 shrink-0 rounded-xl border border-[rgba(192,132,252,0.34)] bg-[rgba(168,85,247,0.16)] px-2.5 py-2.5 text-xs font-semibold text-[#D8B4FE] transition-colors hover:bg-[rgba(168,85,247,0.26)]"
                          : "w-20 shrink-0 rounded-xl border border-[rgba(244,114,182,0.34)] bg-[rgba(244,114,182,0.14)] px-2.5 py-2.5 text-xs font-semibold text-[#F9A8D4] transition-colors hover:bg-[rgba(244,114,182,0.24)]"
                      }
                    >
                      {line.sender}
                    </button>

                    <input
                      type="text"
                      maxLength={600}
                      disabled={isSaving}
                      value={line.text}
                      onChange={(event) =>
                        updateLineText(line.key, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          index === lines.length - 1 &&
                          line.text.trim().length > 0
                        ) {
                          event.preventDefault();
                          addLine();
                        }
                      }}
                      placeholder={`What did ${line.sender} say?`}
                      aria-label={`Line ${index + 1} by ${line.sender}`}
                      className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
                    />

                    <button
                      type="button"
                      disabled={isSaving || lines.length <= 1}
                      onClick={() => removeLine(line.key)}
                      aria-label={`Remove line ${index + 1}`}
                      className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            {lines.length < 50 ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={addLine}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add another line</span>
              </button>
            ) : null}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-button)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  <span>Save Chat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
