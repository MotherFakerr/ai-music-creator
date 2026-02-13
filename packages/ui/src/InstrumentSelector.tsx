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
      <span className="selector-label">音色</span>
      <div className="instrument-buttons">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            className={`instrument-btn ${value === inst.id ? "active" : ""}`}
            onClick={() => onChange(inst.id)}
            disabled={disabled || isLoading}
          >
            {inst.label}
            {isLoading && value === inst.id ? (
              <span className="loading-dot" aria-hidden="true" />
            ) : null}
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
          color: #ced4da;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.8px;
        }

        .instrument-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .instrument-btn {
          position: relative;
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

        .loading-dot {
          position: absolute;
          right: 7px;
          top: 7px;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #fbbf24;
          box-shadow: 0 0 0 rgba(251, 191, 36, 0.6);
          animation: loading-dot-pulse 900ms ease-out infinite;
        }

        @keyframes loading-dot-pulse {
          0% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.6);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
          100% {
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
          }
        }

        @media (max-width: 860px) {
          .instrument-buttons {
            flex-wrap: wrap;
            gap: 8px;
          }

          .instrument-btn {
            padding: 10px 0;
            font-size: 13px;
            flex: 1 1 calc(33.333% - 6px);
            min-width: 0;
            text-align: center;
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}
