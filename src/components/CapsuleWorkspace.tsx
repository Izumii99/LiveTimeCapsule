"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Images,
  Lock,
  MailOpen,
  MessageSquareHeart,
  Plus,
} from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";
import type { SessionRole } from "@/lib/auth-core";
import { BgmPlayer } from "./BgmPlayer";
import { CapsuleMark } from "./CapsuleMark";
import { ChatHighlights } from "./ChatHighlights";
import { MemoryGallery } from "./MemoryGallery";
import { OpeningLetter } from "./OpeningLetter";
import { ToastProvider } from "./ToastProvider";

type WorkspaceTab = "letter" | "gallery" | "chats";

interface CapsuleWorkspaceProps {
  role: SessionRole;
  isLocking: boolean;
  onLock: () => void;
}

const ALL_TABS: ReadonlyArray<{
  id: WorkspaceTab;
  label: string;
  shortLabel: string;
  actionLabel: string;
  ownerOnly?: boolean;
  icon: typeof Images;
}> = [
  {
    id: "letter",
    label: "Letter",
    shortLabel: "Letter",
    actionLabel: "Add Memory",
    icon: MailOpen,
  },
  {
    id: "gallery",
    label: "Gallery",
    shortLabel: "Gallery",
    actionLabel: "Add Memory",
    icon: Images,
  },
  {
    id: "chats",
    label: "Chat Highlights",
    shortLabel: "Chats",
    actionLabel: "Add Chat",
    ownerOnly: true,
    icon: MessageSquareHeart,
  },
];

export function CapsuleWorkspace({
  role,
  isLocking,
  onLock,
}: CapsuleWorkspaceProps) {
  const prefersReducedMotion = useReducedMotion();
  const isOwner = role === "owner";
  const visibleTabs = isOwner
    ? ALL_TABS
    : ALL_TABS.filter((tab) => !tab.ownerOnly);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("letter");
  const [uploadMemoryOpen, setUploadMemoryOpen] = useState(false);
  const [addChatOpen, setAddChatOpen] = useState(false);

  const effectiveTab: WorkspaceTab =
    !isOwner && activeTab === "chats" ? "letter" : activeTab;

  const currentTabMeta =
    visibleTabs.find((tab) => tab.id === effectiveTab) ?? visibleTabs[0];

  const defaultAuthor = isOwner ? CAPSULE_CONFIG.me : CAPSULE_CONFIG.guest;

  function handlePrimaryAction() {
    if (isOwner && effectiveTab === "chats") {
      setAddChatOpen(true);
      return;
    }

    setActiveTab("gallery");
    setUploadMemoryOpen(true);
  }

  return (
    <ToastProvider>
      <div className="min-h-dvh pb-28 sm:pb-16">
        <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(11,10,16,0.76)] backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <CapsuleMark className="h-7 w-7 shrink-0 text-[var(--accent-soft)]" />
              <div className="min-w-0">
                <h1 className="truncate font-serif text-[0.98rem] font-medium leading-tight text-[var(--text-primary)] sm:text-lg">
                  {CAPSULE_CONFIG.appTitle}
                </h1>
                <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                  {CAPSULE_CONFIG.houseMembersLabel}
                </p>
              </div>
            </div>

            {/* Desktop tab switcher */}
            <nav
              aria-label="Capsule sections"
              className="hidden items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[rgba(20,18,29,0.85)] p-1 sm:flex"
            >
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = effectiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "inline-flex items-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
                        : "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    }
                  >
                    <Icon
                      className={
                        isActive
                          ? "h-3.5 w-3.5 text-[var(--accent-soft)]"
                          : "h-3.5 w-3.5"
                      }
                      aria-hidden="true"
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handlePrimaryAction}
                aria-label={currentTabMeta.actionLabel}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-button)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-button-hover)] sm:px-3.5"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">
                  {currentTabMeta.actionLabel}
                </span>
              </button>

              <button
                type="button"
                onClick={onLock}
                disabled={isLocking}
                aria-label="Lock capsule"
                title="Lock capsule"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-60"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">
                  {isLocking ? "Locking..." : "Lock"}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-8 sm:pt-12">
          <AnimatePresence mode="wait" initial={false}>
            {effectiveTab === "letter" ? (
              <motion.div
                key="tab-letter"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <OpeningLetter
                  onOpenGallery={() => setActiveTab("gallery")}
                  onOpenChats={
                    isOwner ? () => setActiveTab("chats") : undefined
                  }
                />
              </motion.div>
            ) : effectiveTab === "gallery" ? (
              <motion.div
                key="tab-gallery"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <MemoryGallery
                  defaultAuthor={defaultAuthor}
                  externalUploadOpen={uploadMemoryOpen}
                  onExternalUploadClose={() => setUploadMemoryOpen(false)}
                  onOpenUpload={() => setUploadMemoryOpen(true)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="tab-chats"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <ChatHighlights
                  externalAddOpen={addChatOpen}
                  onExternalAddClose={() => setAddChatOpen(false)}
                  onOpenAdd={() => setAddChatOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Mobile capsule navigation"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border-subtle)] bg-[rgba(11,10,16,0.9)] px-3 py-2 backdrop-blur-md sm:hidden"
        >
          <div
            className={
              visibleTabs.length === 2
                ? "mx-auto grid max-w-md grid-cols-2 gap-1"
                : "mx-auto grid max-w-md grid-cols-3 gap-1"
            }
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = effectiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "flex flex-col items-center gap-1 rounded-xl bg-[rgba(168,85,247,0.14)] py-2 text-[11px] font-semibold text-[var(--accent-soft)]"
                      : "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-[var(--text-muted)]"
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <BgmPlayer />
      </div>
    </ToastProvider>
  );
}
