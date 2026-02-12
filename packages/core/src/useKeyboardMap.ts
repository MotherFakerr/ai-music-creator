/**
 * useKeyboardMap Hook
 * 获取响应基准音变化的键盘映射表
 */

import { useMemo } from 'react';
import { generateKeyboardMap, DEFAULT_BASE_NOTE } from './keyboard-map';

export function useKeyboardMap(baseNote: number = DEFAULT_BASE_NOTE): Record<string, number> {
  return useMemo(() => generateKeyboardMap(baseNote), [baseNote]);
}

/**
 * 获取音符对应的按键
 */
export function getKeyForNote(
  note: number,
  keyboardMap: Record<string, number>
): string | null {
  for (const [key, noteNum] of Object.entries(keyboardMap)) {
    if (noteNum === note) return key;
  }
  return null;
}
