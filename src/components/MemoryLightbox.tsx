"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Loader2,
  Lock,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  CAPSULE_AUTHORS,
  CAPSULE_CONFIG,
  type CapsuleAuthor,
} from "@/config/capsule";
import {
  formatCountdown,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format";
import type { MemoryItem, MemoryNote } from "@/lib/types";
import { isMemoryLocked } from "@/lib/validation";
import { AuthorBadge } from "./AuthorBadge";
import { useToast } from "./ToastProvider";

interface MemoryLightboxProps {
  memory: MemoryItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onNotesCountChange: (memoryId: string, count: number) => void;
}

export function MemoryLightbox({
  memory,
  onClose,
  onDeleted,
  onNotesCountChange,
}: MemoryLightboxProps) {
  const prefersReducedMotion = useReducedMotion();
  const { notify } = useToast();

  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [noteAuthor, setNoteAuthor] = useState<CapsuleAuthor>(CAPSULE_CONFIG.me);
  const [noteContent, setNoteContent] = useState("");
  const [isSendingNote, setIsSendingNote] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());

  const memoryId = memory.id;
  const unlockAt = memory.unlock_at;
  const locked = isMemoryLocked(unlockAt, nowMs);

  useEffect(() => {
    if (!unlockAt || !isMemoryLocked(unlockAt)) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (!isMemoryLocked(unlockAt, current)) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [unlockAt]);

  useEffect(() => {
    let active = true;

    fetch(`/api/notes?memoryId=${encodeURIComponent(memoryId)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          notes?: MemoryNote[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load notes.");
        }
        return data.notes ?? [];
      })
      .then((loadedNotes) => {
        if (!active) {
          return;
        }
        setNotes(loadedNotes);
        onNotesCountChange(memoryId, loadedNotes.length);
      })
      .catch((err) => {
        if (active) {
          setNotesError(
            err instanceof Error ? err.message : "Could not load notes."
          );
        }
      })
      .finally(() => {
        if (active) {
          setNotesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [memoryId, onNotesCountChange]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleting, onClose]);

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memory) {
      return;
    }

    const trimmed = noteContent.trim();
    if (!trimmed) {
      return;
    }

    setIsSendingNote(true);
    setNotesError(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: memory.id,
          author: noteAuthor,
          content: trimmed,
        }),
      });

      const data = (await response.json()) as {
        note?: MemoryNote;
        error?: string;
      };

      if (!response.ok || !data.note) {
        throw new Error(data.error ?? "Could not send note.");
      }

      const nextNotes = [...notes, data.note];
      setNotes(nextNotes);
      setNoteContent("");
      onNotesCountChange(memory.id, nextNotes.length);
      notify("Note added.");
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : "Could not send note."
      );
    } finally {
      setIsSendingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!memory) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not delete note.");
      }

      const nextNotes = notes.filter((item) => item.id !== noteId);
      setNotes(nextNotes);
      onNotesCountChange(memory.id, nextNotes.length);
      notify("Note removed.");
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : "Could not delete note."
      );
    }
  }

  async function handleDeleteMemory() {
    if (!memory) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `/api/memories/${encodeURIComponent(memory.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete memory.");
      }

      onDeleted(memory.id);
      onClose();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete memory."
      );
      setIsDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-memory-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,5,10,0.84)] p-3 backdrop-blur-sm sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="capsule-surface grid max-h-[92dvh] w-full max-w-5xl grid-cols-1 overflow-y-auto rounded-2xl lg:grid-cols-[minmax(0,1.35fr)_380px] lg:overflow-hidden"
      >
        {/* Left: Photo stage */}
        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-[#08070C] p-3 sm:min-h-[380px] sm:p-5 lg:max-h-[92dvh]">
          <Image
            src={memory.image_url}
            alt={locked ? "Time capsule sealed memory" : memory.title}
            width={1600}
            height={1200}
            sizes="(max-width: 1024px) 100vw, 65vw"
            className={
              locked
                ? "max-h-[65dvh] w-auto rounded-lg object-contain blur-2xl brightness-50 lg:max-h-[84dvh]"
                : "max-h-[65dvh] w-auto rounded-lg object-contain lg:max-h-[84dvh]"
            }
          />

          {locked && memory.unlock_at ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(11,10,16,0.52)] p-6 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(192,132,252,0.4)] bg-[rgba(168,85,247,0.18)] text-[var(--accent-soft)]">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 font-serif text-xl font-medium text-[var(--text-primary)]">
                Time Capsule Sealed
              </p>
              <p className="tabular-nums mt-2 text-lg font-semibold tracking-tight text-[var(--accent-soft)]">
                {formatCountdown(memory.unlock_at, nowMs)}
              </p>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                Unlocks on {formatDateTime(memory.unlock_at)}
              </p>
            </div>
          ) : null}
        </div>

        {/* Right: Story + Mini Notes */}
        <div className="flex flex-col border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:max-h-[92dvh] lg:border-l lg:border-t-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <AuthorBadge author={memory.author} />
              <span className="text-xs font-medium text-[var(--accent-soft)]">
                {memory.category}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmDelete((prev) => !prev)}
                disabled={isDeleting}
                aria-label="Delete memory"
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                aria-label="Close memory view"
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Delete confirmation bar */}
          {confirmDelete ? (
            <div className="border-b border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-3.5">
              <p className="text-xs font-medium text-[var(--danger)]">
                Delete this memory permanently? Its photo will also be removed
                from storage.
              </p>
              {deleteError ? (
                <p className="mt-1 text-xs text-[var(--danger)]">{deleteError}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteMemory}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#BE123C] disabled:opacity-60"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  <span>Delete Permanently</span>
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {/* Story details */}
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2
              id="lightbox-memory-title"
              className="font-serif text-xl font-medium text-[var(--text-primary)]"
            >
              {memory.title}
            </h2>

            <p className="tabular-nums mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatDateOnly(memory.memory_date)}</span>
            </p>

            {locked ? (
              <p className="mt-3 text-sm italic text-[var(--text-muted)]">
                The story inside stays tucked away until the timer hits zero.
              </p>
            ) : memory.caption ? (
              <p className="mt-3 whitespace-pre-line font-serif text-sm leading-relaxed text-[var(--text-secondary)]">
                {memory.caption}
              </p>
            ) : null}
          </div>

          {/* Mini notes list */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Mini notes ({notes.length})</span>
            </div>

            {notesLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Loading notes...</span>
              </div>
            ) : notes.length === 0 ? (
              <p className="py-4 text-xs text-[var(--text-muted)]">
                No notes on this memory yet. Leave a quick thought below.
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AuthorBadge author={note.author} />
                        <span className="tabular-nums text-[11px] text-[var(--text-muted)]">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        aria-label="Delete note"
                        className="rounded p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--danger)] focus:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">
                      {note.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {notesError ? (
              <p role="alert" className="mt-3 text-xs text-[var(--danger)]">
                {notesError}
              </p>
            ) : null}
          </div>

          {/* Note composer */}
          <form
            onSubmit={handleAddNote}
            className="border-t border-[var(--border-subtle)] bg-[var(--bg-input)] p-4"
          >
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">As:</span>
              {CAPSULE_AUTHORS.map((name) => {
                const isSelected = noteAuthor === name;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={isSendingNote}
                    onClick={() => setNoteAuthor(name)}
                    className={
                      isSelected
                        ? "rounded-full border border-[var(--accent)] bg-[rgba(168,85,247,0.18)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-primary)]"
                        : "rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                    }
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={600}
                disabled={isSendingNote}
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Write a mini note..."
                aria-label="Write a mini note"
                className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={isSendingNote || !noteContent.trim()}
                aria-label="Send note"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-button)] text-white transition-colors hover:bg-[var(--accent-button-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
