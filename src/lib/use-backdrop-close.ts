"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

export function useBackdropClose(onClose: () => void, disabled = false) {
  const startedOnBackdropRef = useRef(false);
  const endedOnBackdropRef = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    startedOnBackdropRef.current =
      event.button === 0 && event.target === event.currentTarget;
    endedOnBackdropRef.current = false;
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    endedOnBackdropRef.current = event.target === event.currentTarget;
  }

  function onPointerCancel() {
    startedOnBackdropRef.current = false;
    endedOnBackdropRef.current = false;
  }

  function onClick(event: MouseEvent<HTMLElement>) {
    const clickedBackdrop =
      startedOnBackdropRef.current &&
      endedOnBackdropRef.current &&
      event.target === event.currentTarget;
    startedOnBackdropRef.current = false;
    endedOnBackdropRef.current = false;

    if (clickedBackdrop && !disabled) {
      onClose();
    }
  }

  return { onPointerDown, onPointerUp, onPointerCancel, onClick };
}
