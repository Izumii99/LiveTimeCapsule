"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { SessionRole } from "@/lib/auth-core";
import { CapsuleWorkspace } from "./CapsuleWorkspace";
import { LockScreen } from "./LockScreen";

interface CapsuleGateProps {
  initialRole: SessionRole | null;
}

export function CapsuleGate({ initialRole }: CapsuleGateProps) {
  const prefersReducedMotion = useReducedMotion();
  const [sessionRole, setSessionRole] = useState<SessionRole | null>(
    initialRole
  );
  const [isLocking, setIsLocking] = useState(false);

  async function handleLock() {
    setIsLocking(true);
    try {
      await fetch("/api/auth/lock", { method: "POST" });
    } catch {
      // Lock locally even if the network request fails so the screen closes cleanly
    } finally {
      setSessionRole(null);
      setIsLocking(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!sessionRole ? (
        <motion.div
          key="locked"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LockScreen onUnlocked={(role) => setSessionRole(role)} />
        </motion.div>
      ) : (
        <motion.div
          key="unlocked"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <CapsuleWorkspace
            role={sessionRole}
            isLocking={isLocking}
            onLock={handleLock}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
