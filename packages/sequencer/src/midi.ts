/**
 * MIDI 导入导出工具
 * 围绕 sequencer 实现 MIDI 文件的导入导出
 */

import { Midi, type MidiJSON } from "@tonejs/midi";
import type { PatternState, PianoRollNote, SequencerChannel } from "./types";
import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";

const DEFAULT_TPQ = 480; // ticks per quarter note
const DEFAULT_BPM = 120;

/**
 * 乐器类型到 MIDI Program Number 的映射 (GM 标准)
 */
const INSTRUMENT_TO_PROGRAM: Record<EN_INSTRUMENT_TYPE, number> = {
  [EN_INSTRUMENT_TYPE.PIANO]: 0,           // Acoustic Grand Piano
  [EN_INSTRUMENT_TYPE.SYNTH]: 80,          // Lead 1 (Square)
  [EN_INSTRUMENT_TYPE.GUITAR]: 24,         // Acoustic Guitar Nylon
  [EN_INSTRUMENT_TYPE.DISTORTION_GUITAR]: 29, // Electric Guitar (Distortion)
  [EN_INSTRUMENT_TYPE.DRUM]: 0,            // Drum Kit (通道 10 使用 percussion)
};

/**
 * 将 PatternState 导出为 MIDI 文件
 */
export function exportToMidi(
  state: PatternState,
  options: {
    tpq?: number;
    bpm?: number;
  } = {}
): Uint8Array {
  const { tpq = DEFAULT_TPQ, bpm = DEFAULT_BPM } = options;

  const midi = new Midi();
  
  // 设置 header
  midi.header.tempos = [{ bpm, ticks: 0 }];
  midi.header.timeSignatures = [{
    ticks: 0,
    timeSignature: [4, 4],
    measures: 0
  }];

  // 按通道分组创建音轨
  state.channels.forEach((channel, index) => {
    // 跳过静音的通道
    if (channel.muted) return;
    
    // 检查 solo 模式：如果有 solo 的通道，则只导出 solo 的通道
    const hasSolo = state.channels.some(c => c.solo);
    if (hasSolo && !channel.solo) return;

    // 获取该通道的音符
    const channelNotes = state.notes.filter(n => n.channelId === channel.id);
    if (channelNotes.length === 0) return;

    // 创建音轨
    const track = midi.addTrack();
    track.name = channel.name;
    track.channel = index; // MIDI 通道 0-15

    // 设置乐器 (Program Change)
    const programNumber = INSTRUMENT_TO_PROGRAM[channel.instrument] ?? 0;
    track.instrument.number = programNumber;

    // 将音符添加到音轨
    channelNotes.forEach(note => {
      const startTicks = note.startStep * tpq / 4; // 假设 16 分音符为一拍
      const durationTicks = note.length * tpq / 4;
      
      track.addNote({
        midi: note.pitch,
        ticks: startTicks,
        durationTicks: Math.max(durationTicks, tpq / 4), // 最小一个 16 分音符
        velocity: note.velocity / 127, // 转换为 0-1
      });
    });
  });

  return midi.toArray();
}

/**
 * 将 MIDI 文件解析为 PatternState
 */
export function parseMidi(
  midiData: Uint8Array | ArrayBuffer,
  options: {
    tpq?: number;
    defaultInstrumentId?: string;
  } = {}
): {
  state: PatternState;
  errors: string[];
} {
  const { defaultInstrumentId = "piano" } = options;
  const errors: string[] = [];

  let midi: Midi;
  try {
    midi = new Midi(midiData);
  } catch (e) {
    errors.push(`MIDI 解析失败: ${e}`);
    return {
      state: createDefaultPatternState(),
      errors
    };
  }

  // 从 header 获取 tempo
  const bpm = midi.header.tempos?.[0]?.bpm || DEFAULT_BPM;
  const tpq = midi.header.ppq || DEFAULT_TPQ;

  // 创建默认通道（用于单通道情况）
  const defaultChannel: SequencerChannel = {
    id: "imported",
    name: "Imported",
    color: "#f97316",
    muted: false,
    solo: false,
    volume: 100,
    instrument: "piano" as any,
  };

  const channels: SequencerChannel[] = [];
  const notes: PianoRollNote[] = [];

  // 解析每个音轨
  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) return;

    // 确定通道名
    const channelName = track.name || `Track ${trackIndex + 1}`;
    
    // 创建通道
    const channelId = `channel-${trackIndex}`;
    const channelColor = getChannelColor(trackIndex);
    
    channels.push({
      id: channelId,
      name: channelName,
      color: channelColor,
      muted: false,
      solo: false,
      volume: 100,
      instrument: defaultInstrumentId as any,
    });

    // 转换音符
    track.notes.forEach((note, noteIndex) => {
      // 将 ticks 转换为 step
      // 假设 16 分音符 = 1 step
      const startStep = Math.floor(note.ticks / (tpq / 4));
      const length = Math.max(1, Math.floor(note.durationTicks / (tpq / 4)));

      notes.push({
        id: `note-${trackIndex}-${noteIndex}`,
        channelId,
        pitch: note.midi,
        startStep,
        length,
        velocity: Math.round(note.velocity * 127),
      });
    });
  });

  // 如果没有通道（空 MIDI），创建默认通道
  if (channels.length === 0) {
    channels.push(defaultChannel);
  }

  // 计算需要的 bar 数量
  const maxStep = notes.reduce((max, n) => Math.max(max, n.startStep + n.length), 0);
  const bars = Math.ceil(maxStep / 16) || 2;

  return {
    state: {
      stepsPerBar: 16,
      bars,
      channels,
      notes,
      selectedChannelId: channels[0]?.id || null,
    },
    errors,
  };
}

/**
 * 从 File 对象解析 MIDI
 */
export async function parseMidiFile(file: File): Promise<{
  state: PatternState;
  errors: string[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  return parseMidi(new Uint8Array(arrayBuffer));
}

/**
 * 创建默认 PatternState
 */
function createDefaultPatternState(): PatternState {
  return {
    stepsPerBar: 16,
    bars: 2,
    channels: [{
      id: "default",
      name: "Track 1",
      color: "#f97316",
      muted: false,
      solo: false,
      volume: 100,
      instrument: "piano" as any,
    }],
    notes: [],
    selectedChannelId: "default",
  };
}

/**
 * 获取通道颜色
 */
function getChannelColor(index: number): string {
  const colors = [
    "#f97316", // orange
    "#22c55e", // green
    "#60a5fa", // blue
    "#e879f9", // purple
    "#facc15", // yellow
    "#14b8a6", // teal
    "#f43f5e", // red
    "#a78bfa", // violet
  ];
  return colors[index % colors.length];
}

/**
 * 下载 MIDI 文件
 */
export function downloadMidi(midiData: Uint8Array, filename: string = "untitled.mid"): void {
  // 使用 @ts-ignore 来避免 TypeScript 类型问题
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const blob = new Blob([midiData], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
