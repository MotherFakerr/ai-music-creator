/**
 * App.tsx
 * AI Music Creator - 音乐演奏入口
 */

import { useState, useEffect, useCallback } from "react";
import {
  Keyboard,
  useKeyboard,
  InstrumentSelector,
  BaseNoteSelector,
} from "@ai-music-creator/ui";
import { EN_INSTRUMENT_TYPE, getAudioEngine } from "@ai-music-creator/audio";
import {
  getNoteName,
  setBaseNote,
  DEFAULT_BASE_NOTE,
} from "@ai-music-creator/core";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<EN_INSTRUMENT_TYPE>(
    EN_INSTRUMENT_TYPE.PIANO
  );
  const [baseNote, setBaseNoteState] = useState(DEFAULT_BASE_NOTE);
  const [audioEngine] = useState(() => getAudioEngine());

  // 初始化音频引擎
  useEffect(() => {
    const init = async () => {
      try {
        await audioEngine.init();
        setIsInitialized(true);
        console.log("[App] 音频引擎初始化成功（自动加载）");
      } catch (err) {
        console.error("[App] 音频引擎初始化失败:", err);
      }
    };

    void init();

    return () => {
      audioEngine.dispose();
    };
  }, [audioEngine]);

  // 音符事件处理
  const handleNoteOn = useCallback(
    (note: number, velocity: number) => {
      if (!isInitialized) return;
      audioEngine.playNote(note, velocity);
      setCurrentNote(getNoteName(note));
    },
    [isInitialized, audioEngine]
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      if (isInitialized) {
        audioEngine.stopNote(note);
      }
    },
    [isInitialized, audioEngine]
  );

  // 切换音色
  const handleInstrumentChange = useCallback(
    async (newInstrument: EN_INSTRUMENT_TYPE) => {
      setInstrument(newInstrument);
      await audioEngine.setInstrument(newInstrument);
    },
    [audioEngine]
  );

  // 切换基准音
  const handleBaseNoteChange = useCallback((note: number) => {
    setBaseNoteState(note);
    setBaseNote(note);
  }, []);

  // 键盘事件 Hook
  const { activeNotes } = useKeyboard({
    baseNote,
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
  });

  return (
    <div className="app-container">
      {/* 背景动画 */}
      <div className="bg-animation">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🎵</span>
          <h1>AI Music Creator</h1>
        </div>
        <p className="subtitle">里程碑一：音乐演奏</p>
      </header>

      <main className="app-main">
        {/* 第一行：基准音 + 当前音符 */}
        <div className="control-row">
          <div className="control-card base-card">
            <BaseNoteSelector
              value={baseNote}
              onChange={handleBaseNoteChange}
            />
          </div>
          <div className="control-card note-card">
            {currentNote ? (
              <>
                <span className="note-label">当前音符</span>
                <span className="note-value pulse">{currentNote}</span>
              </>
            ) : (
              <span className="note-placeholder">
                <span className="hint-dot" /> 按下键盘开始演奏
              </span>
            )}
          </div>
        </div>

        {/* 第二行：音色选择 */}
        <div className="control-card instrument-card">
          <InstrumentSelector
            value={instrument}
            onChange={handleInstrumentChange}
          />
        </div>

        {/* 键盘组件 */}
        <Keyboard activeNotes={activeNotes} baseNote={baseNote} />
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .app-container {
          min-height: 100vh;
          background: #0a0a0f;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* 背景动画 */
        .bg-animation {
          position: fixed;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          bottom: -50px;
          left: -50px;
          animation-delay: -7s;
        }

        .orb-3 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(20px, 30px) scale(1.02); }
        }

        .app-header {
          position: relative;
          z-index: 10;
          padding: 32px 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 32px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .app-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .app-main {
          position: relative;
          z-index: 10;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }

        .control-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .control-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          backdrop-filter: blur(10px);
        }

        .base-card {
          flex: 0 0 auto;
        }

        .note-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 180px;
        }

        .instrument-card {
          margin-bottom: 32px;
        }

        .note-label {
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .note-value {
          font-size: 48px;
          font-weight: 700;
          font-family: 'Monaco', 'Consolas', monospace;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .note-value.pulse {
          animation: notePulse 0.3s ease-out;
        }

        @keyframes notePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .note-placeholder {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4b5563;
          font-size: 14px;
        }

        .hint-dot {
          width: 8px;
          height: 8px;
          background: #6366f1;
          border-radius: 50%;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

export default App;
