import { useMemo, useRef, useState } from "react";
import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";
import type { PatternState, PianoRollNote, PitchRow, SequencerChannel } from "./types";
import { getChannelTriggerNote } from "./channelTrigger";

const DEFAULT_STEPS_PER_BAR = 16;
const DEFAULT_BARS = 2;

const DEFAULT_CHANNELS: SequencerChannel[] = [
  {
    id: "kick",
    name: "Kick",
    color: "#f97316",
    muted: false,
    solo: false,
    stepLocked: false,
    volume: 100,
    instrument: EN_INSTRUMENT_TYPE.DRUM,
  },
  {
    id: "snare",
    name: "Snare",
    color: "#22c55e",
    muted: false,
    solo: false,
    stepLocked: false,
    volume: 100,
    instrument: EN_INSTRUMENT_TYPE.DRUM,
  },
  {
    id: "hat",
    name: "Hat",
    color: "#60a5fa",
    muted: false,
    solo: false,
    stepLocked: false,
    volume: 100,
    instrument: EN_INSTRUMENT_TYPE.DRUM,
  },
];

const CHANNEL_COLOR_POOL = [
  "#f97316",
  "#22c55e",
  "#60a5fa",
  "#e879f9",
  "#facc15",
  "#14b8a6",
  "#f43f5e",
  "#a78bfa",
];

const DEFAULT_NOTES: PianoRollNote[] = [];

function getPitchLabel(pitch: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = noteNames[pitch % 12];
  const octave = Math.floor(pitch / 12) - 1;
  return `${note}${octave}`;
}

export interface UsePatternEditorResult {
  state: PatternState;
  visiblePitchRows: PitchRow[];
  canUndo: boolean;
  canRedo: boolean;
  toggleChannelStep: (channelId: string, step: number) => void;
  isChannelStepEnabled: (channelId: string, step: number) => boolean;
  isChannelStepEditable: (channelId: string) => boolean;
  toggleChannelMute: (channelId: string) => void;
  toggleChannelSolo: (channelId: string) => void;
  setChannelVolume: (channelId: string, volume: number) => void;
  setChannelInstrument: (channelId: string, instrument: EN_INSTRUMENT_TYPE) => void;
  addChannel: () => void;
  removeChannel: (channelId: string) => void;
  renameChannel: (channelId: string, name: string) => void;
  moveChannel: (channelId: string, newIndex: number) => void;
  selectChannel: (channelId: string) => void;
  addPianoRollNote: (pitch: number, step: number) => void;
  insertPianoRollNotes: (notes: Array<Omit<PianoRollNote, "id">>) => string[];
  deletePianoRollNote: (noteId: string) => void;
  movePianoRollNote: (noteId: string, nextPitch: number, nextStep: number) => void;
  movePianoRollNotesByDelta: (noteIds: string[], pitchDelta: number, stepDelta: number) => void;
  resizePianoRollNote: (noteId: string, nextLength: number) => void;
  setPianoRollNoteVelocity: (noteId: string, velocity: number) => void;
  undo: () => void;
  redo: () => void;
  beginEditTransaction: () => void;
  endEditTransaction: () => void;
}

function getRequiredBars(stepsPerBar: number, endStepExclusive: number): number {
  if (endStepExclusive <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(endStepExclusive / stepsPerBar));
}

