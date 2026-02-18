export interface ChannelStep {
  step: number;
  enabled: boolean;
}

export interface SequencerChannel {
  id: string;
  name: string;
  color: string;
  muted: boolean;
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
