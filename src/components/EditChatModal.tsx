"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  FileCode2,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { CAPSULE_AUTHORS, CAPSULE_CONFIG } from "@/config/capsule";
import {
  parseRawChatLog,
  resolveChatSide,
  serializeChatMessagesToLog,
} from "@/lib/chat-parser";
import type { ChatHighlight, ChatMessageLine } from "@/lib/types";
import { useBackdropClose } from "@/lib/use-backdrop-close";

export interface EditableChatLine extends ChatMessageLine {
  key: number;
}

export interface ChatEditDraft {
  title: string;
  mode: "lines" | "raw";
  lines: EditableChatLine[];
  rawText: string;
  nextKey: number;
}

interface EditChatModalProps {
  chat: ChatHighlight;
  initialDraft?: ChatEditDraft;
  onDraftChange: (chatId: string, draft: ChatEditDraft | null) => void;
  onClose: () => void;
  onSaved: (updated: ChatHighlight) => void;
}

function buildDraftFromChat(chat: ChatHighlight): ChatEditDraft {
  const lines: EditableChatLine[] = chat.messages.map((msg, idx) => ({
    key: idx + 1,
    sender: msg.sender,
    text: msg.text,
    date_time: msg.date_time,
  }));

  return {
    title: chat.title,
    mode: "lines",
    lines:
      lines.length > 0
        ? lines
        : [{ key: 1, sender: CAPSULE_CONFIG.friend, text: "" }],
    rawText: serializeChatMessagesToLog(chat.messages),
    nextKey: Math.max(lines.length + 1, 2),
  };
}

function nextSpeakerName(current: string): string {
  const idx = (CAPSULE_AUTHORS as readonly string[]).indexOf(current);
  if (idx === -1) {
    return resolveChatSide(current) === "me"
      ? CAPSULE_CONFIG.friend
      : CAPSULE_CONFIG.me;
  }

  return CAPSULE_AUTHORS[(idx + 1) % CAPSULE_AUTHORS.length];
}

