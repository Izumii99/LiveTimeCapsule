"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  Loader2,
  MessageSquarePlus,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CAPSULE_CONFIG, type CapsuleAuthor } from "@/config/capsule";
import {
  deriveTitleFromFilename,
  parseRawChatLog,
} from "@/lib/chat-parser";
import type { ChatHighlight, ChatMessageLine } from "@/lib/types";
import { ChatBubbleStream } from "./ChatBubbleStream";

interface AddChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (chat: ChatHighlight) => void;
}

type InputMode = "import" | "manual";

interface DraftLine {
  key: number;
  sender: CapsuleAuthor;
  text: string;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<InputMode>("import");
  const [title, setTitle] = useState("");

  // Import / Paste mode state
  const [rawLog, setRawLog] = useState("");
  const [importedFiles, setImportedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Manual builder state
  const [lines, setLines] = useState<DraftLine[]>(createInitialLines);
  const [nextKey, setNextKey] = useState(3);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedImport = useMemo(() => parseRawChatLog(rawLog), [rawLog]);

  const uniqueImportSenders = useMemo(() => {
    const names = new Set<string>();
    for (const msg of parsedImport.messages) {
      names.add(msg.sender);
    }
    return Array.from(names);
  }, [parsedImport.messages]);

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
    setMode("import");
    setTitle("");
    setRawLog("");
    setImportedFiles([]);
    setLines(createInitialLines());
    setNextKey(3);
    setErrorMessage(null);
  }

  async function handleTxtFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const validFiles = Array.from(fileList).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain"
    );

    if (validFiles.length === 0) {
      setErrorMessage("Please choose .txt chat log files.");
      return;
    }

    setErrorMessage(null);

    try {
      const contents = await Promise.all(validFiles.map((file) => file.text()));
      const combined = contents.join("\n");

      setRawLog((prev) => (prev.trim() ? `${prev.trim()}\n${combined}` : combined));
      setImportedFiles((prev) => [
        ...prev,
        ...validFiles.map((file) => file.name),
      ]);

      if (!title.trim() && validFiles[0]) {
        setTitle(deriveTitleFromFilename(validFiles[0].name));
      }
    } catch {
      setErrorMessage("Could not read one of the .txt files. Make sure it is UTF-8.");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleTxtFiles(event.dataTransfer.files);
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
    if (lines.length >= 100) {
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
      setErrorMessage("Give this chat archive a short title.");
      return;
    }

    let messagesToSave: ChatMessageLine[] = [];
    if (mode === "import") {
      messagesToSave = parsedImport.messages;
      if (messagesToSave.length === 0) {
        setErrorMessage(
          'Drop a .txt chat record or paste lines like "[17/08/2026, 22.42.48] Cumi: hey".'
        );
        return;
      }
      if (messagesToSave.length > 3000) {
        setErrorMessage(
          "This log has over 3,000 messages. Split it into two smaller archives."
        );
        return;
      }
    } else {
      messagesToSave = lines
        .map((line) => ({ sender: line.sender, text: line.text.trim() }))
        .filter((line) => line.text.length > 0);

      if (messagesToSave.length === 0) {
        setErrorMessage("Write at least one chat line before saving.");
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          messages: messagesToSave,
        }),
      });

      const data = (await response.json()) as {
        chat?: ChatHighlight;
        error?: string;
      };

      if (!response.ok || !data.chat) {
        throw new Error(data.error ?? "Could not save this chat archive.");
      }

      onCreated(data.chat);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save chat archive."
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
        className="capsule-surface max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 sm:p-7"
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
              Import `.txt` chat exports directly (with fancy font cleanup &amp;
              deduplication) or write a short highlight manually.
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

        {/* Input Mode Switcher */}
        <div
          role="tablist"
          aria-label="Chat input mode"
          className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "import"}
            disabled={isSaving}
            onClick={() => {
              setMode("import");
              setErrorMessage(null);
            }}
            className={
              mode === "import"
                ? "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                : "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }
          >
            <Upload className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
            <span>Import .txt / Paste Log</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "manual"}
            disabled={isSaving}
            onClick={() => {
              setMode("manual");
              setErrorMessage(null);
            }}
            className={
              mode === "manual"
                ? "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                : "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }
          >
            <MessageSquarePlus className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
            <span>Manual Builder</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="chat-highlight-title"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Archive title
            </label>
            <input
              id="chat-highlight-title"
              type="text"
              required
              maxLength={120}
              disabled={isSaving}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Rui (2026-11), 3 AM lobby talk..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
            />
          </div>

          {mode === "import" ? (
            <div className="space-y-4">
              {/* Dropzone for .txt files */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  multiple
                  disabled={isSaving}
                  onChange={(event) => {
                    void handleTxtFiles(event.target.files);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!isSaving) {
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !isSaving) {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={
                    isDragging
                      ? "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent)] bg-[rgba(168,85,247,0.12)] px-4 py-6 text-center transition-colors"
                      : "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(255,255,255,0.16)] bg-[var(--bg-input)] px-4 py-6 text-center transition-colors hover:border-[rgba(168,85,247,0.5)]"
                  }
                >
                  <FileText
                    className="h-6 w-6 text-[var(--accent-soft)]"
                    aria-hidden="true"
                  />
                  <p className="mt-2.5 text-sm font-medium text-[var(--text-primary)]">
                    Drop one or more `.txt` chat files here
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Supports `Chat_Record_*.txt` format (`[date, time] Name: message`)
                  </p>
                </div>

                {importedFiles.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="truncate">
                      Loaded: {importedFiles.join(", ")}
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setRawLog("");
                        setImportedFiles([]);
                      }}
                      className="shrink-0 text-[var(--danger)] hover:underline"
                    >
                      Clear log
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Paste raw log textarea */}
              <div>
                <label
                  htmlFor="raw-chat-log"
                  className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Or paste raw chat lines directly
                </label>
                <textarea
                  id="raw-chat-log"
                  rows={5}
                  disabled={isSaving}
                  value={rawLog}
                  onChange={(event) => setRawLog(event.target.value)}
                  placeholder={`[17/08/2026, 22.42.48] Cumi: hey rui\n[17/08/2026, 22.43.06] Rui: wait still picking outfit`}
                  className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 font-mono text-xs leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
                />
              </div>

              {/* Live parsed preview */}
              {parsedImport.messages.length > 0 ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5 text-xs">
                    <span className="tabular-nums font-semibold text-[#D8B4FE]">
                      Parsed {parsedImport.messages.length}{" "}
                      {parsedImport.messages.length === 1 ? "message" : "messages"}
                      {parsedImport.duplicatesSkipped > 0
                        ? ` (${parsedImport.duplicatesSkipped} duplicate${
                            parsedImport.duplicatesSkipped === 1 ? "" : "s"
                          } skipped)`
                        : ""}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {uniqueImportSenders.join(" · ")}
                    </span>
                  </div>

                  <ChatBubbleStream
                    messages={parsedImport.messages.slice(0, 4)}
                    compact
                  />

                  {parsedImport.messages.length > 4 ? (
                    <p className="tabular-nums mt-3 text-center text-[11px] text-[var(--text-muted)]">
                      + {parsedImport.messages.length - 4} more messages will be saved
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Conversation lines
                </span>
                <span className="tabular-nums text-xs text-[var(--text-muted)]">
                  {lines.length} / 100
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

              {lines.length < 100 ? (
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
          )}

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
                  <span>Save Archive</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
