/**
 * BaseNoteSelector Component
 * 基准音选择器
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
      <span className="selector-label">基准音</span>
      <div className="selector-content">
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
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .selector-label {
          color: #9ca3af;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .selector-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .note-display {
          font-size: 28px;
          font-weight: 600;
          font-family: 'Monaco', 'Consolas', monospace;
          color: #fff;
          min-width: 50px;
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
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #6b7280;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .arrow-btn:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
          color: #fff;
        }

        .arrow-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
