"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CapsuleWorkspace } from "./CapsuleWorkspace";
import { LockScreen } from "./LockScreen";

interface CapsuleGateProps {
  initialUnlocked: boolean;
}

export function CapsuleGate({ initialUnlocked }: CapsuleGateProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);
  const [isLocking, setIsLocking] = useState(false);

  async function handleLock() {
    setIsLocking(true);
    try {
      await fetch("/api/auth/lock", { method: "POST" });
    } catch {
      // Lock locally even if the network request fails so the screen closes cleanly
    } finally {
      setIsUnlocked(false);
      setIsLocking(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!isUnlocked ? (
        <motion.div
          key="locked"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LockScreen onUnlocked={() => setIsUnlocked(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="unlocked"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <CapsuleWorkspace isLocking={isLocking} onLock={handleLock} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
