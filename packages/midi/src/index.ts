/**
 * @ai-music/midi
 * MIDI 解析与生成
 */

import { Midi, Track } from "@tonejs/midi";
import { Sequence } from "@ai-music-creator/core";

/**
 * 解析 MIDI 文件为 Sequence
 */
export function parseMidi(data: Uint8Array): Sequence {
  try {
    const midi = new Midi(data);

    // 计算总时长（秒）
    const duration = midi.duration;

    // 获取 BPM（从第一个 tempo 事件，默认 120）
    const tempo = midi.header.tempos[0]?.bpm || 120;

    // 转换音轨
    const tracks: Track[] = midi.tracks;

    return {
      id: crypto.randomUUID(),
      bpm: tempo,
      tracks,
      duration,
    };
  } catch (error) {
    console.error("[parseMidi] 解析失败:", error);
    throw new Error(
      `MIDI 解析失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 将 Sequence 生成为 MIDI 文件
 */
export function generateMidi(sequence: Sequence): Uint8Array {
  try {
    const midi = new Midi();

    // 设置 BPM
    midi.header.setTempo(sequence.bpm);

    // 转换每个音轨
    sequence.tracks.forEach((track) => {
      const midiTrack = midi.addTrack();
      midiTrack.name = track.name;

      // 添加音符
      track.notes.forEach((note) => {
        midiTrack.addNote(note);
      });
    });

    // 转换为 Uint8Array
    return new Uint8Array(midi.toArray());
  } catch (error) {
    console.error("[generateMidi] 生成失败:", error);
    throw new Error(
      `MIDI 生成失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
