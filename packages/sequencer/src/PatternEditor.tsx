import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCircleDot,
  IconMusic,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerStop,
  IconRepeat,
  IconZoomIn,
} from "@tabler/icons-react";
import { Button, Checkbox, NumberInput, Slider } from "@mantine/core";
import { EN_INSTRUMENT_TYPE, getAudioEngine } from "@ai-music-creator/audio";
import { ChannelRack } from "./ChannelRack";
import { PianoRoll } from "./PianoRoll";
import { usePatternEditor } from "./usePatternEditor";

export function PatternEditor() {
  const asNumber = (value: string | number, fallback: number): number => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const {
    state,
    visiblePitchRows,
    canUndo,
    canRedo,
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
  } = usePatternEditor();
  const audioEngineRef = useRef(getAudioEngine());
  const stopTimersRef = useRef<number[]>([]);
  const schedulerTimerRef = useRef<number | null>(null);
  const clipboardRef = useRef<
    | {
        minStart: number;
        notes: Array<{ channelId: string; pitch: number; startOffset: number; length: number; velocity: number }>;
      }
    | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadStep, setPlayheadStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [loopStartStep, setLoopStartStep] = useState(0);
  const [loopEndStep, setLoopEndStep] = useState(15);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [panelVelocity, setPanelVelocity] = useState(100);
  const [panelLength, setPanelLength] = useState(2);
  const [stepWidth, setStepWidth] = useState(48);
  const [viewportStep, setViewportStep] = useState(0);
  const totalSteps = state.stepsPerBar * state.bars;
  const msPerStep = (60000 / bpm) / 4;
  const selectedNotes = useMemo(
    () => state.notes.filter((note) => selectedNoteIds.includes(note.id)),
    [state.notes, selectedNoteIds],
  );

  useEffect(() => {
    setLoopStartStep((prev) => Math.max(0, Math.min(prev, totalSteps - 1)));
    setLoopEndStep((prev) => Math.max(0, Math.min(prev, totalSteps - 1)));
  }, [totalSteps]);

  useEffect(() => {
    if (loopStartStep > loopEndStep) {
      setLoopEndStep(loopStartStep);
    }
  }, [loopStartStep, loopEndStep]);

  useEffect(() => {
    setSelectedNoteIds((prev) =>
      prev.filter((noteId) => state.notes.some((note) => note.id === noteId)),
    );
  }, [state.notes]);

  useEffect(() => {
    if (selectedNotes.length === 0) {
      return;
    }
    const avgVelocity =
      selectedNotes.reduce((sum, note) => sum + note.velocity, 0) / selectedNotes.length;
    const avgLength =
      selectedNotes.reduce((sum, note) => sum + note.length, 0) / selectedNotes.length;
    setPanelVelocity(Math.round(avgVelocity));
    setPanelLength(Math.max(1, Math.round(avgLength)));
  }, [selectedNotes]);

  const clearStopTimers = () => {
    stopTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    stopTimersRef.current = [];
  };

  const scheduleStop = (note: number, afterMs: number) => {
    const timerId = window.setTimeout(() => {
      audioEngineRef.current.stopNote(note);
      stopTimersRef.current = stopTimersRef.current.filter((id) => id !== timerId);
    }, afterMs);
    stopTimersRef.current.push(timerId);
  };

  const playStep = (absoluteStep: number) => {
    const hasSolo = state.channels.some((channel) => channel.solo);
    const activeChannels = state.channels.filter((channel) =>
      hasSolo ? channel.solo && !channel.muted : !channel.muted,
    );
    const activeChannelMap = new Map(activeChannels.map((channel) => [channel.id, channel]));

    state.notes.forEach((note) => {
      const channel = activeChannelMap.get(note.channelId);
      if (!channel) {
        return;
      }
      if (note.startStep !== absoluteStep) {
        return;
      }
      const velocity = Math.max(1, Math.round(note.velocity * (channel.volume / 100)));
      if (velocity <= 0) {
        return;
      }
      audioEngineRef.current.triggerNoteWithInstrument(
        note.pitch,
        velocity,
        channel.instrument,
        Math.max(0.09, (msPerStep * Math.max(1, note.length) * 0.95) / 1000),
      );
    });
  };

  const ensureAudioReady = async (): Promise<boolean> => {
    if (isAudioReady) {
      return true;
    }
    setIsPreparingAudio(true);
    try {
      await audioEngineRef.current.init();
      await audioEngineRef.current.setInstrument(EN_INSTRUMENT_TYPE.PIANO);
      setIsAudioReady(true);
      return true;
    } catch (error) {
      console.error("[PatternEditor] Audio init failed", error);
      return false;
    } finally {
      setIsPreparingAudio(false);
    }
  };

  const applyVelocityToSelected = (nextVelocity: number) => {
    setPanelVelocity(nextVelocity);
    selectedNoteIds.forEach((noteId) => setPianoRollNoteVelocity(noteId, nextVelocity));
  };

  const applyLengthToSelected = (nextLength: number) => {
    const safe = Math.max(1, nextLength);
    setPanelLength(safe);
    selectedNoteIds.forEach((noteId) => resizePianoRollNote(noteId, safe));
  };

  const transposeSelected = (delta: number) => {
    movePianoRollNotesByDelta(selectedNoteIds, delta, 0);
  };

  const nudgeSelected = (deltaSteps: number) => {
    movePianoRollNotesByDelta(selectedNoteIds, 0, deltaSteps);
  };

  const deleteSelected = () => {
    selectedNoteIds.forEach((noteId) => deletePianoRollNote(noteId));
    setSelectedNoteIds([]);
  };

  const copySelected = () => {
    if (selectedNotes.length === 0) {
      return;
    }
    const minStart = Math.min(...selectedNotes.map((note) => note.startStep));
    clipboardRef.current = {
      minStart,
      notes: selectedNotes.map((note) => ({
        channelId: note.channelId,
        pitch: note.pitch,
        startOffset: note.startStep - minStart,
        length: note.length,
        velocity: note.velocity,
      })),
    };
  };

  const pasteFromClipboard = () => {
    const clipboard = clipboardRef.current;
    if (!clipboard || clipboard.notes.length === 0) {
      return;
    }
    const insertAt = viewportStep;
    const nextNotes = clipboard.notes.map((note) => ({
      channelId: note.channelId,
      pitch: note.pitch,
      startStep: Math.max(0, insertAt + note.startOffset),
      length: note.length,
      velocity: note.velocity,
    }));
    const insertedIds = insertPianoRollNotes(nextNotes);
    setSelectedNoteIds(insertedIds);
  };

  const previewAddedNote = async (pitch: number) => {
    const ready = await ensureAudioReady();
    if (!ready) {
      return;
    }
    const selectedChannel = state.channels.find((channel) => channel.id === state.selectedChannelId);
    audioEngineRef.current.triggerNoteWithInstrument(
      pitch,
      104,
      selectedChannel?.instrument ?? EN_INSTRUMENT_TYPE.PIANO,
      0.17,
    );
  };

  const previewMovedNote = async (pitch: number) => {
    const ready = await ensureAudioReady();
    if (!ready) {
      return;
    }
    const selectedChannel = state.channels.find((channel) => channel.id === state.selectedChannelId);
    audioEngineRef.current.triggerNoteWithInstrument(
      pitch,
      98,
      selectedChannel?.instrument ?? EN_INSTRUMENT_TYPE.PIANO,
      0.14,
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        !!target?.closest('[contenteditable="true"]');
      if (isTypingTarget) {
        return;
      }
      const withMod = event.ctrlKey || event.metaKey;
      if (withMod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if ((withMod && event.key.toLowerCase() === "z" && event.shiftKey) || (event.ctrlKey && event.key.toLowerCase() === "y")) {
        event.preventDefault();
        redo();
        return;
      }
      if (withMod && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected();
        return;
      }
      if (withMod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteFromClipboard();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNoteIds.length === 0) {
          return;
        }
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNoteIds, undo, redo, selectedNotes, playheadStep]);

  useEffect(() => {
    if (!isPlaying) {
      audioEngineRef.current.stopAllNotes();
      clearStopTimers();
      if (schedulerTimerRef.current) {
        window.clearTimeout(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
      return;
    }
    let cursor = playheadStep;
    if (loopEnabled && (cursor < loopStartStep || cursor > loopEndStep)) {
      cursor = loopStartStep;
      setPlayheadStep(loopStartStep);
    }

    playStep(cursor);
    let expectedAt = performance.now() + msPerStep;
    const getNextStep = (current: number) => {
      let nextStep = current + 1;
      if (loopEnabled) {
        if (nextStep > loopEndStep) {
          nextStep = loopStartStep;
        }
      } else if (nextStep >= totalSteps) {
        nextStep = 0;
      }
      return nextStep;
    };

    const tick = () => {
      const now = performance.now();
      let guard = 0;
      while (now >= expectedAt - 1 && guard < 8) {
        const next = getNextStep(cursor);
        cursor = next;
        setPlayheadStep(next);
        playStep(next);
        expectedAt += msPerStep;
        guard += 1;
      }
      const delay = Math.max(8, Math.min(26, expectedAt - performance.now() - 2));
      schedulerTimerRef.current = window.setTimeout(tick, delay);
    };

    schedulerTimerRef.current = window.setTimeout(tick, Math.max(8, msPerStep * 0.25));

    return () => {
      if (schedulerTimerRef.current) {
        window.clearTimeout(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
      audioEngineRef.current.stopAllNotes();
      clearStopTimers();
    };
  }, [
    isPlaying,
    playheadStep,
    loopEnabled,
    loopStartStep,
    loopEndStep,
    totalSteps,
    msPerStep,
    state.channels,
    state.notes,
    state.stepsPerBar,
  ]);

  return (
    <div className="pattern-editor">
      <ChannelRack
        channels={state.channels}
        stepsPerBar={state.stepsPerBar}
        bars={state.bars}
        notes={state.notes}
        selectedChannelId={state.selectedChannelId}
        onSelectChannel={selectChannel}
        onToggleMute={toggleChannelMute}
        onToggleSolo={toggleChannelSolo}
        onSetVolume={setChannelVolume}
        onSetInstrument={setChannelInstrument}
        onAddChannel={addChannel}
        onRemoveChannel={removeChannel}
        onRenameChannel={renameChannel}
        onMoveChannel={moveChannel}
      />
      <div className="playback-area">
      <div className={`selection-panel ${selectedNoteIds.length === 0 ? "is-empty" : ""}`}>
        <span className="panel-title">
            {`${selectedNoteIds.length} notes selected`}
        </span>
        <label className="panel-field">
          Velocity
          <Slider
            className="panel-slider"
            size="xs"
            min={1}
            max={127}
            value={panelVelocity}
            onChange={applyVelocityToSelected}
            disabled={selectedNoteIds.length === 0}
          />
          <NumberInput
            className="panel-number"
            classNames={{ input: "compact-number-input", section: "compact-number-section" }}
            size="xs"
            min={1}
            max={127}
            value={panelVelocity}
            onChange={(value) => applyVelocityToSelected(asNumber(value, 100))}
            disabled={selectedNoteIds.length === 0}
          />
        </label>
        <label className="panel-field">
          Length
          <NumberInput
            className="panel-number"
            classNames={{ input: "compact-number-input", section: "compact-number-section" }}
            size="xs"
            min={1}
            max={totalSteps}
            value={panelLength}
            onChange={(value) => applyLengthToSelected(asNumber(value, 1))}
            disabled={selectedNoteIds.length === 0}
          />
        </label>
        <div className="panel-group">
          <Button
            className="panel-btn"
            size="xs"
            variant="default"
            unstyled
            onClick={() => transposeSelected(-12)}
            disabled={selectedNoteIds.length === 0}
          >
            -12 st
          </Button>
          <Button
            className="panel-btn"
            size="xs"
            variant="default"
            unstyled
            onClick={() => transposeSelected(-1)}
            disabled={selectedNoteIds.length === 0}
          >
            -1 st
          </Button>
          <Button
            className="panel-btn"
            size="xs"
            variant="default"
            unstyled
            onClick={() => transposeSelected(1)}
            disabled={selectedNoteIds.length === 0}
          >
            +1 st
          </Button>
          <Button
            className="panel-btn"
            size="xs"
            variant="default"
            unstyled
            onClick={() => transposeSelected(12)}
            disabled={selectedNoteIds.length === 0}
          >
            +12 st
          </Button>
        </div>
        <div className="panel-group">
          <Button
            className="panel-btn"
            size="xs"
            variant="default"
            unstyled
            onClick={() => nudgeSelected(-1)}
            disabled={selectedNoteIds.length === 0}
          >
            Nudge Left
          </Button>
          <Button
            className="panel-btn"
            size="xs"
            variant="default"
            unstyled
            onClick={() => nudgeSelected(1)}
            disabled={selectedNoteIds.length === 0}
          >
            Nudge Right
          </Button>
          <Button
            className="panel-btn danger"
            size="xs"
            variant="filled"
            color="red"
            unstyled
            onClick={deleteSelected}
            disabled={selectedNoteIds.length === 0}
          >
            Delete
          </Button>
        </div>
      </div>
      <PianoRoll
        stepsPerBar={state.stepsPerBar}
        bars={state.bars}
        pitchRows={visiblePitchRows}
        selectedChannelId={state.selectedChannelId}
        channels={state.channels}
        notes={state.notes}
        selectedNoteIds={selectedNoteIds}
        onSelectionChange={setSelectedNoteIds}
        onAddNote={addPianoRollNote}
        onPreviewAddedNote={previewAddedNote}
        onPreviewMovedNote={previewMovedNote}
        onDeleteNote={deletePianoRollNote}
        onMoveNote={movePianoRollNote}
        onMoveNotesByDelta={movePianoRollNotesByDelta}
        onResizeNote={resizePianoRollNote}
        onBeginEditTransaction={beginEditTransaction}
        onEndEditTransaction={endEditTransaction}
        onViewportStepChange={setViewportStep}
        stepWidth={stepWidth}
        playheadStep={isPlaying ? playheadStep : null}
      />
      <div className="transport">
        <div className="transport-group transport-group-buttons">
        <Button
          className="transport-btn"
          size="xs"
          variant="default"
          unstyled
          disabled={isPreparingAudio}
          onClick={async () => {
            if (isPlaying) {
              setIsPlaying(false);
              return;
            }
            const ready = await ensureAudioReady();
            if (ready) {
              setIsPlaying(true);
            }
          }}
          title={isPreparingAudio ? "Loading Audio..." : isPlaying ? "Stop" : "Play"}
          leftSection={
            isPreparingAudio ? undefined : isPlaying ? <IconPlayerStop size={14} /> : <IconPlayerPlay size={14} />
          }
        >
          {isPreparingAudio ? (
            <span className="transport-btn-label">Loading...</span>
          ) : (
            <span className="transport-btn-label">{isPlaying ? "Stop" : "Play"}</span>
          )}
        </Button>
        <Button
          className="transport-btn"
          size="xs"
          variant="default"
          unstyled
          disabled={!canUndo}
          onClick={() => undo()}
          title="Undo"
          leftSection={<IconArrowBackUp size={14} />}
        >
          <span className="transport-btn-label">Undo</span>
        </Button>
        <Button
          className="transport-btn"
          size="xs"
          variant="default"
          unstyled
          disabled={!canRedo}
          onClick={() => redo()}
          title="Redo"
          leftSection={<IconArrowForwardUp size={14} />}
        >
          <span className="transport-btn-label">Redo</span>
        </Button>
        <Button
          className="transport-btn"
          size="xs"
          variant="default"
          unstyled
          onClick={() => {
            setPlayheadStep(loopEnabled ? loopStartStep : 0);
            audioEngineRef.current.stopAllNotes();
            clearStopTimers();
          }}
          title="Reset playhead to start"
          leftSection={<IconPlayerSkipBack size={14} />}
        >
          <span className="transport-btn-label">Reset Head</span>
        </Button>
        </div>
        <div className="transport-group" title="Tempo">
          <IconMusic size={14} className="transport-field-icon" />
          <label className="transport-field">
            <span className="transport-field-label">BPM</span>
            <NumberInput
              className="transport-number"
              classNames={{ input: "compact-number-input", section: "compact-number-section" }}
              size="xs"
              min={40}
              max={220}
              value={bpm}
              onChange={(value) =>
                setBpm(Math.max(40, Math.min(220, asNumber(value, 120))))
              }
            />
          </label>
        </div>
        <div className="transport-group" title="Step width (zoom)">
          <IconZoomIn size={14} className="transport-field-icon" />
          <label className="transport-field transport-field-zoom">
            <span className="transport-field-label">Zoom</span>
            <Slider
              className="transport-slider"
              size="xs"
              min={16}
              max={40}
              step={1}
              value={stepWidth}
              onChange={setStepWidth}
            />
            <span className="transport-field-value">{stepWidth}px</span>
          </label>
        </div>
        <div className="transport-group transport-group-loop" title="Loop region">
          <IconRepeat size={14} className="transport-field-icon" />
          <Checkbox
            className="transport-check"
            size="xs"
            checked={loopEnabled}
            onChange={(event) => setLoopEnabled(event.currentTarget.checked)}
            label={<span className="transport-field-label">Loop</span>}
          />
          <label className="transport-field transport-field-inout">
            <span className="transport-field-label">In</span>
            <NumberInput
              className="transport-loop-number"
              classNames={{ input: "compact-number-input", section: "compact-number-section" }}
              size="xs"
              min={1}
              max={totalSteps}
              value={loopStartStep + 1}
              onChange={(value) =>
                setLoopStartStep(
                  Math.max(
                    0,
                    Math.min(totalSteps - 1, asNumber(value, loopStartStep + 1) - 1),
                  ),
                )
              }
            />
          </label>
          <span className="transport-inout-sep">–</span>
          <label className="transport-field transport-field-inout">
            <span className="transport-field-label">Out</span>
            <NumberInput
              className="transport-loop-number"
              classNames={{ input: "compact-number-input", section: "compact-number-section" }}
              size="xs"
              min={1}
              max={totalSteps}
              value={loopEndStep + 1}
              onChange={(value) =>
                setLoopEndStep(
                  Math.max(
                    0,
                    Math.min(totalSteps - 1, asNumber(value, loopEndStep + 1) - 1),
                  ),
                )
              }
            />
          </label>
        </div>
        <div className="transport-group transport-status-wrap" title="Playhead position">
          <IconCircleDot size={14} className="transport-field-icon" />
          <span className="transport-status">
            {playheadStep + 1} / {totalSteps}
          </span>
        </div>
      </div>
      </div>
      <style>{`
        .pattern-editor {
          display: grid;
          gap: 12px;
          min-width: 0;
        }
        .playback-area {
          --control-border: #334155;
          --control-bg: #0f172a;
          --control-fg: #e2e8f0;
          --control-hover-bg: #1e293b;
          --control-radius: 6px;
          --control-danger-border: #7f1d1d;
          --control-danger-bg: #3f0f12;
          --control-danger-fg: #fecaca;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 10px;
          background: #11131a;
          display: grid;
          gap: 12px;
          min-width: 0;
        }
        .transport {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          padding-top: 12px;
          margin-top: 2px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .transport-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--control-border);
          border-radius: var(--control-radius);
          background: var(--control-bg);
          color: var(--control-fg);
          height: 30px;
          padding: 0 9px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
        }
        .transport-btn:hover:not(:disabled) {
          background: var(--control-hover-bg);
        }
        .transport-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .transport-group {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #cbd5e1;
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          min-height: 42px;
          box-sizing: border-box;
        }
        .transport-group-buttons {
          gap: 8px;
          padding: 5px 8px;
        }
        .transport-field-icon {
          flex-shrink: 0;
          color: #94a3b8;
        }
        .transport-field {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #cbd5e1;
          min-height: 28px;
        }
        .transport-field-label {
          flex-shrink: 0;
          min-width: 1.8em;
        }
        .compact-number-input {
          border: 1px solid #334155;
          border-radius: 4px;
          background: #0f172a;
          color: #e2e8f0;
          padding-right: 22px;
          box-sizing: border-box;
          text-align: left;
          font-variant-numeric: tabular-nums;
        }
        .compact-number-section {
          width: 18px;
        }
        .transport-number .compact-number-input {
          width: 62px;
        }
        .transport-slider {
          width: 72px;
        }
        .transport-field-value {
          min-width: 2.5em;
          color: #94a3b8;
          font-size: 11px;
        }
        .transport-group-loop {
          gap: 4px;
        }
        .transport-loop-number .compact-number-input {
          width: 56px;
        }
        .transport-inout-sep {
          color: #64748b;
          font-size: 11px;
          padding: 0 2px;
        }
        .transport-check .mantine-Checkbox-label {
          color: #cbd5e1;
          font-size: 12px;
          padding-left: 4px;
        }
        .transport-status-wrap {
          color: #94a3b8;
        }
        .transport-status {
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }
        .selection-panel {
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(15, 23, 42, 0.8);
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .selection-panel.is-empty {
          opacity: 0.78;
        }
        .selection-panel.is-empty .panel-field input,
        .selection-panel.is-empty .panel-btn {
          cursor: not-allowed;
        }
        .panel-btn:disabled {
          opacity: 0.7;
        }
        .panel-title {
          font-size: 12px;
          color: #e2e8f0;
          font-weight: 600;
        }
        .panel-field {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #cbd5e1;
          min-height: 30px;
        }
        .panel-field input[type="range"] {
          width: 140px;
        }
        .panel-slider {
          width: 140px;
        }
        .panel-number .compact-number-input {
          width: 78px;
          border-radius: 6px;
        }
        .panel-group {
          display: inline-flex;
          gap: 6px;
        }
        .panel-btn {
          border: 1px solid var(--control-border);
          border-radius: var(--control-radius);
          background: var(--control-bg);
          color: var(--control-fg);
          height: 30px;
          padding: 0 10px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .panel-btn.danger {
          border-color: var(--control-danger-border);
          color: var(--control-danger-fg);
          background: var(--control-danger-bg);
        }
        @media (max-width: 1366px), (max-height: 900px) {
          .pattern-editor {
            gap: 8px;
          }
          .transport {
            gap: 10px;
          }
          .transport-btn {
            padding: 5px 8px;
            font-size: 12px;
          }
          .transport-field {
            gap: 4px;
            font-size: 11px;
          }
          .transport-field-zoom input[type="range"] {
            width: 56px;
          }
          .transport-slider {
            width: 56px;
          }
          .selection-panel {
            padding: 8px;
            gap: 8px;
          }
          .panel-field input[type="range"] {
            width: 120px;
          }
          .panel-slider {
            width: 120px;
          }
          .panel-btn {
            padding: 4px 7px;
          }
        }
        @media (max-width: 768px) {
          .playback-area {
            padding: 6px;
            gap: 8px;
          }
          .selection-panel {
            gap: 8px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: center;
          }
          .panel-title {
            grid-column: 1 / -1;
            margin-bottom: 2px;
          }
          .panel-field {
            width: auto;
            min-width: 0;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
          }
          .panel-field input[type="range"] {
            width: 100%;
            min-width: 72px;
          }
          .panel-slider {
            width: 100%;
            min-width: 72px;
          }
          .panel-group {
            grid-column: 1 / -1;
            width: auto;
            flex-wrap: wrap;
            row-gap: 6px;
          }
          .transport {
            gap: 6px;
            padding-top: 8px;
            display: grid;
            grid-template-columns: 1fr;
          }
          .transport-group {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
            padding: 6px 8px;
            gap: 8px;
            min-height: 40px;
          }
          .transport-group-buttons {
            justify-content: flex-start;
            gap: 6px;
          }
          .transport-btn {
            padding: 4px 7px;
          }
          .transport-btn-label {
            font-size: 11px;
          }
          .transport-number .compact-number-input,
          .transport-loop-number .compact-number-input {
            width: 58px;
          }
        }
        @media (max-width: 520px) {
          .transport-group {
            gap: 4px;
          }
          .transport-btn-label {
            display: none;
          }
          .transport-btn {
            padding: 5px;
            min-width: 28px;
            justify-content: center;
          }
          .panel-field input[type="range"] {
            width: min(44vw, 140px);
          }
          .panel-slider {
            width: min(44vw, 140px);
          }
          .selection-panel {
            grid-template-columns: 1fr;
          }
          .panel-title,
          .panel-group {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  );
}
