"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Clock,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  CAPSULE_AUTHORS,
  CAPSULE_CONFIG,
  MEMORY_CATEGORIES,
  type CapsuleAuthor,
  type MemoryCategory,
} from "@/config/capsule";
import {
  formatBytes,
  getMinDatetimeLocalValue,
  getTodayDateInputValue,
} from "@/lib/format";
import type { MemoryItem } from "@/lib/types";
import { compressAndUploadImage, type UploadStage } from "@/lib/upload-client";

interface UploadMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (memory: MemoryItem) => void;
}

type SubmitStage = UploadStage | "saving" | null;

const STAGE_LABELS: Record<Exclude<SubmitStage, null>, string> = {
  compressing: "Compressing photo to WebP...",
  signing: "Preparing secure upload...",
  uploading: "Uploading to vault storage...",
  saving: "Saving memory...",
};

export function UploadMemoryModal({
  isOpen,
  onClose,
  onCreated,
}: UploadMemoryModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [memoryDate, setMemoryDate] = useState(getTodayDateInputValue);
  const [category, setCategory] = useState<MemoryCategory>("#Moment");
  const [author, setAuthor] = useState<CapsuleAuthor>(CAPSULE_CONFIG.me);

  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [unlockAtLocal, setUnlockAtLocal] = useState("");

  const [submitStage, setSubmitStage] = useState<SubmitStage>(null);
  const [compressionSummary, setCompressionSummary] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = submitStage !== null;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) {
    return null;
  }

  function updatePreview(nextFile: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!nextFile) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }

  function resetForm() {
    setSelectedFile(null);
    updatePreview(null);
    setTitle("");
    setCaption("");
    setMemoryDate(getTodayDateInputValue());
    setCategory("#Moment");
    setAuthor(CAPSULE_CONFIG.me);
    setIsTimeCapsule(false);
    setUnlockAtLocal("");
    setSubmitStage(null);
    setCompressionSummary(null);
    setErrorMessage(null);
  }

  function handleFilePick(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file (PNG, JPG, WebP, or GIF).");
      return;
    }

    setErrorMessage(null);
    setCompressionSummary(null);
    setSelectedFile(file);
    updatePreview(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFilePick(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Pick a screenshot or photo first.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Give this memory a short title.");
      return;
    }

    let unlockAtIso: string | null = null;
    if (isTimeCapsule) {
      if (!unlockAtLocal) {
        setErrorMessage("Pick an unlock date and time for this time capsule.");
        return;
      }

      const parsedUnlock = new Date(unlockAtLocal);
      if (Number.isNaN(parsedUnlock.getTime()) || parsedUnlock.getTime() <= Date.now()) {
        setErrorMessage("Choose an unlock time in the future.");
        return;
      }

      unlockAtIso = parsedUnlock.toISOString();
    }

    setErrorMessage(null);

    try {
      const uploaded = await compressAndUploadImage(
        selectedFile,
        "memories",
        (stage) => setSubmitStage(stage)
      );

      setCompressionSummary(
        `Compressed ${formatBytes(uploaded.originalBytes)} to ${formatBytes(
          uploaded.compressedBytes
        )}`
      );
      setSubmitStage("saving");

      const response = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          caption: caption.trim() || null,
          image_url: uploaded.publicUrl,
          storage_path: uploaded.storagePath,
          category,
          author,
          memory_date: memoryDate,
          unlock_at: unlockAtIso,
        }),
      });

      const data = (await response.json()) as {
        memory?: MemoryItem;
        error?: string;
      };

      if (!response.ok || !data.memory) {
        throw new Error(data.error ?? "Failed to save this memory.");
      }

      onCreated(data.memory);
      resetForm();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setErrorMessage(message);
      setSubmitStage(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-memory-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,5,10,0.78)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
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
              id="upload-memory-title"
              className="font-serif text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
            >
              Add a New Memory
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Auto-compressed to crisp WebP under 1 MB before saving.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close upload modal"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Drag and drop zone */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={isBusy}
              onChange={(event) => handleFilePick(event.target.files?.[0])}
              className="sr-only"
            />

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected memory preview"
                  className="max-h-60 w-full object-contain"
                />
                <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
                  <span className="truncate">
                    {selectedFile?.name} &middot;{" "}
                    {selectedFile ? formatBytes(selectedFile.size) : ""}
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 font-medium text-[var(--accent-soft)] hover:underline disabled:opacity-50"
                  >
                    Change photo
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isBusy) {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !isBusy) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={
                  isDragging
                    ? "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent)] bg-[rgba(168,85,247,0.12)] px-4 py-9 text-center transition-colors"
                    : "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(255,255,255,0.16)] bg-[var(--bg-input)] px-4 py-9 text-center transition-colors hover:border-[rgba(168,85,247,0.5)]"
                }
              >
                <ImagePlus
                  className="h-7 w-7 text-[var(--accent-soft)]"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                  Drop a screenshot here or tap to browse
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  PNG, JPG, WebP, or GIF &middot; resized to max 1920px
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="memory-title"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Title
            </label>
            <input
              id="memory-title"
              type="text"
              required
              maxLength={120}
              disabled={isBusy}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Midnight lobby screenshot, matching fits..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
            />
          </div>

          {/* Story / Caption */}
          <div>
            <label
              htmlFor="memory-caption"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Story or caption{" "}
              <span className="font-normal text-[var(--text-muted)]">
                (optional)
              </span>
            </label>
            <textarea
              id="memory-caption"
              rows={3}
              maxLength={2000}
              disabled={isBusy}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write down what made this moment worth keeping..."
              className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
            />
          </div>

          {/* Date + Author */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="memory-date"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"
              >
                <Calendar
                  className="h-3.5 w-3.5 text-[var(--accent-soft)]"
                  aria-hidden="true"
                />
                <span>Memory date</span>
              </label>
              <input
                id="memory-date"
                type="date"
                disabled={isBusy}
                value={memoryDate}
                onChange={(event) => setMemoryDate(event.target.value)}
                className="tabular-nums w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                Added by
              </span>
              <div className="grid grid-cols-2 gap-2">
                {CAPSULE_AUTHORS.map((name) => {
                  const isActive = author === name;
                  const alias =
                    name === CAPSULE_CONFIG.me
                      ? CAPSULE_CONFIG.meAliases[0]
                      : CAPSULE_CONFIG.friendAliases[0];
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={isBusy}
                      onClick={() => setAuthor(name)}
                      className={
                        isActive
                          ? "rounded-xl border border-[var(--accent)] bg-[rgba(168,85,247,0.18)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors"
                          : "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
                      }
                    >
                      {name}{" "}
                      <span className="text-xs font-normal opacity-75">
                        ({alias})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Tag */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Category
            </span>
            <div className="flex flex-wrap gap-2">
              {MEMORY_CATEGORIES.map((tag) => {
                const isActive = category === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setCategory(tag)}
                    className={
                      isActive
                        ? "rounded-full border border-[var(--accent)] bg-[rgba(168,85,247,0.18)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors"
                        : "rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Capsule Lock */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Clock
                  className="h-4 w-4 text-[var(--accent-soft)]"
                  aria-hidden="true"
                />
                <div>
                  <span className="block text-sm font-medium text-[var(--text-primary)]">
                    Time Capsule Lock
                  </span>
                  <span className="block text-xs text-[var(--text-muted)]">
                    Blur this memory with a countdown until a future date.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                disabled={isBusy}
                checked={isTimeCapsule}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setIsTimeCapsule(checked);
                  if (checked && !unlockAtLocal) {
                    setUnlockAtLocal(getMinDatetimeLocalValue());
                  }
                }}
                className="h-4 w-4 cursor-pointer accent-[#A855F7]"
              />
            </label>

            {isTimeCapsule ? (
              <div className="mt-3.5 border-t border-[var(--border-subtle)] pt-3.5">
                <label
                  htmlFor="unlock-at-input"
                  className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Unlock date &amp; time
                </label>
                <input
                  id="unlock-at-input"
                  type="datetime-local"
                  min={getMinDatetimeLocalValue()}
                  disabled={isBusy}
                  value={unlockAtLocal}
                  onChange={(event) => setUnlockAtLocal(event.target.value)}
                  className="tabular-nums w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
                />
              </div>
            ) : null}
          </div>

          {/* Live compression / upload status */}
          {submitStage ? (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-[rgba(168,85,247,0.3)] bg-[rgba(168,85,247,0.1)] px-3.5 py-2.5 text-xs text-[#E9D5FF]"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              <div>
                <p className="font-medium">{STAGE_LABELS[submitStage]}</p>
                {compressionSummary ? (
                  <p className="mt-0.5 text-[11px] opacity-80">
                    {compressionSummary}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

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
              disabled={isBusy}
              className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-button)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Save Memory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
