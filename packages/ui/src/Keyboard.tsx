/**
 * Keyboard Component
 * 可视键盘（连续布局）
 */

import React, { useMemo } from 'react';
import { KEYBOARD_ROWS, getKeyboardMap, getNoteName, isBlackKey } from '@ai-music-creator/core';

export interface KeyboardProps {
  activeNotes?: Set<number>;
}

export function Keyboard({ activeNotes = new Set<number>() }: KeyboardProps) {
  // 生成按音高排序的音符列表
  const notes = useMemo(() => {
    const noteSet = new Set<number>();
    const map = getKeyboardMap();
    
    // 添加所有行的音符
    Object.values(KEYBOARD_ROWS).forEach((row) => {
      row.forEach((key) => {
        if (map[key] !== undefined) {
          noteSet.add(map[key]);
        }
      });
    });
    
    // 排序并返回数组
    return Array.from(noteSet).sort((a, b) => a - b);
  }, []);

  return (
    <div className="keyboard-container">
      <div className="piano-keyboard">
        {notes.map((note) => {
          const isBlack = isBlackKey(note.toString());
          const noteName = getNoteName(note);
          const isActive = activeNotes.has(note);
          
          return (
            <div
              key={note}
              className={`key ${isBlack ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
              data-note={note}
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
          width: 44px;
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
          width: 28px;
          height: 120px;
          background: linear-gradient(to bottom, #333 0%, #111 100%);
          border: none;
          border-radius: 0 0 4px 4px;
          position: absolute;
          z-index: 2;
          margin-left: -14px;
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
