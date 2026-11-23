"use client";

import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import type { SessionRole } from "@/lib/auth-core";
import { CapsuleMark } from "./CapsuleMark";

interface LockScreenProps {
  onUnlocked: (role: SessionRole) => void;
}

interface UnlockResponse {
  unlocked?: boolean;
  role?: SessionRole;
  error?: string;
}

export function LockScreen({ onUnlocked }: LockScreenProps) {
  const prefersReducedMotion = useReducedMotion();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = passcode.trim();
    if (!trimmed) {
      setErrorMessage("Enter our passcode first.");
      setShakeCount((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: trimmed }),
      });

      const data = (await response.json()) as UnlockResponse;

      if (!response.ok || !data.unlocked || !data.role) {
        setErrorMessage(
          data.error ?? "That passcode didn't match. Try again."
        );
        setShakeCount((prev) => prev + 1);
        return;
      }

      onUnlocked(data.role);
    } catch {
      setErrorMessage("Could not reach the vault right now. Please try again.");
      setShakeCount((prev) => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12 sm:px-8">
      <motion.section
        aria-labelledby="lock-screen-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px]"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 text-[var(--accent-soft)]">
            <CapsuleMark className="h-11 w-11" />
          </div>

          <h1
            id="lock-screen-title"
            className="font-serif text-[1.75rem] font-medium tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.1rem] sm:leading-[1.15]"
          >
            {CAPSULE_CONFIG.appTitle}
          </h1>

          <p className="mt-3 max-w-[34ch] text-balance text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
            {CAPSULE_CONFIG.lockScreenSubtitle}
          </p>
        </div>

        <motion.div
          key={shakeCount}
          animate={
            shakeCount > 0 && !prefersReducedMotion
              ? { x: [0, -7, 7, -5, 5, -2, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.36, ease: "easeOut" }}
          className="capsule-surface rounded-2xl p-6 sm:p-7"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="capsule-passcode"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"
              >
                <Lock className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
                <span>Secret passcode</span>
              </label>

              <div className="relative">
                <input
                  id="capsule-passcode"
                  name="passcode"
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  autoComplete="current-password"
                  autoFocus
                  disabled={isSubmitting}
                  aria-invalid={errorMessage ? "true" : "false"}
                  aria-describedby={
                    errorMessage ? "passcode-error passcode-hint" : "passcode-hint"
                  }
                  placeholder="Enter our secret word"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3.5 pr-12 text-[0.95rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(168,85,247,0.28)] focus:outline-none focus-visible:outline-none disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <p
                id="passcode-hint"
                className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]"
              >
                {CAPSULE_CONFIG.passcodeHint}
              </p>
            </div>

            {errorMessage ? (
              <div
                id="passcode-error"
                role="alert"
                className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
              >
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-button)] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-button-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <span>Unlock Capsule</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <p className="mt-7 text-center text-xs text-[var(--text-muted)]">
          {CAPSULE_CONFIG.houseMembersLabel} &middot; Private Vault
        </p>
      </motion.section>
    </main>
  );
}
