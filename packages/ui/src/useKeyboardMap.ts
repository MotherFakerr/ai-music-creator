/**
 * useKeyboardMap
 * 获取响应基准音变化的键盘映射表
 */

import { useMemo } from 'react';
import { generateKeyboardMap, DEFAULT_BASE_NOTE } from '@ai-music-creator/core';

export function useKeyboardMap(baseNote: number = DEFAULT_BASE_NOTE): Record<string, number> {
  return useMemo(() => generateKeyboardMap(baseNote), [baseNote]);
}
