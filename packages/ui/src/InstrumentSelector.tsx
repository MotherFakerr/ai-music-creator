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
      <span className="selector-label">音色</span>
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

        .instrument-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .instrument-btn {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .instrument-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .instrument-btn.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
          color: #fff;
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}
