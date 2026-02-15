/**
 * PianoKeyboard Component
 * 虚拟钢琴键盘（真实钢琴布局 + QWERTY 键位映射）
 * 桌面端：连续钢琴  |  移动端：拆分为两行八度组
 */

import { useCallback, useMemo, useRef } from "react";
import { getNoteName, DEFAULT_BASE_NOTE } from "@ai-music-creator/core";
import { useKeyboardMap } from "./useKeyboardMap";

export interface PianoKeyboardProps {
  activeNotes?: Set<number>;
  baseNote?: number;
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

/** 12音中白键的索引 */
const WHITE_KEY_INDICES = [0, 2, 4, 5, 7, 9, 11];

/** 黑键在一个八度内相对于白键的偏移位置 */
const BLACK_KEY_POSITIONS: Record<number, number> = {
  1: 0.93, // C#
  3: 1.93, // D#
  6: 3.93, // F#
  8: 4.93, // G#
  10: 5.93, // A#
};

function isWhiteKey(note: number): boolean {
  return WHITE_KEY_INDICES.includes(note % 12);
}

interface NoteGroup {
  minNote: number;
  maxNote: number;
  whiteKeys: number[];
  blackKeys: number[];
}

/**
 * 将音符范围拆分为两个八度组（各 2 个八度）
 */
function getPianoGroups(baseNote: number): NoteGroup[] {
  const minNote = baseNote - 12;
  const maxNote = baseNote + 35;
  const splitNote = baseNote + 12; // 中间分割点

  const groups: NoteGroup[] = [];
  const ranges = [
    { min: minNote, max: splitNote - 1 },
    { min: splitNote, max: maxNote },
  ];

  for (let r = 0; r < ranges.length; r++) {
    const range = ranges[r];
    const whiteKeys: number[] = [];
    const blackKeys: number[] = [];
    for (let note = range.min; note <= range.max; note++) {
      if (isWhiteKey(note)) {
        whiteKeys.push(note);
      } else {
        blackKeys.push(note);
      }
    }
    groups.push({
      minNote: range.min,
      maxNote: range.max,
      whiteKeys,
      blackKeys,
    });
  }

  return groups;
}

/**
 * 计算白键位置索引（从 groupMin 开始计数）
 */
function getWhiteKeyIndex(note: number, groupMin: number): number {
  let count = 0;
  for (let n = groupMin; n < note; n++) {
    if (isWhiteKey(n)) count++;
  }
  return count;
}

/**
 * 计算黑键的 left 偏移（相对于所在 group）
 */
function getBlackKeyLeft(note: number, groupMin: number): number {
  const octave = Math.floor(note / 12);
  const semitone = note % 12;
  const posInOctave = BLACK_KEY_POSITIONS[semitone];
  if (posInOctave === undefined) return 0;

  const octaveC = octave * 12;
  const whiteKeysBeforeOctaveC = getWhiteKeyIndex(octaveC, groupMin);

  return whiteKeysBeforeOctaveC + posInOctave;
}
export function PianoKeyboard({
  activeNotes = new Set<number>(),
  baseNote = DEFAULT_BASE_NOTE,
  onNoteOn,
  onNoteOff,
}: PianoKeyboardProps) {
  const pressedNotesRef = useRef<Set<number>>(new Set());

  const groups = useMemo(() => getPianoGroups(baseNote), [baseNote]);

  // QWERTY 反向映射 note → key
  const keyboardMap = useKeyboardMap(baseNote);
  const noteToKeyMap = useMemo(() => {
    const reverseMap: Record<number, string> = {};
    const keys = Object.keys(keyboardMap);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const note = keyboardMap[key];
      reverseMap[note] = key;
    }
    return reverseMap;
  }, [keyboardMap]);

  const handlePointerDown = useCallback(
    (note: number) => {
      pressedNotesRef.current.add(note);
      onNoteOn?.(note, 100);
    },
    [onNoteOn],
  );

  const handlePointerUp = useCallback(
    (note: number) => {
      pressedNotesRef.current.delete(note);
      onNoteOff?.(note);
    },
    [onNoteOff],
  );

  const handlePointerLeave = useCallback(
    (note: number) => {
      if (pressedNotesRef.current.has(note)) {
        pressedNotesRef.current.delete(note);
        onNoteOff?.(note);
      }
    },
    [onNoteOff],
  );

  const isBaseNote = (note: number) => note === baseNote;

