/**
 * 音频引擎
 * 基于 Web Audio API 和 smplr 实现真实乐器音色播放
 */

import { Soundfont } from "smplr";
import { EN_INSTRUMENT_TYPE, INSTRUMENT_MAP } from "./interface";

/**
 * 音频引擎类
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private activeNotes: Map<number, { stop: (time?: number) => void }> =
    new Map();
  private masterGain: GainNode | null = null;
  private currentInstrument: EN_INSTRUMENT_TYPE = EN_INSTRUMENT_TYPE.PIANO;
  private volume: number = 1.0; // 默认音量提高到 1.0
  private instrumentPlayer: Soundfont | null = null;
  private instrumentLoading: Promise<void> | null = null;

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

    // 加载默认乐器
    await this.loadInstrument(this.currentInstrument);

    console.log("[AudioEngine] 已初始化");
  }

  /**
   * 确保音频上下文已就绪
   */
  private ensureContext(): AudioContext {
    if (!this.context) {
      throw new Error("AudioEngine 未初始化，请先调用 init()");
    }
    return this.context;
  }

  /**
   * 设置当前乐器
   */
  async setInstrument(instrument: EN_INSTRUMENT_TYPE): Promise<void> {
    if (this.currentInstrument === instrument && this.instrumentPlayer) {
      return;
    }

    this.currentInstrument = instrument;
    await this.loadInstrument(instrument);
    console.log(`[AudioEngine] 切换音色: ${instrument}`);
  }

  /**
   * 加载 smplr Soundfont 乐器
   */
  private async loadInstrument(instrument: EN_INSTRUMENT_TYPE): Promise<void> {
    if (!this.context) {
      throw new Error("AudioEngine 未初始化，请先调用 init()");
    }

    // 如果正在加载，等待加载完成
    if (this.instrumentLoading) {
      await this.instrumentLoading;
      return;
    }

    // 鼓组特殊处理，使用基础振荡器
    if (instrument === EN_INSTRUMENT_TYPE.DRUM) {
      this.instrumentPlayer = null;
      return;
    }

    const soundfontName = INSTRUMENT_MAP[instrument];

    this.instrumentLoading = (async () => {
      try {
        const player = new Soundfont(this.context!, {
          instrument: soundfontName,
          destination: this.masterGain ?? this.context!.destination,
        });
        await player.loaded();
        this.instrumentPlayer = player;
        console.log(`[AudioEngine] 已加载音色: ${soundfontName}`);
      } catch (error) {
        console.error(`[AudioEngine] 加载音色失败: ${soundfontName}`, error);
        // 如果加载失败，使用默认钢琴音色
        if (instrument !== "piano") {
          const fallbackPlayer = new Soundfont(this.context!, {
            instrument: INSTRUMENT_MAP.piano,
            destination: this.masterGain ?? this.context!.destination,
          });
          await fallbackPlayer.loaded();
          this.instrumentPlayer = fallbackPlayer;
        }
      }
      this.instrumentLoading = null;
    })();

    await this.instrumentLoading;
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

    // 鼓组使用特殊处理
    if (this.currentInstrument === "drum") {
      this.playDrum(note);
      return;
    }

    // 使用 smplr 播放
    if (!this.instrumentPlayer) {
      console.warn("[AudioEngine] 乐器未加载，使用默认音色");
      this.playNoteFallback(note, velocity);
      return;
    }

    const stop = this.instrumentPlayer.start({
      note,
      velocity,
      time: ctx.currentTime,
    });

    // 保存 stop 回调以便后续停止
    this.activeNotes.set(note, { stop });

    console.log(`[AudioEngine] 播放: ${note} (${this.currentInstrument})`);
  }

  /**
   * 备用播放方法（当 smplr 音色加载失败时使用）
   */
  private playNoteFallback(note: number, velocity: number): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);

    // 与 SoundFont 播放使用相同的音量计算方式
    const velocityGain = 0.5 + (velocity / 127) * 1.0; // 0.5 到 1.5
    const finalGain = velocityGain * this.volume;
    const now = ctx.currentTime;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(finalGain * 0.8, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(finalGain * 0.5, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);

    this.activeNotes.set(note, { stop: () => osc.stop() });
  }

  /**
   * 鼓组处理（使用基础振荡器，因为 SoundFont 的鼓组支持有限）
   */
  private playDrum(note: number): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 简化处理：不同 note 对应不同打击乐器
    if (note >= 60) {
      // 底鼓 (C4 以上)
      osc.type = "sine";
      osc.frequency.value = 60; // 低频率
      gain.gain.setValueAtTime(this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    } else {
      // 军鼓/踩镲
      osc.type = "triangle";
      osc.frequency.value = 200; // 高频率
      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.5);

    // 保存引用（虽然会自动停止，但保持一致性）
    this.activeNotes.set(note, { stop: () => osc.stop() });
  }

  /**
   * 停止音符
   */
  stopNote(note: number): void {
    const noteData = this.activeNotes.get(note);
    if (!noteData) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    noteData.stop(now);

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
    this.instrumentPlayer = null;
    this.instrumentLoading = null;
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    console.log("[AudioEngine] 已清理");
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