export function EditChatModal({
  chat,
  initialDraft,
  onDraftChange,
  onClose,
  onSaved,
}: EditChatModalProps) {
  const prefersReducedMotion = useReducedMotion();

  const [draft, setDraft] = useState<ChatEditDraft>(
    () => initialDraft ?? buildDraftFromChat(chat)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedRaw = useMemo(
    () => parseRawChatLog(draft.rawText),
    [draft.rawText]
  );

  function updateDraft(updater: (prev: ChatEditDraft) => ChatEditDraft) {
    const next = updater(draft);
    if (next === draft) {
      return;
    }

    setDraft(next);
    onDraftChange(chat.id, next);
  }

  const backdropProps = useBackdropClose(onClose, isSaving);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  function switchMode(nextMode: "lines" | "raw") {
    if (nextMode === draft.mode) {
      return;
    }

    setErrorMessage(null);

    if (nextMode === "raw") {
      const cleaned: ChatMessageLine[] = draft.lines
        .map((line) => ({
          sender: line.sender.trim(),
          text: line.text.trim(),
          date_time: line.date_time,
        }))
        .filter((line) => line.sender.length > 0 && line.text.length > 0);

      updateDraft((prev) => ({
        ...prev,
        mode: "raw",
        rawText: serializeChatMessagesToLog(cleaned),
      }));
      return;
    }

    const parsed = parseRawChatLog(draft.rawText);
    const nextLines: EditableChatLine[] = parsed.messages.map((msg, idx) => ({
      key: idx + 1,
      sender: msg.sender,
      text: msg.text,
      date_time: msg.date_time,
    }));

    updateDraft((prev) => ({
      ...prev,
      mode: "lines",
      lines:
        nextLines.length > 0
          ? nextLines
          : [{ key: 1, sender: CAPSULE_CONFIG.friend, text: "" }],
      nextKey: Math.max(nextLines.length + 1, 2),
    }));
  }

  function handleResetDraft() {
    const fresh = buildDraftFromChat(chat);
    setDraft(fresh);
    onDraftChange(chat.id, null);
    setErrorMessage(null);
  }

  function cycleSpeaker(lineKey: number) {
    updateDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.key === lineKey
          ? { ...line, sender: nextSpeakerName(line.sender) }
          : line
      ),
    }));
  }

  function updateLineText(lineKey: number, text: string) {
    updateDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.key === lineKey ? { ...line, text } : line
      ),
    }));
  }

  function insertLineAfter(index: number) {
    updateDraft((prev) => {
      if (prev.lines.length >= 3000) {
        return prev;
      }

      const refLine = prev.lines[index];
      const nextSender = refLine
        ? nextSpeakerName(refLine.sender)
        : CAPSULE_CONFIG.me;

      const inserted: EditableChatLine = {
        key: prev.nextKey,
        sender: nextSender,
        text: "",
      };

      const nextLines = [...prev.lines];
      nextLines.splice(index + 1, 0, inserted);

      return {
        ...prev,
        lines: nextLines,
        nextKey: prev.nextKey + 1,
      };
    });
  }

  function moveLine(index: number, delta: -1 | 1) {
    updateDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.lines.length) {
        return prev;
      }

      const nextLines = [...prev.lines];
      const temp = nextLines[index];
      nextLines[index] = nextLines[target];
      nextLines[target] = temp;
      return { ...prev, lines: nextLines };
    });
  }

  function removeLine(lineKey: number) {
    updateDraft((prev) => {
      if (prev.lines.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        lines: prev.lines.filter((line) => line.key !== lineKey),
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Archive title cannot be empty.");
      return;
    }

    const messagesToSave: ChatMessageLine[] =
      draft.mode === "raw"
        ? parsedRaw.messages
        : draft.lines
            .map((line) => ({
              sender: line.sender.trim(),
              text: line.text.trim(),
              ...(line.date_time ? { date_time: line.date_time } : {}),
            }))
            .filter((line) => line.sender.length > 0 && line.text.length > 0);

    if (messagesToSave.length === 0) {
      setErrorMessage("Keep at least one non-empty chat message.");
      return;
    }

    if (messagesToSave.length > 3000) {
      setErrorMessage("A chat archive supports up to 3,000 messages.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chat.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "replace",
          title: trimmedTitle,
          messages: messagesToSave,
        }),
      });

      const data = (await response.json()) as {
        chat?: ChatHighlight;
        error?: string;
      };

      if (!response.ok || !data.chat) {
        throw new Error(data.error ?? "Could not save changes.");
      }

      onDraftChange(chat.id, null);
      onSaved(data.chat);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save changes."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-chat-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,5,10,0.82)] p-3 backdrop-blur-sm sm:p-5"
      {...backdropProps}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="capsule-surface flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <h2
              id="edit-chat-title"
              className="font-serif text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
            >
              Edit Chat Highlight
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Supports Discord formatting (*italic*, **bold**, __underline__,
              ~~strike~~, ||spoiler||). Unsaved edits stay if closed.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetDraft}
              disabled={isSaving}
              title="Reset to saved version"
              aria-label="Reset edits"
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Close edit modal"
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label
                htmlFor="edit-chat-name"
                className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
              >
                Archive title
              </label>
              <input
                id="edit-chat-name"
                type="text"
                required
                maxLength={120}
                disabled={isSaving}
                value={draft.title}
                onChange={(event) =>
                  updateDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
              />
            </div>

            {/* Mode Switcher */}
            <div
              role="tablist"
              aria-label="Edit mode"
              className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={draft.mode === "lines"}
                disabled={isSaving}
                onClick={() => switchMode("lines")}
                className={
                  draft.mode === "lines"
                    ? "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                    : "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }
              >
                <List className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
                <span>Line Editor ({draft.lines.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={draft.mode === "raw"}
                disabled={isSaving}
                onClick={() => switchMode("raw")}
                className={
                  draft.mode === "raw"
                    ? "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                    : "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }
              >
                <FileCode2 className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
                <span>Bulk Text</span>
              </button>
            </div>

            {draft.mode === "lines" ? (
              <div className="space-y-3">
                {draft.lines.map((line, index) => {
                  const side = resolveChatSide(line.sender);
                  const isMe = side === "me";

                  return (
                    <div
                      key={line.key}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => cycleSpeaker(line.key)}
                            title="Click to switch speaker"
                            className={
                              isMe
                                ? "rounded-lg border border-[rgba(192,132,252,0.34)] bg-[rgba(168,85,247,0.16)] px-2.5 py-1 text-xs font-semibold text-[#D8B4FE] transition-colors hover:bg-[rgba(168,85,247,0.26)]"
                                : side === "friend"
                                  ? "rounded-lg border border-[rgba(244,114,182,0.34)] bg-[rgba(244,114,182,0.14)] px-2.5 py-1 text-xs font-semibold text-[#F9A8D4] transition-colors hover:bg-[rgba(244,114,182,0.24)]"
                                  : "rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                            }
                          >
                            {line.sender}
                          </button>

                          {line.date_time ? (
                            <span className="tabular-nums text-[11px] text-[var(--text-muted)]">
                              {line.date_time}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isSaving || index === 0}
                            onClick={() => moveLine(index, -1)}
                            aria-label={`Move line ${index + 1} up`}
                            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-25"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            disabled={isSaving || index === draft.lines.length - 1}
                            onClick={() => moveLine(index, 1)}
                            aria-label={`Move line ${index + 1} down`}
                            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-25"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => insertLineAfter(index)}
                            aria-label={`Insert line below ${index + 1}`}
                            title="Insert line below"
                            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-soft)] disabled:opacity-30"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            disabled={isSaving || draft.lines.length <= 1}
                            onClick={() => removeLine(line.key)}
                            aria-label={`Delete line ${index + 1}`}
                            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-25"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        maxLength={2000}
                        disabled={isSaving}
                        value={line.text}
                        onChange={(event) =>
                          updateLineText(line.key, event.target.value)
                        }
                        aria-label={`Message ${index + 1} by ${line.sender}`}
                        className="w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm leading-relaxed text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
                      />
                    </div>
                  );
                })}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => insertLineAfter(draft.lines.length - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Add message line</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Format: Name: message or [date, time] Name: message</span>
                  <span className="tabular-nums text-[#D8B4FE]">
                    {parsedRaw.messages.length} parsed
                  </span>
                </div>
                <textarea
                  rows={14}
                  disabled={isSaving}
                  value={draft.rawText}
                  onChange={(event) =>
                    updateDraft((prev) => ({
                      ...prev,
                      rawText: event.target.value,
                    }))
                  }
                  className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-3 font-mono text-xs leading-relaxed text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
                />
              </div>
            )}

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
              >
                {errorMessage}
              </div>
            ) : null}
          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Close
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
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
