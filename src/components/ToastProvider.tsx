"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastKind = "success" | "error";

interface ToastEntry {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const nextIdRef = useRef(1);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      setToasts((prev) => [...prev.slice(-2), { id, message, kind }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 3600);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 top-16 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-20"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={
                toast.kind === "error"
                  ? "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-[var(--danger-border)] bg-[rgba(26,15,24,0.95)] px-3.5 py-3 text-sm text-[var(--danger)] backdrop-blur-md"
                  : "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-[rgba(192,132,252,0.34)] bg-[rgba(20,18,29,0.95)] px-3.5 py-3 text-sm text-[var(--text-primary)] backdrop-blur-md"
              }
            >
              {toast.kind === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-soft)]"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0 flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      notify: () => {
        // No-op fallback if rendered outside ToastProvider
      },
    };
  }
  return ctx;
}
