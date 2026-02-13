/**
 * useKeyboard Hook
 * 处理键盘演奏事件
 */

import { useEffect, useCallback, useState } from "react";
import { useKeyboardMap } from "./useKeyboardMap";

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

  // 通用的 noteOn / noteOff，供物理键盘和虚拟键盘共用
  const noteOn = useCallback(
    (note: number, velocity: number) => {
      if (disabled) return;
      setActiveNotes((prev) => {
        if (prev.has(note)) return prev;
        return new Set([...prev, note]);
      });
      onNoteOn?.(note, velocity);
    },
    [disabled, onNoteOn]
  );

  const noteOff = useCallback(
    (note: number) => {
      if (disabled) return;
      setActiveNotes((prev) => {
        if (!prev.has(note)) return prev;
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      onNoteOff?.(note);
    },
    [disabled, onNoteOff]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // 避免重复触发
      if (event.repeat) return;

      const key = event.key.toUpperCase();
      const note = keyboardMap[key];

      if (note !== undefined) {
        noteOn(note, 100); // 默认力度 100
      }
    },
    [disabled, keyboardMap, noteOn]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      const key = event.key.toUpperCase();
      const note = keyboardMap[key];

      if (note !== undefined) {
        noteOff(note);
      }
    },
    [disabled, keyboardMap, noteOff]
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

  return { activeNotes, noteOn, noteOff };
}
