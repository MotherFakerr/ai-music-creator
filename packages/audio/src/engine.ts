/**
 * 音频引擎
 * 基于 Tone.js 实现更好音色的音符播放
 */

import * as Tone from 'tone';

export type InstrumentType = 'piano' | 'synth' | 'guitar' | 'drum';

/**
 * 音频引擎类
 */
export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private drums: Tone.MembraneSynth | null = null;
  private currentInstrument: InstrumentType = 'piano';
  private volume: number = 0.7;

  constructor() {
    // 延迟初始化
  }

  /**
   * 初始化音频上下文（需要用户交互触发）
   */
  async init(): Promise<void> {
    await Tone.start();

    // 钢琴音色 - 使用更真实的采样模拟
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle' as const,
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.8,
      },
    }).toDestination();

    // 鼓组
    this.drums = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
    }).toDestination();

    // 连接音量控制
    this.synth.volume.value = Tone.gainToDb(this.volume);
    this.drums.volume.value = Tone.gainToDb(this.volume);

    console.log('[AudioEngine] 已初始化');
  }

  /**
   * 设置当前乐器
   */
  setInstrument(instrument: InstrumentType): void {
    this.currentInstrument = instrument;

    if (this.synth) {
      switch (instrument) {
        case 'piano':
          // 钢琴 - triangle 波形 + 柔和包络
          this.synth.set({
            oscillator: { type: 'triangle' as const },
            envelope: {
              attack: 0.02,
              decay: 0.3,
              sustain: 0.5,
              release: 1.2,
            },
          });
          break;

        case 'synth':
          // 合成器 - sawtooth 波形 + 电子感
          this.synth.set({
            oscillator: { type: 'sawtooth' as const },
            envelope: {
              attack: 0.05,
              decay: 0.2,
              sustain: 0.6,
              release: 0.4,
            },
          });
          break;

        case 'guitar':
          // 吉他 - 模拟弦乐质感
          this.synth.set({
            oscillator: { type: 'triangle' as const },
            envelope: {
              attack: 0.01,
              decay: 0.2,
              sustain: 0.7,
              release: 0.8,
            },
          });
          break;
      }
    }

    console.log(`[AudioEngine] 切换音色: ${instrument}`);
  }

  /**
   * 设置主音量
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.synth) {
      this.synth.volume.value = Tone.gainToDb(this.volume);
    }
    if (this.drums) {
      this.drums.volume.value = Tone.gainToDb(this.volume);
    }
  }

  /**
   * 播放音符
   */
  playNote(note: number, velocity: number = 100): void {
    if (!this.synth && !this.drums) {
      console.warn('[AudioEngine] 未初始化');
      return;
    }

    // MIDI note number 转频率
    const freq = Tone.Frequency(note, 'midi').toFrequency();

    // 力度映射 (0-127 → 0-1)
    const velocityGain = velocity / 127;

    if (this.currentInstrument === 'drum' && this.drums) {
      // 鼓组特殊处理
      const now = Tone.now();
      if (note >= 60) {
        // 低音鼓
        this.drums.triggerAttackRelease(freq, '8n', now, velocityGain);
      } else {
        // 军鼓/踩镲
        this.drums.triggerAttackRelease(freq, '16n', now, velocityGain * 0.8);
      }
    } else if (this.synth) {
      // 其他乐器
      this.synth.triggerAttackRelease(freq, '8n', undefined, velocityGain);
    }

    console.log(`[AudioEngine] 播放: ${note} (${this.currentInstrument})`);
  }

  /**
   * 停止音符
   */
  stopNote(note: number): void {
    if (this.synth) {
      // 释放当前音符
      const freq = Tone.Frequency(note, 'midi').toFrequency();
      this.synth.releaseAll();
    }
    console.log(`[AudioEngine] 停止: ${note}`);
  }

  /**
   * 停止所有音符
   */
  stopAllNotes(): void {
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAllNotes();
    this.synth?.dispose();
    this.drums?.dispose();
    this.synth = null;
    this.drums = null;
    console.log('[AudioEngine] 已清理');
  }
}

// 单例实例
let audioEngine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngine) {
    audioEngine = new AudioEngine();
  }
  return audioEngine;
}

export function initAudioEngine(): Promise<void> {
  return getAudioEngine().init();
}
