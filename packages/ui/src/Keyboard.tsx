/**
 * Keyboard Component
 * 虚拟键盘（QWERTY 布局 + 音阶显示）
 */

import React, { useMemo } from 'react';
import { KEYBOARD_ROWS, getKeyboardMap, getNoteName, isBlackKey, DEFAULT_BASE_NOTE } from '@ai-music-creator/core';

export interface KeyboardProps {
  activeNotes?: Set<number>;
}

export function Keyboard({ activeNotes = new Set<number>() }: KeyboardProps) {
  const keyboardMap = useMemo(() => getKeyboardMap(), []);

  // 获取按键对应的音符
  const getNoteForKey = (key: string) => keyboardMap[key];

  return (
    <div className="keyboard-wrapper">
      {/* 行 1：数字键 */}
      <div className="keyboard-row">
        {KEYBOARD_ROWS.row1.map((key) => {
          const note = getNoteForKey(key);
          const noteName = note ? getNoteName(note) : '';
          const isActive = note ? activeNotes.has(note) : false;
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? 'active' : ''} ${isBlackKeyNote ? 'black-key' : ''}`}
              data-key={key}
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
          const noteName = note ? getNoteName(note) : '';
          const isActive = note ? activeNotes.has(note) : false;
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? 'active' : ''} ${isBlackKeyNote ? 'black-key' : ''}`}
              data-key={key}
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
          const noteName = note ? getNoteName(note) : '';
          const isActive = note ? activeNotes.has(note) : false;
          const isBaseKey = key === 'A'; // A 键是基准
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? 'active' : ''} ${isBaseKey ? 'base-key' : ''} ${isBlackKeyNote ? 'black-key' : ''}`}
              data-key={key}
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
          const noteName = note ? getNoteName(note) : '';
          const isActive = note ? activeNotes.has(note) : false;
          const isBlackKeyNote = note ? isBlackKey(note.toString()) : false;

          return (
            <button
              key={key}
              className={`key ${isActive ? 'active' : ''} ${isBlackKeyNote ? 'black-key' : ''}`}
              data-key={key}
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
          background: linear-gradient(145deg, rgba(15, 15, 25, 0.95), rgba(10, 10, 20, 0.98));
          border-radius: 28px;
          padding: 32px;
          box-shadow:
            0 0 60px rgba(99, 102, 241, 0.1),
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        /* 霓虹边框光晕 */
        .keyboard-wrapper::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 30px;
          background: linear-gradient(135deg,
            rgba(99, 102, 241, 0.3),
            rgba(139, 92, 246, 0.3),
            rgba(16, 185, 129, 0.3)
          );
          z-index: -1;
          filter: blur(8px);
          opacity: 0.5;
        }

        .keyboard-row {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
          justify-content: center;
          position: relative;
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
          width: 52px;
          height: 52px;
          background: linear-gradient(180deg, rgba(40, 40, 60, 0.9) 0%, rgba(25, 25, 40, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 6px;
          overflow: visible;
        }

        /* 按键顶部高光 */
        .key::before {
          content: '';
          position: absolute;
          top: 0;
          left: 8px;
          right: 8px;
          height: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%);
          border-radius: 10px 10px 0 0;
          pointer-events: none;
        }

        /* 按键底部阴影 */
        .key::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 8px;
          background: rgba(0, 0, 0, 0.4);
          filter: blur(4px);
          border-radius: 50%;
          z-index: -1;
          transition: all 0.2s ease;
        }

        .key:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.4),
            0 0 24px rgba(99, 102, 241, 0.15);
        }

        .key:hover::after {
          bottom: -6px;
          filter: blur(6px);
          opacity: 0.6;
        }

        .key.active {
          transform: translateY(3px);
          background: linear-gradient(180deg, rgba(60, 60, 90, 0.9) 0%, rgba(40, 40, 65, 0.95) 100%);
          box-shadow:
            inset 0 4px 12px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(99, 102, 241, 0.25);
        }

        .key.active::after {
          opacity: 0;
        }

        /* 霓虹点阵效果 */
        .key.active::before {
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.2) 0%, transparent 100%);
        }

        /* 按键内发光 */
        .key.active {
          border-color: rgba(139, 92, 246, 0.5);
        }

        /* 基准键 A */
        .key.base-key {
          background: linear-gradient(180deg, rgba(6, 78, 59, 0.9) 0%, rgba(4, 55, 42, 0.95) 100%);
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .key.base-key::before {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, transparent 100%);
        }

        .key.base-key.active {
          background: linear-gradient(180deg, rgba(5, 150, 105, 0.9) 0%, rgba(4, 70, 52, 0.95) 100%);
          border-color: rgba(16, 185, 129, 0.7);
          box-shadow:
            inset 0 4px 12px rgba(0, 0, 0, 0.4),
            0 0 40px rgba(16, 185, 129, 0.3),
            0 0 60px rgba(16, 185, 129, 0.1);
        }

        .key.base-key:hover {
          border-color: rgba(16, 185, 129, 0.6);
          box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.4),
            0 0 32px rgba(16, 185, 129, 0.2);
        }

        /* 黑键变体 */
        .key.black-key {
          background: linear-gradient(180deg, rgba(20, 20, 35, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%);
          border-color: rgba(0, 0, 0, 0.3);
        }

        .key.black-key::before {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
        }

        .key.black-key.active {
          background: linear-gradient(180deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 35, 0.98) 100%);
          border-color: rgba(139, 92, 246, 0.4);
          box-shadow:
            inset 0 4px 12px rgba(0, 0, 0, 0.6),
            0 0 30px rgba(139, 92, 246, 0.2);
        }

        .key-char {
          font-size: 20px;
          font-weight: 700;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #e8e8f0;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          letter-spacing: 0.5px;
        }

        .key.black-key .key-char {
          color: #b8b8c8;
        }

        .note-name {
          font-size: 11px;
          color: #6b7280;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          margin-top: 4px;
          font-weight: 500;
          letter-spacing: 1px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .key.black-key .note-name {
          color: #555;
        }

        .key:hover .note-name {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