export function usePatternEditor(): UsePatternEditorResult {
  const [state, setState] = useState<PatternState>({
    stepsPerBar: DEFAULT_STEPS_PER_BAR,
    bars: DEFAULT_BARS,
    channels: DEFAULT_CHANNELS,
    notes: DEFAULT_NOTES,
    selectedChannelId: DEFAULT_CHANNELS[0]?.id ?? null,
  });
  const [undoStack, setUndoStack] = useState<PatternState[]>([]);
  const [redoStack, setRedoStack] = useState<PatternState[]>([]);
  const transactionRef = useRef<{
    active: boolean;
    startState: PatternState | null;
    changed: boolean;
  }>({
    active: false,
    startState: null,
    changed: false,
  });

  const beginEditTransaction = () => {
    if (transactionRef.current.active) {
      return;
    }
    transactionRef.current.active = true;
    transactionRef.current.startState = null;
    transactionRef.current.changed = false;
  };

  const endEditTransaction = () => {
    const tx = transactionRef.current;
    if (!tx.active) {
      return;
    }
    if (tx.changed && tx.startState) {
      const snapshot = tx.startState;
      setUndoStack((stack) => [...stack, snapshot].slice(-120));
      setRedoStack([]);
    }
    tx.active = false;
    tx.startState = null;
    tx.changed = false;
  };

  const applyWithHistory = (updater: (prev: PatternState) => PatternState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) {
        return prev;
      }
      if (transactionRef.current.active) {
        if (!transactionRef.current.changed) {
          transactionRef.current.startState = prev;
          transactionRef.current.changed = true;
        }
        return next;
      }
      setUndoStack((stack) => [...stack, prev].slice(-120));
      setRedoStack([]);
      return next;
    });
  };

  const lockChannelsForPianoEdit = (prev: PatternState, channelIds: Set<string>): SequencerChannel[] => {
    if (channelIds.size === 0) {
      return prev.channels;
    }
    let changed = false;
    const nextChannels = prev.channels.map((channel) => {
      if (!channelIds.has(channel.id) || channel.stepLocked) {
        return channel;
      }
      changed = true;
      return { ...channel, stepLocked: true };
    });
    return changed ? nextChannels : prev.channels;
  };

  const visiblePitchRows = useMemo<PitchRow[]>(() => {
    const rows: PitchRow[] = [];
    for (let pitch = 127; pitch >= 0; pitch -= 1) {
      rows.push({ pitch, label: getPitchLabel(pitch) });
    }
    return rows;
  }, []);

  const toggleChannelStep = (channelId: string, step: number) => {
    applyWithHistory((prev) => {
      const channelIndex = prev.channels.findIndex((channel) => channel.id === channelId);
      if (channelIndex < 0) {
        return prev;
      }
      const targetChannel = prev.channels[channelIndex];
      if (targetChannel.stepLocked) {
        return prev;
      }
      const triggerPitch = getChannelTriggerNote(channelId, channelIndex);
      const normalizedStep = Math.max(0, Math.min(prev.stepsPerBar - 1, step));
      const hasEnabled = prev.notes.some(
        (note) =>
          note.channelId === channelId &&
          note.pitch === triggerPitch &&
          note.startStep % prev.stepsPerBar === normalizedStep,
      );

      if (hasEnabled) {
        return {
          ...prev,
          notes: prev.notes.filter(
            (note) =>
              !(
                note.channelId === channelId &&
                note.pitch === triggerPitch &&
                note.startStep % prev.stepsPerBar === normalizedStep
              ),
          ),
        };
      }

      const notesToInsert: PianoRollNote[] = Array.from({ length: prev.bars }, (_, barIndex) => ({
        id: `step-note-${Date.now()}-${barIndex}-${Math.random().toString(36).slice(2, 6)}`,
        channelId,
        pitch: triggerPitch,
        startStep: barIndex * prev.stepsPerBar + normalizedStep,
        length: 1,
        velocity: 100,
        source: "step",
      }));
      return {
        ...prev,
        notes: [...prev.notes, ...notesToInsert],
      };
    });
  };

  const isChannelStepEnabled = (channelId: string, step: number) => {
    const hasChannel = state.channels.some((channel) => channel.id === channelId);
    if (!hasChannel) {
      return false;
    }
    const normalizedStep = Math.max(0, Math.min(state.stepsPerBar - 1, step));
    return state.notes.some(
      (note) =>
        note.channelId === channelId &&
        note.startStep % state.stepsPerBar === normalizedStep,
    );
  };

  const isChannelStepEditable = (channelId: string) => {
    const channel = state.channels.find((item) => item.id === channelId);
    return channel ? !channel.stepLocked : false;
  };

  const toggleChannelMute = (channelId: string) => {
    applyWithHistory((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === channelId ? { ...channel, muted: !channel.muted } : channel,
      ),
    }));
  };

  const toggleChannelSolo = (channelId: string) => {
    applyWithHistory((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === channelId ? { ...channel, solo: !channel.solo } : channel,
      ),
    }));
  };

  const setChannelVolume = (channelId: string, volume: number) => {
    const safeVolume = Math.max(0, Math.min(100, Math.round(volume)));
    applyWithHistory((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === channelId ? { ...channel, volume: safeVolume } : channel,
      ),
    }));
  };

  const setChannelInstrument = (channelId: string, instrument: EN_INSTRUMENT_TYPE) => {
    applyWithHistory((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === channelId ? { ...channel, instrument } : channel,
      ),
    }));
  };

  const addChannel = () => {
    applyWithHistory((prev) => {
      const index = prev.channels.length;
      const id = `channel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newChannel: SequencerChannel = {
        id,
        name: `Channel ${index + 1}`,
        color: CHANNEL_COLOR_POOL[index % CHANNEL_COLOR_POOL.length],
        muted: false,
        solo: false,
        stepLocked: false,
        volume: 100,
        instrument: EN_INSTRUMENT_TYPE.PIANO,
      };
      return {
        ...prev,
        channels: [...prev.channels, newChannel],
        selectedChannelId: id,
      };
    });
  };

  const removeChannel = (channelId: string) => {
    applyWithHistory((prev) => {
      const nextChannels = prev.channels.filter((channel) => channel.id !== channelId);
      if (nextChannels.length === prev.channels.length) {
        return prev;
      }
      const nextSelected =
        prev.selectedChannelId === channelId
          ? (nextChannels[0]?.id ?? null)
          : prev.selectedChannelId;
      return {
        ...prev,
        channels: nextChannels,
        notes: prev.notes.filter((note) => note.channelId !== channelId),
        selectedChannelId: nextSelected,
      };
    });
  };

  const renameChannel = (channelId: string, name: string) => {
    const normalized = name.trim();
    if (!normalized) {
      return;
    }
    applyWithHistory((prev) => {
      const target = prev.channels.find((channel) => channel.id === channelId);
      if (!target || target.name === normalized) {
        return prev;
      }
      return {
        ...prev,
        channels: prev.channels.map((channel) =>
          channel.id === channelId ? { ...channel, name: normalized } : channel,
        ),
      };
    });
  };

  const moveChannel = (channelId: string, newIndex: number) => {
    applyWithHistory((prev) => {
      const index = prev.channels.findIndex((channel) => channel.id === channelId);
      if (index < 0) {
        return prev;
      }
      const toIndex = Math.max(0, Math.min(newIndex, prev.channels.length - 1));
      if (index === toIndex) {
        return prev;
      }
      const nextChannels = [...prev.channels];
      const [moved] = nextChannels.splice(index, 1);
      nextChannels.splice(toIndex, 0, moved);
      return {
        ...prev,
        channels: nextChannels,
      };
    });
  };

  const selectChannel = (channelId: string) => {
    applyWithHistory((prev) => ({
      ...prev,
      selectedChannelId: channelId,
    }));
  };

  const addPianoRollNote = (pitch: number, step: number) => {
    applyWithHistory((prev) => {
      const selectedChannelId = prev.selectedChannelId;
      if (!selectedChannelId) {
        return prev;
      }

      const hasExisting = prev.notes.some(
        (note) =>
          note.channelId === selectedChannelId &&
          note.pitch === pitch &&
          note.startStep === step,
      );

      if (hasExisting) {
        return prev;
      }

      const newNote: PianoRollNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        channelId: selectedChannelId,
        pitch,
        startStep: step,
        length: 2,
        velocity: 100,
        source: "piano",
      };

      const requiredBars = Math.max(
        prev.bars,
        getRequiredBars(prev.stepsPerBar, newNote.startStep + newNote.length + 1),
      );

      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, new Set([selectedChannelId])),
        bars: requiredBars,
        notes: [...prev.notes, newNote],
      };
    });
  };

  const insertPianoRollNotes = (notes: Array<Omit<PianoRollNote, "id">>): string[] => {
    if (notes.length === 0) {
      return [];
    }
    const generated = notes.map((note, index) => ({
      ...note,
      id: `note-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      source: "piano" as const,
    }));
    applyWithHistory((prev) => {
      let maxEnd = 0;
      notes.forEach((note) => {
        const end = note.startStep + Math.max(1, note.length);
        if (end > maxEnd) {
          maxEnd = end;
        }
      });
      const requiredBars = Math.max(prev.bars, getRequiredBars(prev.stepsPerBar, maxEnd + 1));
      const touchedChannels = new Set(generated.map((note) => note.channelId));
      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, touchedChannels),
        bars: requiredBars,
        notes: [...prev.notes, ...generated],
      };
    });
    return generated.map((note) => note.id);
  };

  const deletePianoRollNote = (noteId: string) => {
    applyWithHistory((prev) => {
      const target = prev.notes.find((note) => note.id === noteId);
      if (!target) {
        return prev;
      }
      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, new Set([target.channelId])),
        notes: prev.notes.filter((note) => note.id !== noteId),
      };
    });
  };

  const movePianoRollNote = (noteId: string, nextPitch: number, nextStep: number) => {
    applyWithHistory((prev) => {
      const targetNote = prev.notes.find((note) => note.id === noteId);
      if (!targetNote) {
        return prev;
      }
      const requiredBars = Math.max(
        prev.bars,
        getRequiredBars(prev.stepsPerBar, nextStep + Math.max(1, targetNote.length) + 1),
      );
      const totalSteps = prev.stepsPerBar * requiredBars;
      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, new Set([targetNote.channelId])),
        bars: requiredBars,
        notes: prev.notes.map((note) => {
          if (note.id !== noteId) {
            return note;
          }
          const safeLength = Math.max(1, note.length);
          const maxStartStep = Math.max(0, totalSteps - safeLength);
          return {
            ...note,
            pitch: nextPitch,
            startStep: Math.max(0, Math.min(nextStep, maxStartStep)),
            source: "piano",
          };
        }),
      };
    });
  };

  const resizePianoRollNote = (noteId: string, nextLength: number) => {
    applyWithHistory((prev) => {
      const targetNote = prev.notes.find((note) => note.id === noteId);
      if (!targetNote) {
        return prev;
      }
      const safeNextLength = Math.max(1, nextLength);
      const requiredBars = Math.max(
        prev.bars,
        getRequiredBars(prev.stepsPerBar, targetNote.startStep + safeNextLength),
      );
      const totalSteps = prev.stepsPerBar * requiredBars;
      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, new Set([targetNote.channelId])),
        bars: requiredBars,
        notes: prev.notes.map((note) => {
          if (note.id !== noteId) {
            return note;
          }
          const maxLength = Math.max(1, totalSteps - note.startStep);
          return {
            ...note,
            length: Math.max(1, Math.min(nextLength, maxLength)),
            source: "piano",
          };
        }),
      };
    });
  };

  const movePianoRollNotesByDelta = (noteIds: string[], pitchDelta: number, stepDelta: number) => {
    if (noteIds.length === 0) {
      return;
    }
    applyWithHistory((prev) => {
      const idSet = new Set(noteIds);
      const targetNotes = prev.notes.filter((note) => idSet.has(note.id));
      let maxEndStep = 0;
      targetNotes.forEach((note) => {
        const candidateStart = note.startStep + stepDelta;
        const candidateEnd = Math.max(0, candidateStart) + Math.max(1, note.length);
        if (candidateEnd > maxEndStep) {
          maxEndStep = candidateEnd;
        }
      });
      const requiredBars = Math.max(prev.bars, getRequiredBars(prev.stepsPerBar, maxEndStep));
      const totalSteps = prev.stepsPerBar * requiredBars;
      const touchedChannels = new Set(targetNotes.map((note) => note.channelId));
      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, touchedChannels),
        bars: requiredBars,
        notes: prev.notes.map((note) => {
          if (!idSet.has(note.id)) {
            return note;
          }
          const safeLength = Math.max(1, note.length);
          const maxStartStep = Math.max(0, totalSteps - safeLength);
          return {
            ...note,
            pitch: Math.max(0, Math.min(127, note.pitch + pitchDelta)),
            startStep: Math.max(0, Math.min(maxStartStep, note.startStep + stepDelta)),
            source: "piano",
          };
        }),
      };
    });
  };

  const setPianoRollNoteVelocity = (noteId: string, velocity: number) => {
    applyWithHistory((prev) => {
      const target = prev.notes.find((note) => note.id === noteId);
      if (!target) {
        return prev;
      }
      return {
        ...prev,
        channels: lockChannelsForPianoEdit(prev, new Set([target.channelId])),
        notes: prev.notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                velocity: Math.max(1, Math.min(127, Math.round(velocity))),
                source: "piano",
              }
            : note,
        ),
      };
    });
  };

  const undo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      const previous = stack[stack.length - 1];
      setState((current) => {
        setRedoStack((redo) => [current, ...redo].slice(0, 120));
        return previous;
      });
      return stack.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      const [next, ...rest] = stack;
      setState((current) => {
        setUndoStack((undoHistory) => [...undoHistory, current].slice(-120));
        return next;
      });
      return rest;
    });
  };

  return {
    state,
    visiblePitchRows,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    toggleChannelStep,
    isChannelStepEnabled,
    isChannelStepEditable,
    toggleChannelMute,
    toggleChannelSolo,
    setChannelVolume,
    setChannelInstrument,
    addChannel,
    removeChannel,
    renameChannel,
    moveChannel,
    selectChannel,
    addPianoRollNote,
    insertPianoRollNotes,
    deletePianoRollNote,
    movePianoRollNote,
    movePianoRollNotesByDelta,
    resizePianoRollNote,
    setPianoRollNoteVelocity,
    undo,
    redo,
    beginEditTransaction,
    endEditTransaction,
  };
}
