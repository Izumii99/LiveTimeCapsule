"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronUp,
  Images,
  MailOpen,
  MessageSquareHeart,
} from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import { CapsuleMark } from "./CapsuleMark";

interface OpeningLetterProps {
  onOpenGallery?: () => void;
  onOpenChats?: () => void;
}

export function OpeningLetter({
  onOpenGallery,
  onOpenChats,
}: OpeningLetterProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-labelledby="opening-letter-heading"
      className="mx-auto max-w-3xl"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.div
            key="sealed"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="capsule-surface relative overflow-hidden rounded-2xl p-6 sm:p-9"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(192,132,252,0.45)] to-transparent"
            />

            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(168,85,247,0.34)] bg-[rgba(168,85,247,0.12)] text-[var(--accent-soft)]">
                  <CapsuleMark className="h-7 w-7" />
                </div>

                <div>
                  <h2
                    id="opening-letter-heading"
                    className="font-serif text-xl font-medium text-[var(--text-primary)] sm:text-2xl"
                  >
                    A sealed note for {CAPSULE_CONFIG.friend}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    From {CAPSULE_CONFIG.me} (
                    {CAPSULE_CONFIG.meAliases.join(" / ")}) to{" "}
                    {CAPSULE_CONFIG.friend} (
                    {CAPSULE_CONFIG.friendAliases.join(" / ")}). Tap the seal to
                    read inside.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-button)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-button-hover)] active:scale-[0.99]"
              >
                <MailOpen className="h-4 w-4" aria-hidden="true" />
                <span>Open Letter</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.article
            key="opened"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="capsule-surface relative overflow-hidden rounded-2xl p-6 sm:p-10"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(244,114,182,0.45)] to-transparent"
            />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <CapsuleMark className="h-7 w-7 text-[var(--accent-soft)]" />
                <h2
                  id="opening-letter-heading"
                  className="font-serif text-2xl font-medium text-[var(--text-primary)] sm:text-[1.75rem]"
                >
                  {CAPSULE_CONFIG.openingLetterTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Fold Letter</span>
              </button>
            </div>

            <div className="mt-6 max-w-[65ch] space-y-4 font-serif text-[1.03rem] leading-[1.82] text-[#E6E1F3]">
              {CAPSULE_CONFIG.openingLetter.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <p className="mt-8 font-serif text-[0.98rem] italic text-[var(--accent-soft)]">
              {CAPSULE_CONFIG.openingLetterSignOff}
            </p>
          </motion.article>
        )}
      </AnimatePresence>

      {onOpenGallery && onOpenChats ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onOpenGallery}
            className="capsule-surface group flex items-center justify-between gap-4 rounded-2xl p-5 text-left transition-colors hover:border-[rgba(192,132,252,0.36)]"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(168,85,247,0.28)] bg-[rgba(168,85,247,0.12)] text-[var(--accent-soft)]">
                <Images className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-base font-medium text-[var(--text-primary)]">
                  Gallery
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Screenshots, outfit checks, gifted items, and timed capsules.
                </p>
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-soft)]"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={onOpenChats}
            className="capsule-surface group flex items-center justify-between gap-4 rounded-2xl p-5 text-left transition-colors hover:border-[rgba(244,114,182,0.36)]"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(244,114,182,0.28)] bg-[rgba(244,114,182,0.12)] text-[#F9A8D4]">
                <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-serif text-base font-medium text-[var(--text-primary)]">
                  Chat Highlights
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Archived .txt chat logs and favorite late-night quotes.
                </p>
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[#F9A8D4]"
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
    </section>
  );
}
