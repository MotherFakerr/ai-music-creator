/**
 * App.tsx
 * AI Music Creator - 音乐演奏入口
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, useKeyboard, InstrumentSelector, BaseNoteSelector } from '@ai-music-creator/ui';
import { 
  initAudioEngine, 
  getAudioEngine, 
  AudioEngine,
  InstrumentType 
} from '@ai-music-creator/audio';
import { getNoteName, setBaseNote, DEFAULT_BASE_NOTE } from '@ai-music-creator/core';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [baseNote, setBaseNoteState] = useState(DEFAULT_BASE_NOTE);
  const [audioEngine] = useState(() => getAudioEngine());
  
  // 初始化音频引擎
  useEffect(() => {
    const init = async () => {
      try {
        await audioEngine.init();
        setIsInitialized(true);
        console.log('[App] 音频引擎初始化成功');
      } catch (err) {
        console.error('[App] 音频引擎初始化失败:', err);
      }
    };
    
    // 首次需要用户交互触发
    const handleFirstInteraction = () => {
      init();
      document.removeEventListener('click', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    
    return () => {
      audioEngine.dispose();
    };
  }, [audioEngine]);

  // 音符事件处理
  const handleNoteOn = useCallback((note: number, velocity: number) => {
    if (isInitialized) {
      audioEngine.playNote(note, velocity);
      setCurrentNote(getNoteName(note));
    }
  }, [isInitialized, audioEngine]);

  const handleNoteOff = useCallback((note: number) => {
    if (isInitialized) {
      audioEngine.stopNote(note);
    }
  }, [isInitialized, audioEngine]);

  // 切换音色
  const handleInstrumentChange = useCallback((newInstrument: InstrumentType) => {
    setInstrument(newInstrument);
    audioEngine.setInstrument(newInstrument);
  }, [audioEngine]);

  // 切换基准音
  const handleBaseNoteChange = useCallback((note: number) => {
    setBaseNoteState(note);
    setBaseNote(note);
  }, []);

  // 键盘事件 Hook
  const { activeNotes } = useKeyboard({
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎵 AI Music Creator</h1>
        <p className="subtitle">里程碑一：音乐演奏</p>
      </header>

      <main className="app-main">
        {/* 基准音选择器 */}
        <BaseNoteSelector
          value={baseNote}
          onChange={handleBaseNoteChange}
        />
        
        {/* 音色选择器 */}
        <InstrumentSelector 
          value={instrument}
          onChange={handleInstrumentChange}
        />
        
        {/* 当前音符显示 */}
        <div className="current-note-display">
          {currentNote ? (
            <>
              <span className="note-label">当前音符</span>
              <span className="note-value">{currentNote}</span>
            </>
          ) : (
            <span className="note-placeholder">按下键盘开始演奏</span>
          )}
        </div>
        
        {/* 键盘组件 */}
        <Keyboard 
          activeNotes={activeNotes}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
        />
        
        {/* 使用提示 */}
        <div className="keyboard-hint">
          <p><kbd>1</kbd><kbd>-</kbd> 演奏 C5-B5（高音区）</p>
          <p><kbd>Q</kbd><kbd>]</kbd> 演奏 C4-B4（中音区）</p>
          <p><kbd>A</kbd><kbd>'</kbd> 演奏 C3-B3（基准区）</p>
          <p><kbd>Z</kbd><kbd>/</kbd> 演奏 C2-A2（低音区）</p>
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }
        
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .app-header {
          padding: 24px 32px;
          border-bottom: 1px solid #333;
        }
        
        .app-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        
        .subtitle {
          margin: 8px 0 0;
          color: #888;
          font-size: 14px;
        }
        
        .app-main {
          padding: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .current-note-display {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px 24px;
          background: #2a2a4e;
          border-radius: 12px;
        }
        
        .note-label {
          color: #888;
          font-size: 14px;
        }
        
        .note-value {
          font-size: 48px;
          font-weight: 700;
          color: #6366f1;
          font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .note-placeholder {
          color: #666;
          font-size: 16px;
        }
        
        .keyboard-hint {
          margin-top: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #888;
          font-size: 14px;
        }
        
        .keyboard-hint p {
          margin: 8px 0;
        }
        
        .keyboard-hint kbd {
          display: inline-block;
          padding: 4px 8px;
          background: #333;
          border: 1px solid #555;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          margin: 0 2px;
        }
      `}</style>
    </div>
  );
}

export default App;
