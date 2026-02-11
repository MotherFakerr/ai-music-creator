/**
 * Keyboard Component
 * 键盘演奏界面
 */

import React, { useEffect, useState, useCallback } from 'react';
import { KEYBOARD_RANGE, isBlackKey, NOTE_NAMES } from '@ai-music-creator/core';

export interface KeyboardProps {
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
  activeNotes?: Set<number>;
}

export function Keyboard({ 
  onNoteOn, 
  onNoteOff,
  activeNotes = new Set<number>()
}: KeyboardProps) {
  // 生成键盘上的音符列表（从 C3 到 A5）
  const notes: number[] = [];
  for (let note = KEYBOARD_RANGE.min; note <= KEYBOARD_RANGE.max; note++) {
    notes.push(note);
  }

  return (
    <div className="keyboard-container">
      <div className="piano-keyboard">
        {notes.map((note) => {
          const isBlack = isBlackKey(note.toString());
          const noteName = NOTE_NAMES[note] || '';
          const isActive = activeNotes.has(note);
          
          return (
            <div
              key={note}
              className={`key ${isBlack ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
              data-note={note}
              data-name={noteName}
            >
              <span className="key-label">{noteName}</span>
            </div>
          );
        })}
      </div>
      
      <style>{`
        .keyboard-container {
          padding: 20px;
          background: #1a1a2e;
          border-radius: 12px;
          overflow-x: auto;
        }
        
        .piano-keyboard {
          display: flex;
          position: relative;
          height: 200px;
          min-width: fit-content;
        }
        
        .key {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 10px;
          cursor: pointer;
          user-select: none;
          transition: all 0.05s ease;
        }
        
        .key.white {
          width: 50px;
          height: 200px;
          background: linear-gradient(to bottom, #fff 0%, #f0f0f0 100%);
          border: 1px solid #ccc;
          border-radius: 0 0 6px 6px;
          z-index: 1;
        }
        
        .key.white:hover {
          background: linear-gradient(to bottom, #fff 0%, #e0e0e0 100%);
        }
        
        .key.white.active {
          background: linear-gradient(to bottom, #ddd 0%, #ccc 100%);
          transform: translateY(2px);
        }
        
        .key.black {
          width: 30px;
          height: 120px;
          background: linear-gradient(to bottom, #333 0%, #111 100%);
          border: none;
          border-radius: 0 0 4px 4px;
          position: absolute;
          z-index: 2;
          margin-left: -15px; /* 居中对齐 */
        }
        
        .key.black:hover {
          background: linear-gradient(to bottom, #444 0%, #222 100%);
        }
        
        .key.black.active {
          background: linear-gradient(to bottom, #555 0%, #333 100%);
          transform: translateY(2px);
        }
        
        .key-label {
          font-size: 10px;
          color: #666;
          pointer-events: none;
        }
        
        .key.white .key-label {
          color: #999;
        }
        
        .key.black .key-label {
          color: #888;
        }
      `}</style>
    </div>
  );
}
