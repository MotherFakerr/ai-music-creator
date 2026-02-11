/**
 * @ai-music/core
 * 核心领域模型与类型定义
 */

// 基础类型定义
export interface Note {
  pitch: number;      // 音高 (MIDI note number)
  velocity: number;   // 力度 (0-127)
  startTime: number;  // 开始时间 (秒)
  duration: number;   // 持续时间 (秒)
}

export interface Track {
  id: string;
  name: string;
  instrument: string;  // 乐器名称
  notes: Note[];
}

export interface Sequence {
  id: string;
  bpm: number;
  tracks: Track[];
  duration: number;
}

export interface Recording {
  id: string;
  sequence: Sequence;
  startTime: number;  // 录音开始时间
}

// 工具函数
export function createNote(
  pitch: number,
  velocity: number,
  startTime: number,
  duration: number
): Note {
  return { pitch, velocity, startTime, duration };
}

export function createTrack(
  id: string,
  name: string,
  instrument: string
): Track {
  return { id, name, instrument, notes: [] };
}

// 键盘映射
export * from './keyboard-map';
