"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import {
  CAPSULE_AUTHORS,
  CAPSULE_CONFIG,
  MEMORY_CATEGORIES,
  type CapsuleAuthor,
  type MemoryCategory,
} from "@/config/capsule";
import type { MemoryItem } from "@/lib/types";
import { MemoryCard } from "./MemoryCard";
import { MemoryLightbox } from "./MemoryLightbox";
import { useToast } from "./ToastProvider";
import { UploadMemoryModal } from "./UploadMemoryModal";

interface MemoryGalleryProps {
  externalUploadOpen: boolean;
  onExternalUploadClose: () => void;
  onOpenUpload: () => void;
}

export function MemoryGallery({
  externalUploadOpen,
  onExternalUploadClose,
  onOpenUpload,
}: MemoryGalleryProps) {
  const { notify } = useToast();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | "ALL">(
    "ALL"
  );
  const [authorFilter, setAuthorFilter] = useState<CapsuleAuthor | "ALL">("ALL");

  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/memories", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          memories?: MemoryItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load memories.");
        }

        return data.memories ?? [];
      })
      .then((loaded) => {
        if (active) {
          setMemories(loaded);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Could not load memories right now."
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

  const filteredMemories = useMemo(() => {
    return memories.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      if (authorFilter !== "ALL" && item.author !== authorFilter) {
        return false;
      }
      return true;
    });
  }, [memories, categoryFilter, authorFilter]);

  const selectedMemory = useMemo(
    () => memories.find((item) => item.id === selectedMemoryId) ?? null,
    [memories, selectedMemoryId]
  );

  const hasActiveFilter = categoryFilter !== "ALL" || authorFilter !== "ALL";

  const handleCreated = useCallback(
    (created: MemoryItem) => {
      setMemories((prev) => [created, ...prev]);
      notify(`Saved "${created.title}" to the gallery.`);
    },
    [notify]
  );

  const handleDeleted = useCallback(
    (deletedId: string) => {
      setMemories((prev) => prev.filter((item) => item.id !== deletedId));
      setSelectedMemoryId(null);
      notify("Memory removed from the vault.");
    },
    [notify]
  );

  const handleNotesCountChange = useCallback(
    (memoryId: string, count: number) => {
      setMemories((prev) =>
        prev.map((item) =>
          item.id === memoryId ? { ...item, notes_count: count } : item
        )
      );
    },
    []
  );

  return (
    <section aria-labelledby="gallery-heading">
      {/* Section Header + Filter Controls */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="gallery-heading"
              className="font-serif text-2xl font-medium text-[var(--text-primary)] sm:text-[1.75rem]"
            >
              Living Memory Gallery
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Screenshots, outfit checks, and moments saved by {CAPSULE_CONFIG.me} &amp;{" "}
              {CAPSULE_CONFIG.friend}.
            </p>
          </div>

          <span className="tabular-nums text-xs font-medium text-[var(--text-muted)]">
            {filteredMemories.length}{" "}
            {filteredMemories.length === 1 ? "memory" : "memories"}
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={
                categoryFilter === "ALL"
                  ? "rounded-full bg-[var(--accent-button)] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  : "rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              }
            >
              All
            </button>

            {MEMORY_CATEGORIES.map((tag) => {
              const active = categoryFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCategoryFilter(tag)}
                  className={
                    active
                      ? "rounded-full bg-[var(--accent-button)] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      : "rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter by author"
            className="inline-flex self-start rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-1 sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setAuthorFilter("ALL")}
              className={
                authorFilter === "ALL"
                  ? "rounded-lg bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                  : "rounded-lg px-3 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              }
            >
              Both
            </button>
            {CAPSULE_AUTHORS.map((name) => {
              const active = authorFilter === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setAuthorFilter(name)}
                  className={
                    active
                      ? "rounded-lg bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                      : "rounded-lg px-3 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  }
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error State */}
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

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {[220, 290, 240].map((height, index) => (
            <div
              key={index}
              className="capsule-surface mb-5 break-inside-avoid animate-pulse rounded-2xl p-3 pb-4"
            >
              <div
                style={{ height: `${height}px` }}
                className="w-full rounded-xl bg-[var(--bg-elevated)]"
              />
              <div className="mt-4 h-4 w-2/3 rounded bg-[var(--bg-elevated)]" />
              <div className="mt-2 h-3 w-1/2 rounded bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {/* Open Slot Invitation Card — always visible so the vault invites growth */}
          <div className="mb-5 break-inside-avoid">
            <button
              type="button"
              onClick={onOpenUpload}
              className="group flex min-h-[250px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(168,85,247,0.38)] bg-[rgba(168,85,247,0.04)] p-7 text-center transition-all duration-200 hover:border-[rgba(192,132,252,0.72)] hover:bg-[rgba(168,85,247,0.09)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(192,132,252,0.38)] bg-[rgba(168,85,247,0.14)] text-[var(--accent-soft)] transition-transform duration-200 group-hover:scale-105">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-4 font-serif text-lg font-medium text-[var(--text-primary)]">
                Add New Memory
              </span>
              <span className="mt-1.5 max-w-[26ch] text-xs leading-relaxed text-[var(--text-secondary)]">
                {memories.length === 0
                  ? "This slot is waiting for our first screenshot, lobby clip, or outfit check."
                  : "Drop another screenshot, inside joke, or timed surprise into the vault."}
              </span>
            </button>
          </div>

          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onSelect={(item) => setSelectedMemoryId(item.id)}
            />
          ))}

          {filteredMemories.length === 0 && hasActiveFilter ? (
            <div className="capsule-surface mb-5 break-inside-avoid rounded-2xl p-6 text-center">
              <p className="font-serif text-base text-[var(--text-primary)]">
                No memories match that filter yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("ALL");
                  setAuthorFilter("ALL");
                }}
                className="mt-3 text-xs font-semibold text-[var(--accent-soft)] hover:underline"
              >
                Show all memories
              </button>
            </div>
          ) : null}
        </div>
      )}

      <UploadMemoryModal
        isOpen={externalUploadOpen}
        onClose={onExternalUploadClose}
        onCreated={handleCreated}
      />

      {selectedMemory ? (
        <MemoryLightbox
          key={selectedMemory.id}
          memory={selectedMemory}
          onClose={() => setSelectedMemoryId(null)}
          onDeleted={handleDeleted}
          onNotesCountChange={handleNotesCountChange}
        />
      ) : null}
    </section>
  );
}
