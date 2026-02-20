import type { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";

export interface SequencerChannel {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  stepLocked: boolean;
  volume: number; // 0-100
  instrument: EN_INSTRUMENT_TYPE;
}

export interface PianoRollNote {
  id: string;
  channelId: string;
  pitch: number;
  startStep: number;
  length: number;
  velocity: number;
  source?: "step" | "piano";
}

export interface PatternState {
  stepsPerBar: number;
  bars: number;
  channels: SequencerChannel[];
  notes: PianoRollNote[];
  selectedChannelId: string | null;
}

export interface PitchRow {
  pitch: number;
  label: string;
}
