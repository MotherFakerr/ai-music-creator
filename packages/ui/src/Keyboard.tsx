/**
 * Keyboard Component
 * 虚拟键盘（QWERTY 布局 + 音阶显示）
 */

import {
  KEYBOARD_ROWS,
  getNoteName,
  isBlackKey,
  DEFAULT_BASE_NOTE,
} from "@ai-music-creator/core";
import { useKeyboardMap } from "./useKeyboardMap";

export interface KeyboardProps {
  activeNotes?: Set<number>;
  baseNote?: number;
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export function Keyboard({
  activeNotes = new Set<number>(),
  baseNote = DEFAULT_BASE_NOTE,
  onNoteOn,
  onNoteOff,
}: KeyboardProps) {
  // 使用 hook 响应基准音变化
  const keyboardMap = useKeyboardMap(baseNote);

  // 获取按键对应的音符
  const getNoteForKey = (key: string) => keyboardMap[key];

  return (
    <div className="keyboard-wrapper">
      {/* 行 1：数字键 */}
      <div className="keyboard-row">
        {KEYBOARD_ROWS.row1.map((key) => {
          const note = getNoteForKey(key);
          const noteName = note ? getNoteName(note) : "";
          const isActive = note ? activeNotes.has(note) : false;
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? "active" : ""} ${
                isBlackKeyNote ? "black-key" : ""
              }`}
              data-key={key}
              onMouseDown={() => note && onNoteOn?.(note, 100)}
              onMouseUp={() => note && onNoteOff?.(note)}
              onMouseLeave={() => note && activeNotes.has(note) && onNoteOff?.(note)}
              onTouchStart={(e) => {
                e.preventDefault();
                note && onNoteOn?.(note, 100);
              }}
              onTouchEnd={() => note && onNoteOff?.(note)}
            >
              <span className="key-char">{key}</span>
              <span className="note-name">{noteName}</span>
            </button>
          );
        })}
      </div>

      {/* 行 2：Q-P */}
      <div className="keyboard-row">
        {KEYBOARD_ROWS.row2.map((key) => {
          const note = getNoteForKey(key);
          const noteName = note ? getNoteName(note) : "";
          const isActive = note ? activeNotes.has(note) : false;
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? "active" : ""} ${
                isBlackKeyNote ? "black-key" : ""
              }`}
              data-key={key}
              onMouseDown={() => note && onNoteOn?.(note, 100)}
              onMouseUp={() => note && onNoteOff?.(note)}
              onMouseLeave={() => note && activeNotes.has(note) && onNoteOff?.(note)}
              onTouchStart={(e) => {
                e.preventDefault();
                note && onNoteOn?.(note, 100);
              }}
              onTouchEnd={() => note && onNoteOff?.(note)}
            >
              <span className="key-char">{key}</span>
              <span className="note-name">{noteName}</span>
            </button>
          );
        })}
      </div>

      {/* 行 3：A-L（基准区） */}
      <div className="keyboard-row">
        {KEYBOARD_ROWS.row3.map((key) => {
          const note = getNoteForKey(key);
          const noteName = note ? getNoteName(note) : "";
          const isActive = note ? activeNotes.has(note) : false;
          const isBaseKey = key === "A"; // A 键是基准
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? "active" : ""} ${
                isBaseKey ? "base-key" : ""
              } ${isBlackKeyNote ? "black-key" : ""}`}
              data-key={key}
              onMouseDown={() => note && onNoteOn?.(note, 100)}
              onMouseUp={() => note && onNoteOff?.(note)}
              onMouseLeave={() => note && activeNotes.has(note) && onNoteOff?.(note)}
              onTouchStart={(e) => {
                e.preventDefault();
                note && onNoteOn?.(note, 100);
              }}
              onTouchEnd={() => note && onNoteOff?.(note)}
            >
              <span className="key-char">{key}</span>
              <span className="note-name">{noteName}</span>
            </button>
          );
        })}
      </div>

      {/* 行 4：Z-/ */}
      <div className="keyboard-row">
        {KEYBOARD_ROWS.row4.map((key) => {
          const note = getNoteForKey(key);
          const noteName = note ? getNoteName(note) : "";
          const isActive = note ? activeNotes.has(note) : false;
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? "active" : ""} ${
                isBlackKeyNote ? "black-key" : ""
              }`}
              data-key={key}
              onMouseDown={() => note && onNoteOn?.(note, 100)}
              onMouseUp={() => note && onNoteOff?.(note)}
              onMouseLeave={() => note && activeNotes.has(note) && onNoteOff?.(note)}
              onTouchStart={(e) => {
                e.preventDefault();
                note && onNoteOn?.(note, 100);
              }}
              onTouchEnd={() => note && onNoteOff?.(note)}
            >
              <span className="key-char">{key}</span>
              <span className="note-name">{noteName}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        .keyboard-wrapper {
          position: relative;
          background:
            linear-gradient(160deg, rgba(13, 16, 29, 0.95) 0%, rgba(8, 10, 20, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 22px;
          box-shadow:
            0 16px 45px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }

        .keyboard-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            600px circle at -10% -40%,
            rgba(79, 70, 229, 0.25),
            transparent 55%
          );
          pointer-events: none;
        }

        .keyboard-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            520px circle at 110% 130%,
            rgba(6, 182, 212, 0.15),
            transparent 58%
          );
          pointer-events: none;
        }

        .keyboard-row {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .keyboard-row:last-child {
          margin-bottom: 0;
        }

        .key {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: clamp(44px, 4vw, 54px);
          height: clamp(46px, 4.2vw, 56px);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 35%),
            linear-gradient(180deg, rgba(42, 48, 73, 0.92) 0%, rgba(24, 29, 48, 0.95) 100%);
          border: 1px solid rgba(147, 163, 184, 0.24);
          border-radius: 12px;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 220ms ease,
            background 220ms ease;
          padding: 5px 4px 4px;
          overflow: hidden;
          backdrop-filter: blur(3px);
        }

        .key::before {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          pointer-events: none;
        }

        .key::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 76%;
          height: 10px;
          background: rgba(56, 189, 248, 0.2);
          filter: blur(10px);
          border-radius: 50%;
          opacity: 0;
          transition: opacity 200ms ease;
        }

        .key:hover {
          transform: translateY(-2px);
          border-color: rgba(129, 140, 248, 0.55);
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(99, 102, 241, 0.14) inset;
        }

        .key:hover::after {
          opacity: 0.35;
        }

        .key.active {
          transform: translateY(1px) scale(0.98);
          background:
            linear-gradient(180deg, rgba(129, 140, 248, 0.22) 0%, rgba(129, 140, 248, 0) 45%),
            linear-gradient(180deg, rgba(50, 58, 92, 0.95) 0%, rgba(30, 36, 62, 0.98) 100%);
          border-color: rgba(165, 180, 252, 0.7);
          box-shadow:
            inset 0 3px 10px rgba(7, 10, 22, 0.7),
            0 0 18px rgba(99, 102, 241, 0.35),
            0 0 30px rgba(99, 102, 241, 0.15);
        }

        .key.active::after {
          opacity: 0.55;
        }

        .key.base-key {
          background:
            linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 48%),
            linear-gradient(180deg, rgba(24, 65, 59, 0.94) 0%, rgba(11, 40, 35, 0.98) 100%);
          border: 1px solid rgba(45, 212, 191, 0.45);
        }

        .key.base-key .key-char {
          color: #d1fae5;
        }

        .key.base-key.active {
          background:
            linear-gradient(180deg, rgba(45, 212, 191, 0.28) 0%, rgba(45, 212, 191, 0) 45%),
            linear-gradient(180deg, rgba(22, 80, 72, 0.96) 0%, rgba(14, 51, 45, 1) 100%);
          border-color: rgba(94, 234, 212, 0.85);
          box-shadow:
            inset 0 3px 10px rgba(0, 0, 0, 0.55),
            0 0 16px rgba(20, 184, 166, 0.42),
            0 0 28px rgba(20, 184, 166, 0.2);
        }

        .key.base-key:hover {
          border-color: rgba(45, 212, 191, 0.75);
        }

        .key.black-key {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 30%),
            linear-gradient(180deg, rgba(26, 29, 40, 0.96) 0%, rgba(11, 13, 20, 1) 100%);
          border-color: rgba(71, 85, 105, 0.35);
        }

        .key.black-key.active {
          background:
            linear-gradient(180deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 40%),
            linear-gradient(180deg, rgba(30, 35, 52, 0.98) 0%, rgba(14, 18, 28, 1) 100%);
          border-color: rgba(129, 140, 248, 0.65);
          box-shadow:
            inset 0 4px 12px rgba(0, 0, 0, 0.75),
            0 0 14px rgba(99, 102, 241, 0.35);
        }

        .key-char {
          font-size: clamp(17px, 1.5vw, 20px);
          font-weight: 650;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #e2e8f0;
          line-height: 1;
          text-shadow: 0 2px 6px rgba(2, 6, 23, 0.5);
          letter-spacing: 0.3px;
        }

        .key.black-key .key-char {
          color: #cbd5e1;
        }

        .note-name {
          font-size: clamp(9px, 0.95vw, 11px);
          color: #94a3b8;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          margin-top: 4px;
          font-weight: 500;
          letter-spacing: 0.8px;
          text-shadow: 0 1px 3px rgba(2, 6, 23, 0.5);
        }

        .key.black-key .note-name {
          color: #64748b;
        }

        .key:hover .note-name {
          color: #cbd5e1;
        }

        @media (max-width: 860px) {
          .keyboard-wrapper {
            padding: 16px;
            border-radius: 18px;
          }

          .keyboard-row {
            gap: 6px;
            margin-bottom: 8px;
            justify-content: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .key {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
