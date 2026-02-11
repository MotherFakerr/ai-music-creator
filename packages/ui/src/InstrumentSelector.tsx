/**
 * InstrumentSelector Component
 * 音色选择器
 */

import React from 'react';
import { InstrumentType } from '@ai-music-creator/audio';

export interface InstrumentSelectorProps {
  value: InstrumentType;
  onChange: (instrument: InstrumentType) => void;
}

const INSTRUMENTS: { id: InstrumentType; label: string }[] = [
  { id: 'piano', label: '钢琴' },
  { id: 'synth', label: '合成器' },
  { id: 'guitar', label: '电吉他' },
  { id: 'drum', label: '鼓组' },
];

export function InstrumentSelector({ value, onChange }: InstrumentSelectorProps) {
  return (
    <div className="instrument-selector">
      <label>音色</label>
      <div className="instrument-buttons">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            className={`instrument-btn ${value === inst.id ? 'active' : ''}`}
            onClick={() => onChange(inst.id)}
          >
            {inst.label}
          </button>
        ))}
      </div>
      
      <style>{`
        .instrument-selector {
          margin-bottom: 20px;
        }
        
        .instrument-selector label {
          display: block;
          margin-bottom: 8px;
          color: #fff;
          font-size: 14px;
        }
        
        .instrument-buttons {
          display: flex;
          gap: 8px;
        }
        
        .instrument-btn {
          padding: 8px 16px;
          background: #2a2a4e;
          border: 1px solid #444;
          border-radius: 6px;
          color: #aaa;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .instrument-btn:hover {
          background: #3a3a6e;
        }
        
        .instrument-btn.active {
          background: #6366f1;
          border-color: #6366f1;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
