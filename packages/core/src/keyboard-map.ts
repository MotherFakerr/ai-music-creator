/**
 * 键盘到音符的映射表
 * QWERTY 键盘 → MIDI 音符 (C3 = 48)
 */

// 白键映射：按键 → MIDI Note Number
export const WHITE_KEY_MAP: Record<string, number> = {
  // 主键盘区 (C3-E4)
  Q: 48,  // C3
  W: 50,  // D3
  E: 52,  // E3
  R: 53,  // F3
  T: 55,  // G3
  Y: 57,  // A3
  U: 59,  // B3
  I: 60,  // C4
  O: 62,  // D4
  P: 64,  // E4
  
  // 辅助键盘区 (F3-A5)
  A: 53,  // F3
  S: 55,  // G3
  D: 57,  // A3
  F: 59,  // B3
  G: 60,  // C5
  H: 62,  // D5
  J: 64,  // E5
  K: 65,  // F5
  L: 67,  // G5
  ';': 69, // A5
  "'": 69, // A5 (兼容)
};

// 黑键映射：按键 → MIDI Note Number
export const BLACK_KEY_MAP: Record<string, number> = {
  // 主键盘区
  '2': 49,  // C#3
  '3': 51,  // D#3
  '5': 54,  // F#3
  '6': 56,  // G#3
  '8': 61,  // C#4
  '9': 63,  // D#4
  
  // 辅助键盘区 (复用字母键)
  W: 54,   // F#3
  E: 56,   // G#3
  T: 58,   // A#3
  Y: 61,   // C#5
  O: 63,   // D#5
  P: 66,   // F#5
};

// 完整的按键 → 音符映射
export const KEYBOARD_MAP: Record<string, number> = {
  ...WHITE_KEY_MAP,
  ...BLACK_KEY_MAP,
};

// 音符到音名的反向映射
export const NOTE_NAMES: Record<number, string> = {
  48: 'C3', 49: 'C#3', 50: 'D3', 51: 'D#3', 52: 'E3',
  53: 'F3', 54: 'F#3', 55: 'G3', 56: 'G#3', 57: 'A3',
  58: 'A#3', 59: 'B3', 60: 'C4', 61: 'C#4', 62: 'D4',
  63: 'D#4', 64: 'E4', 65: 'F4', 66: 'F#4', 67: 'G4',
  68: 'G#4', 69: 'A4', 70: 'A#4', 71: 'B4', 72: 'C5',
  73: 'C#5', 74: 'D5', 75: 'D#5', 76: 'E5', 77: 'F5',
  78: 'F#5', 79: 'G5', 80: 'G#5', 81: 'A5',
};

/**
 * 判断是否为黑键
 */
export function isBlackKey(key: string): boolean {
  return key in BLACK_KEY_MAP;
}

/**
 * 获取当前音符名称
 */
export function getNoteName(noteNumber: number): string {
  return NOTE_NAMES[noteNumber] || `N${noteNumber}`;
}

/**
 * 音高范围
 */
export const KEYBOARD_RANGE = {
  min: 48,  // C3
  max: 81,  // A5
  whiteKeyCount: 20,
  blackKeyCount: 14,
};
