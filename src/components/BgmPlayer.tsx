"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { CAPSULE_CONFIG } from "@/config/capsule";

export function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackStatus, setTrackStatus] = useState<"checking" | "ready" | "missing">(
    "checking"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [isMuted, setIsMuted] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(CAPSULE_CONFIG.bgmSrc, { method: "HEAD" })
      .then((response) => {
        if (!active) {
          return;
        }
        setTrackStatus(response.ok ? "ready" : "missing");
      })
      .catch(() => {
        if (active) {
          setTrackStatus("missing");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      audio.volume = isMuted ? 0 : volume;
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  if (trackStatus === "checking") {
    return null;
  }

  if (trackStatus === "missing") {
    if (hintDismissed) {
      return null;
    }

    return (
      <aside
        aria-label="Background music status"
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(20,18,29,0.92)] px-3.5 py-2 text-xs text-[var(--text-muted)] backdrop-blur-md sm:bottom-5 sm:right-5"
      >
        <Music className="h-3.5 w-3.5 text-[var(--accent-soft)]" aria-hidden="true" />
        <span>Add public/bgm.mp3 for BGM</span>
        <button
          type="button"
          onClick={() => setHintDismissed(true)}
          aria-label="Dismiss BGM hint"
          className="rounded-full p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Background music player"
      className="fixed bottom-20 right-4 z-30 flex items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[rgba(20,18,29,0.94)] px-3.5 py-2 backdrop-blur-md sm:bottom-5 sm:right-5"
    >
      <audio
        ref={audioRef}
        src={CAPSULE_CONFIG.bgmSrc}
        loop
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setTrackStatus("missing");
        }}
      />

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-button)] text-white transition-colors hover:bg-[var(--accent-button-hover)]"
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      <div
        title={CAPSULE_CONFIG.bgmTitle}
        className="hidden max-w-[220px] truncate text-xs font-medium text-[var(--text-primary)] sm:block"
      >
        {CAPSULE_CONFIG.bgmTitle}
      </div>

      <button
        type="button"
        onClick={() => setIsMuted((prev) => !prev)}
        aria-label={isMuted || volume === 0 ? "Unmute music" : "Mute music"}
        className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={isMuted ? 0 : volume}
        onChange={(event) => {
          const next = Number(event.target.value);
          setVolume(next);
          if (next > 0 && isMuted) {
            setIsMuted(false);
          }
        }}
        aria-label="Music volume"
        className="h-1 w-16 cursor-pointer accent-[#A855F7]"
      />
    </aside>
  );
}
