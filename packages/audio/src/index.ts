/**
 * @ai-music/audio
 * 音频引擎 - Web Audio API 封装
 */

import { Sequence, Track, Note } from '@ai-music/core';

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  async init(): Promise<void> {
    if (this.context) return;
    this.context = new AudioContext();
    this.masterGain = this.context!.createGain();
    this.masterGain.connect(this.context!.destination);
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  async playSequence(sequence: Sequence): Promise<void> {
    await this.init();
    await this.resume();

    const startTime = this.context!.currentTime;

    for (const track of sequence.tracks) {
      this.playTrack(track, startTime);
    }
  }

  private playTrack(track: Track, startTime: number): void {
    // TODO: 实现音符播放逻辑
    // 需要根据 instrument 加载对应的音色
    for (const note of track.notes) {
      this.playNote(note, startTime);
    }
  }

  private playNote(note: Note, startTime: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12); // MIDI to Hz

    gain.gain.setValueAtTime(note.velocity / 127, startTime + note.startTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + note.startTime + note.duration
    );

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime + note.startTime);
    osc.stop(startTime + note.startTime + note.duration);
  }

  stop(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
      this.masterGain = null;
    }
  }
}

export const audioEngine = new AudioEngine();
