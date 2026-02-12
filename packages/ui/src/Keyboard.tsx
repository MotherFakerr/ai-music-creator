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
          background: #1a1a2e;
          border-radius: 12px;
          padding: 20px;
        }

        .keyboard-row {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
          justify-content: center;
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
          width: 48px;
          height: 56px;
          background: linear-gradient(to bottom, #e8e8e8 0%, #d0d0d0 100%);
          border: 1px solid #999;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.1s ease;
          padding: 6px;
        }

        .key:hover {
          background: linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .key.active {
          background: linear-gradient(to bottom, #888 0%, #666 100%);
          transform: translateY(2px);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* 基准键 A */
        .key.base-key {
          background: linear-gradient(to bottom, #d4f5d4 0%, #b8e6b8 100%);
          border-color: #10b981;
        }

        .key.base-key.active {
          background: linear-gradient(to bottom, #10b981 0%, #059669 100%);
        }

        .key.base-key:hover {
          background: linear-gradient(to bottom, #dcfce7 0%, #bbf7d0 100%);
        }

        /* 黑键变体 */
        .key.black-key {
          background: linear-gradient(to bottom, #4a4a4a 0%, #2a2a2a 100%);
          border-color: #1a1a1a;
          color: #fff;
        }

        .key.black-key:hover {
          background: linear-gradient(to bottom, #5a5a5a 0%, #3a3a3a 100%);
        }

        .key.black-key.active {
          background: linear-gradient(to bottom, #1a1a1a 0%, #000 100%);
        }

        .key-char {
          font-size: 18px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #333;
          line-height: 1;
        }

        .key.black-key .key-char {
          color: #fff;
        }

        .note-name {
          font-size: 10px;
          color: #666;
          font-family: 'Monaco', 'Consolas', monospace;
          margin-top: 4px;
        }

        .key.black-key .note-name {
          color: #aaa;
        }
      `}</style>
    </div>
  );
}
