/**
 * 音频引擎
 * 基于 Web Audio API 实现音符播放
 */

export type InstrumentType = 'piano' | 'synth' | 'guitar' | 'drum';

export interface NoteOptions {
  note: number;           // MIDI note number (48 = C3)
  velocity?: number;      // 力度 0-127，默认 100
  duration?: number;      // 持续时间（秒），默认直到 noteOff
}

/**
 * 将 MIDI note number 转换为频率 (Hz)
 */
function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/**
 * 音频引擎类
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private activeNotes: Map<number, OscillatorNode[]> = new Map();
  private masterGain: GainNode | null = null;
  private currentInstrument: InstrumentType = 'piano';
  private volume: number = 0.7;

  constructor() {
    // 延迟初始化，直到用户交互
  }

  /**
   * 初始化音频上下文（需要用户交互触发）
   */
  async init(): Promise<void> {
    if (this.context) return;
    
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.context.destination);
    
    console.log('[AudioEngine] 已初始化');
  }

  /**
   * 确保音频上下文已就绪
   */
  private ensureContext(): AudioContext {
    if (!this.context) {
      throw new Error('AudioEngine 未初始化，请先调用 init()');
    }
    return this.context;
  }

  /**
   * 设置当前乐器
   */
  setInstrument(instrument: InstrumentType): void {
    this.currentInstrument = instrument;
    console.log(`[AudioEngine] 切换音色: ${instrument}`);
  }

  /**
   * 设置主音量
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * 播放音符
   */
  playNote(note: number, velocity: number = 100): void {
    const ctx = this.ensureContext();
    
    // 防止重复触发（按住不放时）
    if (this.activeNotes.has(note)) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // 根据乐器类型设置波形
    switch (this.currentInstrument) {
      case 'piano':
        osc.type = 'triangle';
        break;
      case 'synth':
        osc.type = 'square';
        break;
      case 'guitar':
        osc.type = 'sawtooth';
        // 吉他需要一些失真效果
        this.applyGuitarCharacter(osc, gain);
        break;
      case 'drum':
        // 鼓组特殊处理
        this.playDrum(note, gain);
        return;
    }

    osc.frequency.value = midiToFreq(note);
    
    // 力度映射 (0-127 → 0-1)
    const velocityGain = velocity / 127;
    
    // ADSR 包络
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocityGain * 0.8, now + 0.01); // Attack
    gain.gain.exponentialRampToValueAtTime(velocityGain * 0.5, now + 0.5); // Decay
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    
    // 保存引用以便后续停止
    this.activeNotes.set(note, [osc]);
    
    console.log(`[AudioEngine] 播放: ${note} (${this.currentInstrument})`);
  }

  /**
   * 吉他音色特殊处理
   */
  private applyGuitarCharacter(osc: OscillatorNode, gain: GainNode): void {
    // 简单的波形塑形，实际项目中可能需要更复杂的处理
    // 这里仅作占位，实际音色可以通过加载采样实现更好效果
  }

  /**
   * 鼓组处理
   */
  private playDrum(note: number, gain: GainNode): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    
    // 简化处理：不同 note 对应不同打击乐器
    if (note >= 60) {
      // 底鼓 (C4 以上)
      osc.type = 'sine';
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    } else {
      // 军鼓/踩镲
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }
  }

  /**
   * 停止音符
   */
  stopNote(note: number): void {
    const oscillators = this.activeNotes.get(note);
    if (!oscillators) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    
    for (const osc of oscillators) {
      // Release 包络
      const gain = oscGain(osc);
      if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      }
      
      osc.stop(now + 0.1);
    }
    
    this.activeNotes.delete(note);
    console.log(`[AudioEngine] 停止: ${note}`);
  }

  /**
   * 停止所有音符
   */
  stopAllNotes(): void {
    for (const note of this.activeNotes.keys()) {
      this.stopNote(note);
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAllNotes();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    console.log('[AudioEngine] 已清理');
  }
}

/**
 * 获取 Oscillator 的 GainNode
 */
function oscGain(osc: OscillatorNode): GainNode | null {
  // Web Audio API 不直接暴露连接的节点，这里简化处理
  return null;
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
