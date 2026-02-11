/**
 * useKeyboard Hook
 * 处理键盘演奏事件
 */

import { useEffect, useCallback, useState } from 'react';
import { KEYBOARD_MAP } from '@ai-music-creator/core';

export interface UseKeyboardOptions {
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export function useKeyboard({ onNoteOn, onNoteOff }: UseKeyboardOptions) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 避免重复触发
    if (event.repeat) return;
    
    const key = event.key.toUpperCase();
    const note = KEYBOARD_MAP[key];
    
    if (note !== undefined && !activeNotes.has(note)) {
      setActiveNotes(prev => new Set([...prev, note]));
      onNoteOn?.(note, 100); // 默认力度 100
    }
  }, [activeNotes, onNoteOn]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toUpperCase();
    const note = KEYBOARD_MAP[key];
    
    if (note !== undefined) {
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      onNoteOff?.(note);
    }
  }, [onNoteOff]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { activeNotes };
}
