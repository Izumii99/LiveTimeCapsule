"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Calendar, Gift, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import { formatDateOnly } from "@/lib/format";
import type { GiftedItem } from "@/lib/types";
import { AddItemModal } from "./AddItemModal";
import { useToast } from "./ToastProvider";

interface ItemHallOfFameProps {
  externalAddOpen: boolean;
  onExternalAddClose: () => void;
  onOpenAdd: () => void;
}

export function ItemHallOfFame({
  externalAddOpen,
  onExternalAddClose,
  onOpenAdd,
}: ItemHallOfFameProps) {
  const { notify } = useToast();
  const [items, setItems] = useState<GiftedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/items", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          items?: GiftedItem[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load gifted items.");
        }
        return data.items ?? [];
      })
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Could not load gifted items right now."
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
    (created: GiftedItem) => {
      setItems((prev) => [created, ...prev]);
      notify(`Saved "${created.name}" to the Item Hall.`);
    },
    [notify]
  );

  async function handleDelete(item: GiftedItem) {
    setDeletingId(item.id);

    try {
      const response = await fetch(
        `/api/items/${encodeURIComponent(item.id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not remove item.");
      }

      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setConfirmDeleteId(null);
      notify(`Removed "${item.name}".`);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not remove item.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-labelledby="item-hall-heading">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="item-hall-heading"
            className="font-serif text-2xl font-medium text-[var(--text-primary)] sm:text-[1.75rem]"
          >
            Item Hall of Fame
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            A tribute shelf for in-game gifts from {CAPSULE_CONFIG.friend} (
            {CAPSULE_CONFIG.friendAliases.join(" / ")}).
          </p>
        </div>

        <span className="tabular-nums text-xs font-medium text-[var(--text-muted)]">
          {items.length} {items.length === 1 ? "gift" : "gifts"}
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="capsule-surface animate-pulse rounded-2xl p-5"
            >
              <div className="h-44 w-full rounded-xl bg-[var(--bg-elevated)]" />
              <div className="mt-4 h-4 w-2/3 rounded bg-[var(--bg-elevated)]" />
              <div className="mt-2 h-3 w-full rounded bg-[var(--bg-elevated)]" />
              <div className="mt-1.5 h-3 w-4/5 rounded bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Always-visible inviting Open Slot Card */}
          <button
            type="button"
            onClick={onOpenAdd}
            className="group flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(244,114,182,0.38)] bg-[rgba(244,114,182,0.04)] p-7 text-center transition-all duration-200 hover:border-[rgba(244,114,182,0.72)] hover:bg-[rgba(244,114,182,0.08)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(244,114,182,0.38)] bg-[rgba(244,114,182,0.14)] text-[#F9A8D4] transition-transform duration-200 group-hover:scale-105">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-4 font-serif text-lg font-medium text-[var(--text-primary)]">
              Add Gifted Item
            </span>
            <span className="mt-1.5 max-w-[26ch] text-xs leading-relaxed text-[var(--text-secondary)]">
              {items.length === 0
                ? `Log the first item ${CAPSULE_CONFIG.friend} gifted you and save its lore.`
                : "Pin another outfit piece, accessory, or surprise gift to the shelf."}
            </span>
          </button>

          {items.map((item) => {
            const isConfirming = confirmDeleteId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <article
                key={item.id}
                className="capsule-surface flex flex-col overflow-hidden rounded-2xl p-4"
              >
                {item.image_url ? (
                  <div className="relative h-48 overflow-hidden rounded-xl bg-[#0D0B14]">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[#F9A8D4]">
                    <Gift className="h-9 w-9 opacity-80" aria-hidden="true" />
                  </div>
                )}

                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-medium leading-snug text-[var(--text-primary)]">
                      {item.name}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDeleteId(isConfirming ? null : item.id)
                      }
                      disabled={isDeleting}
                      aria-label={`Delete ${item.name}`}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="mt-2.5 flex-1 whitespace-pre-line font-serif text-sm leading-relaxed text-[var(--text-secondary)]">
                    {item.lore_note}
                  </p>

                  {isConfirming ? (
                    <div className="mt-4 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
                      <p className="text-xs font-medium text-[var(--danger)]">
                        Remove this item from the Hall of Fame?
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#BE123C] disabled:opacity-60"
                        >
                          {isDeleting ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span>Remove</span>
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
                  ) : (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs">
                      <span className="rounded-full border border-[rgba(244,114,182,0.3)] bg-[rgba(244,114,182,0.12)] px-2.5 py-0.5 font-medium text-[#F9A8D4]">
                        From {CAPSULE_CONFIG.friend}
                      </span>

                      <span className="tabular-nums inline-flex items-center gap-1 text-[var(--text-muted)]">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{formatDateOnly(item.gifted_date)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AddItemModal
        isOpen={externalAddOpen}
        onClose={onExternalAddClose}
        onCreated={handleCreated}
      />
    </section>
  );
}
