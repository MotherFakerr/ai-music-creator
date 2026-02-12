/**
 * InstrumentSelector Component
 * 音色选择器
 */

import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";

export interface InstrumentSelectorProps {
  value: EN_INSTRUMENT_TYPE;
  onChange: (instrument: EN_INSTRUMENT_TYPE) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const INSTRUMENTS: { id: EN_INSTRUMENT_TYPE; label: string }[] = [
  { id: EN_INSTRUMENT_TYPE.PIANO, label: "钢琴" },
  { id: EN_INSTRUMENT_TYPE.SYNTH, label: "合成器" },
  { id: EN_INSTRUMENT_TYPE.GUITAR, label: "吉他" },
  { id: EN_INSTRUMENT_TYPE.DISTORTION_GUITAR, label: "失真吉他" },
  { id: EN_INSTRUMENT_TYPE.DRUM, label: "鼓组" },
];

export function InstrumentSelector({
  value,
  onChange,
  isLoading = false,
  disabled = false,
}: InstrumentSelectorProps) {
  return (
    <div className="instrument-selector">
      <span className="selector-label">
        {isLoading ? "音色（加载中...）" : "音色"}
      </span>
      <div className="instrument-buttons">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            className={`instrument-btn ${value === inst.id ? "active" : ""}`}
            onClick={() => onChange(inst.id)}
            disabled={disabled || isLoading}
          >
            {inst.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <span className="loading-tip">正在加载乐器，请稍候...</span>
      ) : null}

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

        .instrument-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          transform: none;
          box-shadow: none;
        }

        .instrument-btn:disabled:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.08);
          color: #9ca3af;
        }

        .loading-tip {
          color: #93c5fd;
          font-size: 12px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
