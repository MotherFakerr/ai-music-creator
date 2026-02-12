/**
 * useKeyboardMap Hook
 * 获取响应基准音变化的键盘映射表
 */

import { generateKeyboardMap, DEFAULT_BASE_NOTE } from './keyboard-map';

let cachedBaseNote: number | null = null;
let cachedMap: Record<string, number> | null = null;

export function useKeyboardMap(baseNote: number = DEFAULT_BASE_NOTE): Record<string, number> {
  // 缓存机制：当 baseNote 变化时重新生成
  if (cachedBaseNote !== baseNote) {
    cachedBaseNote = baseNote;
    cachedMap = generateKeyboardMap(baseNote);
  }
  return cachedMap!;
}

/**
 * 获取音符对应的按键
 */
export function getKeyForNote(
  note: number,
  keyboardMap: Record<string, number>
): string | null {
  const keys = Object.keys(keyboardMap);
  for (const key of keys) {
    if (keyboardMap[key] === note) return key;
  }
  return null;
}
