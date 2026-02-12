/**
 * BaseNoteSelector Component
 * 基准音选择器（直接显示音阶 + 上下箭头）
 */

import React from 'react';
import { DEFAULT_BASE_NOTE, getNoteName } from '@ai-music-creator/core';

export interface BaseNoteSelectorProps {
  value?: number;
  onChange?: (note: number) => void;
}

export function BaseNoteSelector({
  value = DEFAULT_BASE_NOTE,
  onChange
}: BaseNoteSelectorProps) {
  // 输入范围
  const MIN_NOTE = 48; // C3
  const MAX_NOTE = 60; // C4

  const handleIncrement = () => {
    const newNote = Math.min(value + 1, MAX_NOTE);
    onChange?.(newNote);
  };

  const handleDecrement = () => {
    const newNote = Math.max(value - 1, MIN_NOTE);
    onChange?.(newNote);
  };

  // 显示的音名
  const displayNote = getNoteName(value);

  return (
    <div className="base-note-selector">
      <label>基准音</label>
      <div className="selector-wrapper">
        <span className="note-display">{displayNote}</span>
        <div className="arrow-controls">
          <button
            className="arrow-btn up"
            onClick={handleIncrement}
            disabled={value >= MAX_NOTE}
            aria-label="升高"
          >▲</button>
          <button
            className="arrow-btn down"
            onClick={handleDecrement}
            disabled={value <= MIN_NOTE}
            aria-label="降低"
          >▼</button>
        </div>
      </div>

      <style>{`
        .base-note-selector {
          margin-bottom: 20px;
        }

        .base-note-selector label {
          display: block;
          margin-bottom: 8px;
          color: #fff;
          font-size: 14px;
        }

        .selector-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .note-display {
          font-size: 32px;
          font-weight: 700;
          color: #6366f1;
          font-family: 'Monaco', 'Consolas', monospace;
          min-width: 60px;
        }

        .arrow-controls {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .arrow-btn {
          width: 28px;
          height: 20px;
          padding: 0;
          background: #2a2a4e;
          border: 1px solid #444;
          border-radius: 4px;
          color: #fff;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .arrow-btn:hover:not(:disabled) {
          background: #3a3a5e;
          border-color: #6366f1;
        }

        .arrow-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
