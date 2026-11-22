"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Gift, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import { formatBytes, getTodayDateInputValue } from "@/lib/format";
import type { GiftedItem } from "@/lib/types";
import { compressAndUploadImage, type UploadStage } from "@/lib/upload-client";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: GiftedItem) => void;
}

type SubmitStage = UploadStage | "saving" | null;

const STAGE_LABELS: Record<Exclude<SubmitStage, null>, string> = {
  compressing: "Compressing item image to WebP...",
  signing: "Preparing secure upload...",
  uploading: "Uploading to vault storage...",
  saving: "Saving gifted item...",
};

export function AddItemModal({ isOpen, onClose, onCreated }: AddItemModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [name, setName] = useState("");
  const [giftedDate, setGiftedDate] = useState(getTodayDateInputValue);
  const [loreNote, setLoreNote] = useState("");

  const [submitStage, setSubmitStage] = useState<SubmitStage>(null);
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
    setName("");
    setGiftedDate(getTodayDateInputValue());
    setLoreNote("");
    setSubmitStage(null);
    setErrorMessage(null);
  }

  function handleFilePick(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please pick an image file (PNG, JPG, WebP, or GIF).");
      return;
    }

    setErrorMessage(null);
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

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Enter the item name.");
      return;
    }

    const trimmedLore = loreNote.trim();
    if (!trimmedLore) {
      setErrorMessage("Add a short item lore or thank-you note.");
      return;
    }

    setErrorMessage(null);

    try {
      let imageUrl: string | null = null;
      let storagePath: string | null = null;

      if (selectedFile) {
        const uploaded = await compressAndUploadImage(
          selectedFile,
          "items",
          (stage) => setSubmitStage(stage)
        );
        imageUrl = uploaded.publicUrl;
        storagePath = uploaded.storagePath;
      }

      setSubmitStage("saving");

      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          image_url: imageUrl,
          storage_path: storagePath,
          lore_note: trimmedLore,
          gifted_date: giftedDate,
        }),
      });

      const data = (await response.json()) as {
        item?: GiftedItem;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Failed to save this gifted item.");
      }

      onCreated(data.item);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save item."
      );
      setSubmitStage(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-title"
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
        className="capsule-surface max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-item-title"
              className="font-serif text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
            >
              Add Gifted Item
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Record a gift from {CAPSULE_CONFIG.friend} with its story.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Optional screenshot / icon */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Item icon or screenshot{" "}
              <span className="font-normal text-[var(--text-muted)]">
                (optional)
              </span>
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={isBusy}
              onChange={(event) => handleFilePick(event.target.files?.[0])}
              className="sr-only"
            />

            {previewUrl ? (
              <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Gifted item preview"
                  className="max-h-48 w-full object-contain"
                />
                <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3.5 py-2 text-xs text-[var(--text-secondary)]">
                  <span className="truncate">
                    {selectedFile?.name} &middot;{" "}
                    {selectedFile ? formatBytes(selectedFile.size) : ""}
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setSelectedFile(null);
                      updatePreview(null);
                    }}
                    className="inline-flex shrink-0 items-center gap-1 text-[var(--danger)] hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Remove</span>
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
                    ? "flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--accent)] bg-[rgba(168,85,247,0.12)] px-4 py-6 text-center transition-colors"
                    : "flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[rgba(255,255,255,0.16)] bg-[var(--bg-input)] px-4 py-6 text-center transition-colors hover:border-[rgba(168,85,247,0.5)]"
                }
              >
                <ImagePlus
                  className="h-5 w-5 text-[var(--accent-soft)]"
                  aria-hidden="true"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  Drop an item image or tap to browse
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_165px]">
            <div>
              <label
                htmlFor="item-name"
                className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
              >
                Item name
              </label>
              <input
                id="item-name"
                type="text"
                required
                maxLength={120}
                disabled={isBusy}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Starlight Cape, Midnight Ribbon..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="item-gifted-date"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"
              >
                <Calendar
                  className="h-3.5 w-3.5 text-[var(--accent-soft)]"
                  aria-hidden="true"
                />
                <span>Gifted date</span>
              </label>
              <input
                id="item-gifted-date"
                type="date"
                disabled={isBusy}
                value={giftedDate}
                onChange={(event) => setGiftedDate(event.target.value)}
                className="tabular-nums w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="item-lore"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Item lore / thank you note
            </label>
            <textarea
              id="item-lore"
              required
              rows={4}
              maxLength={1500}
              disabled={isBusy}
              value={loreNote}
              onChange={(event) => setLoreNote(event.target.value)}
              placeholder="Write why this gift meant so much or the funny moment behind it..."
              className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none"
            />
          </div>

          {submitStage ? (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-[rgba(168,85,247,0.3)] bg-[rgba(168,85,247,0.1)] px-3.5 py-2.5 text-xs text-[#E9D5FF]"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              <span>{STAGE_LABELS[submitStage]}</span>
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" aria-hidden="true" />
                  <span>Save Gift</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
