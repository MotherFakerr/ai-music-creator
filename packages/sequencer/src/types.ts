import type { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";

export interface ChannelStep {
  step: number;
  enabled: boolean;
}

export interface SequencerChannel {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number; // 0-100
  instrument: EN_INSTRUMENT_TYPE;
  steps: ChannelStep[];
}

export interface PianoRollNote {
  id: string;
  channelId: string;
  pitch: number;
  startStep: number;
  length: number;
  velocity: number;
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
