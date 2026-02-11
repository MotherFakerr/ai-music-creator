/**
 * BaseNoteSelector Component
 * 基准音选择器（输入 MIDI note number，显示音名）
 */

import React, { useState, useEffect } from 'react';
import { DEFAULT_BASE_NOTE, getNoteName } from '@ai-music-creator/core';

export interface BaseNoteSelectorProps {
  value?: number;
  onChange?: (note: number) => void;
}

export function BaseNoteSelector({ 
  value = DEFAULT_BASE_NOTE, 
  onChange 
}: BaseNoteSelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);

  // 输入范围
  const MIN_NOTE = 48; // C3
  const MAX_NOTE = 60; // C4

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // 验证是否为数字
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setError('请输入数字');
      return;
    }
    
    // 验证范围
    if (num < MIN_NOTE || num > MAX_NOTE) {
      setError(`范围 ${MIN_NOTE}-${MAX_NOTE} (C3-C4)`);
      return;
    }
    
    setError(null);
    onChange?.(num);
  };

  const handleBlur = () => {
    // 失焦时自动修正为有效值
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < MIN_NOTE) {
      setInputValue(MIN_NOTE.toString());
      onChange?.(MIN_NOTE);
    } else if (num > MAX_NOTE) {
      setInputValue(MAX_NOTE.toString());
      onChange?.(MAX_NOTE);
    }
    setError(null);
  };

  // 显示的音名
  const displayNote = getNoteName(value);

  return (
    <div className="base-note-selector">
      <label>基准音</label>
      <div className="input-wrapper">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={MIN_NOTE}
          max={MAX_NOTE}
          className={error ? 'error' : ''}
        />
        <span className="note-display">→ {displayNote}</span>
      </div>
      {error && <span className="error-message">{error}</span>}
      
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
        
        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .base-note-selector input {
          width: 80px;
          padding: 8px 12px;
          background: #2a2a4e;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
          font-size: 16px;
          font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .base-note-selector input:focus {
          outline: none;
          border-color: #6366f1;
        }
        
        .base-note-selector input.error {
          border-color: #ef4444;
        }
        
        .note-display {
          font-size: 24px;
          font-weight: 700;
          color: #6366f1;
          font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .error-message {
          display: block;
          margin-top: 6px;
          color: #ef4444;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