  return (
    <div
      className="piano-wrapper"
      onSelect={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="piano-groups">
        {groups.map((group, gi) => {
          const whiteCount = group.whiteKeys.length;
          return (
            <div className="piano-keys" key={gi}>
              {/* 白键 */}
              {group.whiteKeys.map((note, i) => {
                const isActive = activeNotes.has(note);
                const isBase = isBaseNote(note);
                const noteName = getNoteName(note);
                const keyChar = noteToKeyMap[note] || "";
                return (
                  <button
                    key={note}
                    className={`piano-white ${isActive ? "active" : ""} ${
                      isBase ? "base" : ""
                    }`}
                    style={{
                      position: "absolute",
                      left: `${(i / whiteCount) * 100}%`,
                      width: `${(1 / whiteCount) * 100}%`,
                      height: "100%",
                      zIndex: isActive ? 1 : 0,
                    }}
                    onMouseDown={() => handlePointerDown(note)}
                    onMouseUp={() => handlePointerUp(note)}
                    onMouseLeave={() => handlePointerLeave(note)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handlePointerDown(note);
                    }}
                    onTouchEnd={() => handlePointerUp(note)}
                    onTouchCancel={() => handlePointerLeave(note)}
                  >
                    {keyChar && (
                      <span className="piano-key-char">{keyChar}</span>
                    )}
                    <span className="piano-note-name">{noteName}</span>
                  </button>
                );
              })}

              {/* 黑键 */}
              {group.blackKeys.map((note) => {
                const isActive = activeNotes.has(note);
                const leftPos = getBlackKeyLeft(note, group.minNote);
                const noteName = getNoteName(note);
                const keyChar = noteToKeyMap[note] || "";
                return (
                  <button
                    key={note}
                    className={`piano-black ${isActive ? "active" : ""}`}
                    style={{
                      position: "absolute",
                      left: `${(leftPos / whiteCount) * 100}%`,
                      width: `${(0.62 / whiteCount) * 100}%`,
                      height: "58%",
                      zIndex: isActive ? 3 : 2,
                    }}
                    onMouseDown={() => handlePointerDown(note)}
                    onMouseUp={() => handlePointerUp(note)}
                    onMouseLeave={() => handlePointerLeave(note)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handlePointerDown(note);
                    }}
                    onTouchEnd={() => handlePointerUp(note)}
                    onTouchCancel={() => handlePointerLeave(note)}
                  >
                    {keyChar && (
                      <span className="piano-key-char black">{keyChar}</span>
                    )}
                    <span className="piano-note-name black">{noteName}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <style>{`
        .piano-wrapper {
          position: relative;
          background:
            linear-gradient(160deg, rgba(13, 16, 29, 0.95) 0%, rgba(8, 10, 20, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 22px;
          box-shadow:
            0 16px 45px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .piano-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            600px circle at -10% -40%,
            rgba(79, 70, 229, 0.2),
            transparent 55%
          );
          pointer-events: none;
        }

        .piano-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            520px circle at 110% 130%,
            rgba(6, 182, 212, 0.12),
            transparent 58%
          );
          pointer-events: none;
        }

        /* 桌面端：两组并排（无间隙 = 一体钢琴） */
        .piano-groups {
          display: flex;
          flex-direction: row;
          gap: 0;
          flex: 1;
          z-index: 1;
        }

        .piano-keys {
          position: relative;
          border-radius: 4px;
          overflow: hidden;
          flex: 1;
        }

        /* ── 白键 ── */
        .piano-white {
          box-sizing: border-box;
          border: none;
          cursor: pointer;
          background:
            linear-gradient(180deg,
              rgba(220, 225, 240, 0.97) 0%,
              rgba(195, 200, 218, 0.95) 82%,
              rgba(170, 178, 200, 0.93) 100%);
          border-right: 1px solid rgba(80, 90, 120, 0.35);
          border-bottom: 3px solid rgba(120, 130, 160, 0.5);
          border-radius: 0 0 6px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 6px;
          gap: 2px;
          transition:
            background 120ms ease,
            box-shadow 150ms ease,
            border-color 120ms ease;
        }

        .piano-white:hover {
          background:
            linear-gradient(180deg,
              rgba(230, 235, 250, 1) 0%,
              rgba(210, 215, 235, 0.98) 82%,
              rgba(190, 198, 220, 0.96) 100%);
        }

        .piano-white.active {
          background:
            linear-gradient(180deg,
              rgba(165, 180, 252, 0.85) 0%,
              rgba(140, 155, 235, 0.8) 55%,
              rgba(120, 135, 220, 0.78) 100%);
          border-bottom-color: rgba(99, 102, 241, 0.6);
          box-shadow:
            0 0 22px rgba(99, 102, 241, 0.45),
            inset 0 -2px 8px rgba(99, 102, 241, 0.2);
        }

        .piano-white.base {
          background:
            linear-gradient(180deg,
              rgba(200, 240, 228, 0.97) 0%,
              rgba(175, 220, 208, 0.95) 82%,
              rgba(155, 200, 190, 0.93) 100%);
          border-bottom-color: rgba(45, 212, 191, 0.5);
        }

        .piano-white.base.active {
          background:
            linear-gradient(180deg,
              rgba(110, 231, 183, 0.85) 0%,
              rgba(80, 200, 160, 0.8) 55%,
              rgba(60, 180, 145, 0.78) 100%);
          border-bottom-color: rgba(20, 184, 166, 0.6);
          box-shadow:
            0 0 22px rgba(20, 184, 166, 0.45),
            inset 0 -2px 8px rgba(20, 184, 166, 0.2);
        }

        /* ── 黑键 ── */
        .piano-black {
          box-sizing: border-box;
          border: none;
          cursor: pointer;
          background:
            linear-gradient(180deg,
              rgba(35, 40, 58, 1) 0%,
              rgba(20, 24, 38, 1) 70%,
              rgba(12, 15, 25, 1) 100%);
          border: 1px solid rgba(60, 65, 85, 0.6);
          border-top: none;
          border-bottom: 3px solid rgba(10, 12, 20, 0.9);
          border-radius: 0 0 5px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 5px;
          gap: 1px;
          box-shadow:
            2px 4px 8px rgba(0, 0, 0, 0.5),
            inset 0 -1px 2px rgba(255, 255, 255, 0.05);
          transition:
            background 120ms ease,
            box-shadow 150ms ease,
            border-color 120ms ease;
        }

        .piano-black:hover {
          background:
            linear-gradient(180deg,
              rgba(45, 52, 72, 1) 0%,
              rgba(28, 33, 50, 1) 70%,
              rgba(18, 22, 35, 1) 100%);
        }

        .piano-black.active {
          background:
            linear-gradient(180deg,
              rgba(80, 85, 180, 0.9) 0%,
              rgba(55, 60, 140, 0.85) 55%,
              rgba(40, 45, 110, 0.82) 100%);
          border-color: rgba(129, 140, 248, 0.7);
          border-bottom-color: rgba(99, 102, 241, 0.8);
          box-shadow:
            0 0 18px rgba(99, 102, 241, 0.5),
            2px 4px 8px rgba(0, 0, 0, 0.4),
            inset 0 -1px 4px rgba(129, 140, 248, 0.2);
        }

        /* ── 键位标记（QWERTY 映射） ── */
        .piano-key-char {
          font-size: 11px;
          font-weight: 650;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          color: rgba(70, 80, 120, 0.65);
          line-height: 1;
          pointer-events: none;
          white-space: nowrap;
        }

        .piano-key-char.black {
          font-size: 9px;
          color: rgba(200, 210, 240, 0.85);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        .piano-white.active .piano-key-char {
          color: rgba(255, 255, 255, 0.95);
        }

        .piano-white.base .piano-key-char {
          color: rgba(20, 130, 110, 0.7);
        }

        .piano-white.base.active .piano-key-char {
          color: rgba(255, 255, 255, 0.95);
        }

        .piano-black.active .piano-key-char {
          color: rgba(255, 255, 255, 0.9);
        }

        /* ── 音符名 ── */
        .piano-note-name {
          font-size: 9px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-weight: 500;
          color: rgba(60, 70, 100, 0.55);
          letter-spacing: 0.3px;
          pointer-events: none;
          white-space: nowrap;
        }

        .piano-note-name.black {
          color: rgba(180, 190, 220, 0.75);
          font-size: 8px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        .piano-white.active .piano-note-name {
          color: rgba(255, 255, 255, 0.8);
        }

        .piano-white.base .piano-note-name {
          color: rgba(20, 120, 100, 0.6);
        }

        .piano-white.base.active .piano-note-name {
          color: rgba(255, 255, 255, 0.8);
        }

        .piano-black.active .piano-note-name {
          color: rgba(255, 255, 255, 0.7);
        }

        /* ── 移动端：两组上下堆叠 ── */
        @media (max-width: 860px) {
          .piano-wrapper {
            padding: 14px;
            border-radius: 18px;
            height: auto;
          }

          .piano-groups {
            flex-direction: column;
            gap: 8px;
          }

          .piano-keys {
            flex: none;
            height: 130px;
          }

          .piano-key-char {
            font-size: 10px;
          }

          .piano-key-char.black {
            font-size: 8px;
          }

          .piano-note-name {
            font-size: 8px;
          }

          .piano-note-name.black {
            font-size: 7px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .piano-white,
          .piano-black {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
