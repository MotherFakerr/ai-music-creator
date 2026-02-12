/**
 * useKeyboard Hook
 * 处理键盘演奏事件
 */

import { useEffect, useCallback, useState } from "react";
import { useKeyboardMap } from "@ai-music-creator/core";

export interface UseKeyboardOptions {
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
  baseNote?: number;
  disabled?: boolean;
}

export function useKeyboard({
  onNoteOn,
  onNoteOff,
  baseNote,
  disabled = false,
}: UseKeyboardOptions = {}) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const keyboardMap = useKeyboardMap(baseNote);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // 避免重复触发
      if (event.repeat) return;

      const key = event.key.toUpperCase();
      const note = keyboardMap[key];

      if (note !== undefined && !activeNotes.has(note)) {
        setActiveNotes((prev: Set<number>) => new Set([...prev, note]));
        onNoteOn?.(note, 100); // 默认力度 100
      }
    },
    [activeNotes, disabled, onNoteOn, keyboardMap]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const key = event.key.toUpperCase();
      const note = keyboardMap[key];

      if (note !== undefined) {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
        onNoteOff?.(note);
      }
    },
    [disabled, onNoteOff, keyboardMap]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (!disabled || activeNotes.size === 0) return;

    activeNotes.forEach((note) => onNoteOff?.(note));
    setActiveNotes(new Set());
  }, [activeNotes, disabled, onNoteOff]);

  return { activeNotes };
}
