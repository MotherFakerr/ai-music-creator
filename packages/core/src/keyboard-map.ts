/**
 * 键盘映射表（连续布局）
 * 
 * 规则：
 * - 行 3（A 键）= 基准音（默认 C3）
 * - 同行右移 = +1 半音
 * - 行 1（A 上 2 行）= 基准 + 2 八度 (+24)
 * - 行 2（A 上 1 行）= 基准 + 1 八度 (+12)
 * - 行 4（A 下 1 行）= 基准 - 1 八度 (-12)
 */

export const DEFAULT_BASE_NOTE = 48; // C3

/**
 * 键盘行定义
 */
export const KEYBOARD_ROWS = {
  row1: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  row2: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  row3: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  row4: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
} as const;

/**
 * 生成键盘映射表
 */
export function generateKeyboardMap(baseNote: number = DEFAULT_BASE_NOTE): Record<string, number> {
  const map: Record<string, number> = {};
  
  // 行 3（A 键）= 基准音
  KEYBOARD_ROWS.row3.forEach((key, index) => {
    map[key] = baseNote + index;
  });
  
  // 行 2（A 上 1 行）= 基准 + 1 八度 (+12)
  KEYBOARD_ROWS.row2.forEach((key, index) => {
    map[key] = baseNote + 12 + index;
  });
  
  // 行 1（A 上 2 行）= 基准 + 2 八度 (+24)
  KEYBOARD_ROWS.row1.forEach((key, index) => {
    map[key] = baseNote + 24 + index;
  });
  
  // 行 4（A 下 1 行）= 基准 - 1 八度 (-12)
  KEYBOARD_ROWS.row4.forEach((key, index) => {
    map[key] = baseNote - 12 + index;
  });
  
  return map;
}

// 当前基准音
let currentBaseNote = DEFAULT_BASE_NOTE;

/**
 * 设置基准音
 */
export function setBaseNote(note: number): void {
  currentBaseNote = note;
}

/**
 * 获取当前映射表
 */
export function getKeyboardMap(): Record<string, number> {
  return generateKeyboardMap(currentBaseNote);
}

// 默认映射表（基准 = C3）
export const KEYBOARD_MAP = generateKeyboardMap(DEFAULT_BASE_NOTE);

/**
 * 判断是否为黑键
 */
export function isBlackKey(key: string): boolean {
  const note = KEYBOARD_MAP[key];
  if (note === undefined) return false;
  const noteInC = note % 12;
  return [1, 3, 6, 8, 10].includes(noteInC);
}

/**
 * 获取音符名称
 */
export function getNoteName(noteNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(noteNumber / 12);
  const note = noteNames[noteNumber % 12];
  return `${note}${octave}`;
}

/**
 * 音高范围
 */
export const KEYBOARD_RANGE = {
  min: 36,  // C3 - 12 = C2 (基准 C3 时)
  max: 84,  // C5 + 12 (基准 C3 时)
  baseNote: DEFAULT_BASE_NOTE,
};
