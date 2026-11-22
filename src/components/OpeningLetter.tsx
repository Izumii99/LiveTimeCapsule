"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronUp, MailOpen } from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import { CapsuleMark } from "./CapsuleMark";

export function OpeningLetter() {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section aria-labelledby="opening-letter-heading" className="mb-10">
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.div
            key="sealed"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="capsule-surface relative overflow-hidden rounded-2xl p-6 sm:p-8"
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
                    From {CAPSULE_CONFIG.me} ({CAPSULE_CONFIG.meAliases.join(" / ")}) to{" "}
                    {CAPSULE_CONFIG.friend} ({CAPSULE_CONFIG.friendAliases.join(" / ")})
                    &mdash; tap the seal to read inside.
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
              &mdash; {CAPSULE_CONFIG.openingLetterSignOff}
            </p>
          </motion.article>
        )}
      </AnimatePresence>
    </section>
  );
}
