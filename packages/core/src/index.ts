/**
 * @ai-music/core
 * 核心领域模型与类型定义
 */

import { Track } from "@tonejs/midi";

// 基础类型定义
export interface Sequence {
  id: string;
  bpm: number;
  tracks: Track[];
  duration: number;
}

export interface Recording {
  id: string;
  sequence: Sequence;
  startTime: number; // 录音开始时间
}

// 键盘映射
export * from "./keyboard-map";
export * from "./useKeyboardMap";
