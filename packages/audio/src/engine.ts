/**
 * 音频引擎
 * 基于 Web Audio API 和 smplr 实现真实乐器音色播放
 */

import { Soundfont } from "smplr";
import { EN_INSTRUMENT_TYPE, INSTRUMENT_MAP } from "./interface";

/**
 * 音频播放状态
 */
export type AudioPlaybackState = "stopped" | "playing" | "paused";

/**
 * 音频引擎类
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private activeNotes: Map<number, { stop: (time?: number) => void }> =
    new Map();
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private currentInstrument: EN_INSTRUMENT_TYPE = EN_INSTRUMENT_TYPE.PIANO;
  private volume: number = 1.0;
  private reverb: number = 0.18;
  private instrumentPlayer: Soundfont | null = null;
  private instrumentPlayers: Map<EN_INSTRUMENT_TYPE, Soundfont> = new Map();
  private instrumentLoadings: Map<EN_INSTRUMENT_TYPE, Promise<Soundfont>> =
    new Map();

  // 伴奏相关
  private backingAudioBuffer: AudioBuffer | null = null;
  private backingSource: AudioBufferSourceNode | null = null;
  private backingGain: GainNode | null = null;
  private backingVolume: number = 0.8;
  private backingPlaybackRate: number = 1.0;
  private backingLoopStart: number = 0;
  private backingLoopEnd: number = 0;
  private backingLoopEnabled: boolean = false;
  private backingStartTime: number = 0;
  private backingPauseTime: number = 0;
  private backingState: AudioPlaybackState = "stopped";
  private backingOnEnd: (() => void) | null = null;

  // 录音相关
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;

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
    this.dryGain = this.context.createGain();
    this.wetGain = this.context.createGain();
    this.convolver = this.context.createConvolver();
    this.convolver.buffer = this.createImpulseResponse(this.context, 1.8, 2.6);

    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);

    this.setReverb(this.reverb);
    this.updateOutputRouting();

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
   * 生成一个简易脉冲响应，用于全局混响
   */
  private createImpulseResponse(
    context: AudioContext,
    seconds: number,
    decay: number
  ): AudioBuffer {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const t = i / length;
        // 指数衰减噪声，构造“房间尾音”质感
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return impulse;
  }

  /**
   * 根据当前录音状态更新最终输出路由
   */
  private updateOutputRouting(): void {
    if (!this.context || !this.dryGain || !this.wetGain) {
      return;
    }

    this.dryGain.disconnect();
    this.wetGain.disconnect();

    this.dryGain.connect(this.context.destination);
    this.wetGain.connect(this.context.destination);

    if (this.recordingDestination) {
      this.dryGain.connect(this.recordingDestination);
      this.wetGain.connect(this.recordingDestination);
    }
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

    // 鼓组特殊处理，使用基础振荡器
    if (instrument === EN_INSTRUMENT_TYPE.DRUM) {
      this.instrumentPlayer = null;
      return;
    }

    try {
      this.instrumentPlayer = await this.getOrLoadInstrument(instrument);
    } catch (error) {
      const soundfontName = INSTRUMENT_MAP[instrument];
      console.error(`[AudioEngine] 加载音色失败: ${soundfontName}`, error);

      // 如果加载失败，使用默认钢琴音色
      if (instrument !== EN_INSTRUMENT_TYPE.PIANO) {
        this.instrumentPlayer = await this.getOrLoadInstrument(
          EN_INSTRUMENT_TYPE.PIANO
        );
      } else {
        this.instrumentPlayer = null;
      }
    }
  }

  /**
   * 获取已缓存播放器，或按乐器去重加载
   */
  private async getOrLoadInstrument(
    instrument: EN_INSTRUMENT_TYPE
  ): Promise<Soundfont> {
    const cachedPlayer = this.instrumentPlayers.get(instrument);
    if (cachedPlayer) {
      return cachedPlayer;
    }

    const loadingPlayer = this.instrumentLoadings.get(instrument);
    if (loadingPlayer) {
      return loadingPlayer;
    }

    const soundfontName = INSTRUMENT_MAP[instrument];
    const loading = (async () => {
      const player = new Soundfont(this.context!, {
        instrument: soundfontName,
        destination: this.masterGain ?? this.context!.destination,
      });
      await player.loaded();
      this.instrumentPlayers.set(instrument, player);
      console.log(`[AudioEngine] 已加载音色: ${soundfontName}`);
      return player;
    })();

    this.instrumentLoadings.set(instrument, loading);

    try {
      return await loading;
    } finally {
      this.instrumentLoadings.delete(instrument);
    }
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
   * 设置混响强度（0~1）
   */
  setReverb(value: number): void {
    this.reverb = Math.max(0, Math.min(1, value));
    if (!this.dryGain || !this.wetGain || !this.context) {
      return;
    }

    // 使用等功率交叉淡化，避免切换时响度明显跳变
    const wet = Math.sin(this.reverb * Math.PI * 0.5);
    const dry = Math.cos(this.reverb * Math.PI * 0.5);
    const now = this.context.currentTime;
    this.dryGain.gain.setTargetAtTime(dry, now, 0.015);
    this.wetGain.gain.setTargetAtTime(wet, now, 0.015);
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
   * 以指定乐器触发短音（不占用 activeNotes，适合编曲器并发触发）
   */
  triggerNoteWithInstrument(
    note: number,
    velocity: number = 100,
    instrument: EN_INSTRUMENT_TYPE = EN_INSTRUMENT_TYPE.PIANO,
    durationSeconds: number = 0.2,
    whenSecondsFromNow: number = 0
  ): void {
    const ctx = this.ensureContext();
    const safeDuration = Math.max(0.03, durationSeconds);
    const startAt = ctx.currentTime + Math.max(0, whenSecondsFromNow);

    if (instrument === EN_INSTRUMENT_TYPE.DRUM) {
      this.playDrumTransient(note, startAt);
      return;
    }

    const cachedPlayer = this.instrumentPlayers.get(instrument);
    if (cachedPlayer) {
      const stop = cachedPlayer.start({
        note,
        velocity,
        time: startAt,
      });
      stop(startAt + safeDuration);
      return;
    }

    // 先用 fallback 兜底触发当前音，再异步加载目标音色供后续使用
    this.playNoteFallbackTransient(note, velocity, safeDuration, startAt);
    void this.getOrLoadInstrument(instrument).catch((error) => {
      console.error(`[AudioEngine] 预加载音色失败: ${instrument}`, error);
    });
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

    const velocityGain = 0.5 + (velocity / 127) * 1.0;
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

  private playNoteFallbackTransient(
    note: number,
    velocity: number,
    durationSeconds: number,
    startAt?: number
  ): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);

    const velocityGain = 0.5 + (velocity / 127) * 1.0;
    const finalGain = velocityGain * this.volume;
    const now = startAt ?? ctx.currentTime;
    const endAt = now + Math.max(0.03, durationSeconds);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(finalGain * 0.8, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, endAt);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(endAt);
  }

  /**
   * 鼓组处理（使用基础振荡器，因为 SoundFont 的鼓组支持有限）
   */
  private playDrum(note: number): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (note >= 60) {
      osc.type = "sine";
      osc.frequency.value = 60;
      gain.gain.setValueAtTime(this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    } else {
      osc.type = "triangle";
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.5);

    this.activeNotes.set(note, { stop: () => osc.stop() });
  }

  private playDrumTransient(note: number, startAt?: number): void {
    const ctx = this.ensureContext();
    const now = startAt ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (note >= 60) {
      osc.type = "sine";
      osc.frequency.value = 60;
      gain.gain.setValueAtTime(this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    } else {
      osc.type = "triangle";
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.5);
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

  // ==================== 伴奏相关 ====================

  /**
   * 加载音频文件
   */
  async loadAudioFile(file: File): Promise<number> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.backingAudioBuffer = audioBuffer;
    this.backingPauseTime = 0;
    this.backingLoopStart = 0;
    this.backingLoopEnd = audioBuffer.duration;
    console.log(`[AudioEngine] 已加载音频: ${file.name}, 时长: ${audioBuffer.duration}s`);
    return audioBuffer.duration;
  }

  /**
   * 获取伴奏时长
   */
  getAudioDuration(): number {
    return this.backingAudioBuffer?.duration ?? 0;
  }

  /**
   * 获取伴奏当前播放位置
   */
  getAudioCurrentTime(): number {
    if (!this.backingAudioBuffer || this.backingState === "stopped") {
      return 0;
    }
    if (this.backingState === "paused") {
      return this.backingPauseTime;
    }
    const ctx = this.ensureContext();
    return (ctx.currentTime - this.backingStartTime) * this.backingPlaybackRate + this.backingPauseTime;
  }

  /**
   * 获取伴奏播放状态
   */
  getAudioState(): AudioPlaybackState {
    return this.backingState;
  }

  /**
   * 播放伴奏
   */
  playAudio(): void {
    if (!this.backingAudioBuffer) {
      console.warn("[AudioEngine] 没有加载音频");
      return;
    }

    const ctx = this.ensureContext();

    if (this.backingSource) {
      this.backingSource.stop();
      this.backingSource.disconnect();
    }

    this.backingSource = ctx.createBufferSource();
    this.backingSource.buffer = this.backingAudioBuffer;
    this.backingSource.playbackRate.value = this.backingPlaybackRate;

    if (this.backingLoopEnabled && this.backingLoopEnd > this.backingLoopStart) {
      this.backingSource.loop = true;
      this.backingSource.loopStart = this.backingLoopStart;
      this.backingSource.loopEnd = this.backingLoopEnd;
    }

    this.backingGain = ctx.createGain();
    this.backingGain.gain.value = this.backingVolume;

    if (this.recordingDestination) {
      this.backingSource.connect(this.backingGain);
      this.backingGain.connect(this.recordingDestination);
      this.recordingDestination.connect(ctx.destination);
    } else {
      this.backingSource.connect(this.backingGain);
      this.backingGain.connect(this.masterGain!);
    }

    const offset = this.backingPauseTime;
    this.backingStartTime = ctx.currentTime;
    this.backingSource.start(0, offset);
    this.backingState = "playing";

    this.backingSource.onended = () => {
      if (this.backingState === "playing" && !this.backingLoopEnabled) {
        this.backingState = "stopped";
        this.backingPauseTime = 0;
        this.backingOnEnd?.();
      }
    };

    console.log(`[AudioEngine] 开始播放伴奏 from ${offset}s`);
  }

  /**
   * 暂停伴奏
   */
  pauseAudio(): void {
    if (this.backingState !== "playing" || !this.backingSource) return;

    const ctx = this.ensureContext();
    this.backingPauseTime = this.getAudioCurrentTime();
    this.backingSource.stop();
    this.backingSource.disconnect();
    this.backingSource = null;
    this.backingState = "paused";

    console.log(`[AudioEngine] 暂停伴奏 at ${this.backingPauseTime}s`);
  }

  /**
   * 停止伴奏
   */
  stopAudio(): void {
    if (this.backingSource) {
      this.backingSource.stop();
      this.backingSource.disconnect();
      this.backingSource = null;
    }
    this.backingPauseTime = 0;
    this.backingState = "stopped";

    console.log("[AudioEngine] 停止伴奏");
  }

  /**
   * 设置伴奏音量
   */
  setAudioVolume(volume: number): void {
    this.backingVolume = Math.max(0, Math.min(1, volume));
    if (this.backingGain) {
      this.backingGain.gain.value = this.backingVolume;
    }
  }

  /**
   * 获取伴奏音量
   */
  getAudioVolume(): number {
    return this.backingVolume;
  }

  /**
   * 设置播放速度
   */
  setPlaybackRate(rate: number): void {
    this.backingPlaybackRate = Math.max(0.5, Math.min(2, rate));
    if (this.backingSource) {
      this.backingSource.playbackRate.value = this.backingPlaybackRate;
    }
  }

  /**
   * 获取播放速度
   */
  getPlaybackRate(): number {
    return this.backingPlaybackRate;
  }

  /**
   * 设置循环点
   */
  setLoopPoints(start: number, end: number): void {
    this.backingLoopStart = Math.max(0, start);
    this.backingLoopEnd = Math.min(this.backingAudioBuffer?.duration ?? 0, end);
  }

  /**
   * 启用/禁用循环
   */
  setLoopEnabled(enabled: boolean): void {
    this.backingLoopEnabled = enabled;
    if (this.backingSource) {
      this.backingSource.loop = enabled;
    }
  }

  /**
   * 跳转到指定时间
   */
  seekAudio(time: number): void {
    if (!this.backingAudioBuffer) return;
    const wasPlaying = this.backingState === "playing";
    
    // 先清空 onended 回调，避免 stop 触发回调导致状态错误
    if (this.backingSource) {
      this.backingSource.onended = null;
    }
    
    this.stopAudio();
    this.backingPauseTime = Math.max(0, Math.min(time, this.backingAudioBuffer.duration));
    if (wasPlaying) {
      this.playAudio();
    }
  }

  /**
   * 设置播放结束回调
   */
  setAudioEndCallback(callback: () => void): void {
    this.backingOnEnd = callback;
  }

  // ==================== 录音相关 ====================

  /**
   * 开始录音
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    const ctx = this.ensureContext();

    this.recordingDestination = ctx.createMediaStreamDestination();
    this.updateOutputRouting();

    if (this.backingSource && this.backingGain) {
      this.backingSource.disconnect();
      this.backingGain.disconnect();
      this.backingSource.connect(this.backingGain);
      this.backingGain.connect(this.recordingDestination);
    }

    const stream = this.recordingDestination.stream;
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;

    console.log("[AudioEngine] 开始录音");
  }

  /**
   * 停止录音并返回 Blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
        this.recordedChunks = [];
        this.isRecording = false;

        this.recordingDestination = null;
        this.updateOutputRouting();

        console.log("[AudioEngine] 录音结束");
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * 获取录音状态
   */
  getRecordingState(): boolean {
    return this.isRecording;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAllNotes();
    this.stopAudio();
    this.instrumentPlayer = null;
    this.instrumentPlayers.clear();
    this.instrumentLoadings.clear();
    this.dryGain = null;
    this.wetGain = null;
    this.convolver = null;
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
