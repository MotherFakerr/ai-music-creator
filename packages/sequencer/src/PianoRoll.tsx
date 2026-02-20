import { useEffect, useMemo, useRef, useState } from "react";
import type { PianoRollNote, PitchRow, SequencerChannel } from "./types";

export interface PianoRollProps {
  stepsPerBar: number;
  bars: number;
  pitchRows: PitchRow[];
  selectedChannelId: string | null;
  channels: SequencerChannel[];
  notes: PianoRollNote[];
  selectedNoteIds: string[];
  onSelectionChange: (noteIds: string[]) => void;
  onAddNote: (pitch: number, step: number) => void;
  onPreviewAddedNote: (pitch: number) => void;
  onPreviewMovedNote: (pitch: number) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveNote: (noteId: string, nextPitch: number, nextStep: number) => void;
  onMoveNotesByDelta: (noteIds: string[], pitchDelta: number, stepDelta: number) => void;
  onResizeNote: (noteId: string, nextLength: number) => void;
  onBeginEditTransaction: () => void;
  onEndEditTransaction: () => void;
  onViewportStepChange: (step: number) => void;
  stepWidth: number;
  playheadStep: number | null;
}

export function PianoRoll({
  stepsPerBar,
  bars,
  pitchRows,
  selectedChannelId,
  channels,
  notes,
  selectedNoteIds,
  onSelectionChange,
  onAddNote,
  onPreviewAddedNote,
  onPreviewMovedNote,
  onDeleteNote,
  onMoveNote: _onMoveNote,
  onMoveNotesByDelta,
  onResizeNote,
  onBeginEditTransaction,
  onEndEditTransaction,
  onViewportStepChange,
  stepWidth,
  playheadStep,
}: PianoRollProps) {
  const totalSteps = stepsPerBar * bars;
  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const selectedNotes = useMemo(
    () => notes.filter((note) => note.channelId === selectedChannelId),
    [notes, selectedChannelId],
  );
  const [snapStepSize, setSnapStepSize] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initializedScrollRef = useRef(false);
  const isDraggingRef = useRef(false);

  const labelWidth = 56;
  const rowHeight = 24;
  const selectedNoteIdSetRef = useRef(new Set<string>());
  selectedNoteIdSetRef.current = new Set(selectedNoteIds);

  const dragRef = useRef<{
    mode: "move" | "resize";
    noteId: string;
    originPitch: number;
    originLength: number;
    pointerStartStep: number;
    lastStep: number;
    lastPitch: number;
    moved: boolean;
    pitchDeltaTotal: number;
    lastPreviewPitch: number;
    movingNoteIds: string[];
  } | null>(null);
  const boxSelectRef = useRef<{
    pointerStartStep: number;
    pointerStartPitch: number;
    currentStep: number;
    currentPitch: number;
  } | null>(null);
  const [boxSelectUI, setBoxSelectUI] = useState<{
    startStep: number;
    startPitch: number;
    endStep: number;
    endPitch: number;
  } | null>(null);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const snapStep = (step: number) => {
    const snapped = Math.round(step / snapStepSize) * snapStepSize;
    return clamp(snapped, 0, totalSteps - 1);
  };
  const getPitchIndex = (pitch: number) => pitchRows.findIndex((item) => item.pitch === pitch);
  const isBlackKeyPitch = (pitch: number) => {
    const semitone = ((pitch % 12) + 12) % 12;
    return semitone === 1 || semitone === 3 || semitone === 6 || semitone === 8 || semitone === 10;
  };
  const isPointerOnScrollbar = (
    event: React.PointerEvent<HTMLDivElement>,
    wrapper: HTMLDivElement,
  ) => {
    const rect = wrapper.getBoundingClientRect();
    const hasVertical = wrapper.offsetWidth > wrapper.clientWidth;
    const hasHorizontal = wrapper.offsetHeight > wrapper.clientHeight;
    const onVerticalScrollbar = hasVertical && event.clientX >= rect.left + wrapper.clientWidth;
    const onHorizontalScrollbar = hasHorizontal && event.clientY >= rect.top + wrapper.clientHeight;
    return onVerticalScrollbar || onHorizontalScrollbar;
  };

  const getGridPoint = (clientX: number, clientY: number) => {
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return null;
    }

    const rect = wrapper.getBoundingClientRect();
    const x = clientX - rect.left + wrapper.scrollLeft - labelWidth;
    const y = clientY - rect.top + wrapper.scrollTop;
    const step = clamp(Math.floor(x / stepWidth), 0, totalSteps - 1);
    const rowIndex = clamp(Math.floor(y / rowHeight), 0, pitchRows.length - 1);
    const pitch = pitchRows[rowIndex]?.pitch ?? pitchRows[pitchRows.length - 1]?.pitch ?? 48;

    return { step, pitch };
  };

  const startDraggingNote = (
    event: React.PointerEvent<HTMLElement>,
    note: PianoRollNote,
    mode: "move" | "resize",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const isMultiSelectKey = event.ctrlKey || event.metaKey;
    if (mode === "move" && isMultiSelectKey) {
      const nextIds = selectedNoteIdSetRef.current.has(note.id)
        ? selectedNoteIds.filter((id) => id !== note.id)
        : [...selectedNoteIds, note.id];
      onSelectionChange(nextIds);
      return;
    }
    if (mode === "move" && !selectedNoteIdSetRef.current.has(note.id)) {
      onSelectionChange([note.id]);
    }

    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const movingIds = selectedNoteIdSetRef.current.has(note.id)
      ? Array.from(selectedNoteIdSetRef.current)
      : [note.id];

    dragRef.current = {
      mode,
      noteId: note.id,
      originPitch: note.pitch,
      originLength: note.length,
      pointerStartStep: point.step,
      lastStep: snapStep(point.step),
      lastPitch: point.pitch,
      moved: false,
      pitchDeltaTotal: 0,
      lastPreviewPitch: note.pitch,
      movingNoteIds: movingIds,
    };
    isDraggingRef.current = false;
    onBeginEditTransaction();

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const currentPoint = getGridPoint(moveEvent.clientX, moveEvent.clientY);
      if (!currentPoint) {
        return;
      }

      isDraggingRef.current = true;
      if (drag.mode === "move") {
        const snappedStep = snapStep(currentPoint.step);
        const stepDelta = snappedStep - drag.lastStep;
        const pitchDelta = currentPoint.pitch - drag.lastPitch;
        if (stepDelta !== 0 || pitchDelta !== 0) {
          onMoveNotesByDelta(drag.movingNoteIds, pitchDelta, stepDelta);
          drag.lastStep = snappedStep;
          drag.lastPitch = currentPoint.pitch;
          drag.moved = true;
          drag.pitchDeltaTotal += pitchDelta;

          if (pitchDelta !== 0) {
            const previewPitch = Math.max(
              0,
              Math.min(127, drag.originPitch + drag.pitchDeltaTotal),
            );
            if (previewPitch !== drag.lastPreviewPitch) {
              drag.lastPreviewPitch = previewPitch;
              onPreviewMovedNote(previewPitch);
            }
          }
        }
      } else {
        const snappedStep = snapStep(currentPoint.step);
        const nextLength = drag.originLength + (snappedStep - drag.pointerStartStep);
        onResizeNote(drag.noteId, nextLength);
      }
    };

    const onUp = () => {
      onEndEditTransaction();
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const beginBoxSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return;
    }
    if (isPointerOnScrollbar(event, wrapper)) {
      return;
    }
    const cellElement = (event.target as HTMLElement | null)?.closest(
      ".piano-cell",
    ) as HTMLButtonElement | null;
    const cellStepAttr = cellElement?.dataset.step;
    const cellPitchAttr = cellElement?.dataset.pitch;
    const point =
      cellStepAttr !== undefined && cellPitchAttr !== undefined
        ? {
            step: clamp(Number(cellStepAttr), 0, totalSteps - 1),
            pitch: clamp(Number(cellPitchAttr), 0, 127),
            stepWidth: 0,
          }
        : getGridPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }
    const snappedStart = snapStep(point.step);
    boxSelectRef.current = {
      pointerStartStep: snappedStart,
      pointerStartPitch: point.pitch,
      currentStep: snappedStart,
      currentPitch: point.pitch,
    };
    setBoxSelectUI({
      startStep: snappedStart,
      startPitch: point.pitch,
      endStep: snappedStart,
      endPitch: point.pitch,
    });
    isDraggingRef.current = false;

    const onMove = (moveEvent: PointerEvent) => {
      const current = getGridPoint(moveEvent.clientX, moveEvent.clientY);
      if (!current || !boxSelectRef.current) {
        return;
      }
      const snappedCurrent = snapStep(current.step);
      boxSelectRef.current.currentStep = snappedCurrent;
      boxSelectRef.current.currentPitch = current.pitch;
      setBoxSelectUI({
        startStep: boxSelectRef.current.pointerStartStep,
        startPitch: boxSelectRef.current.pointerStartPitch,
        endStep: snappedCurrent,
        endPitch: current.pitch,
      });
      if (
        Math.abs(snappedCurrent - boxSelectRef.current.pointerStartStep) > 0 ||
        Math.abs(current.pitch - boxSelectRef.current.pointerStartPitch) > 0
      ) {
        isDraggingRef.current = true;
      }
    };

    const onUp = (upEvent: PointerEvent) => {
      const finalPoint = getGridPoint(upEvent.clientX, upEvent.clientY);
      const box = boxSelectRef.current;
      boxSelectRef.current = null;
      setBoxSelectUI(null);

      if (!box || !finalPoint) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        return;
      }

      if (!isDraggingRef.current) {
        if (selectedNoteIds.length > 0) {
          onSelectionChange([]);
        } else {
          onAddNote(box.pointerStartPitch, box.pointerStartStep);
          onPreviewAddedNote(box.pointerStartPitch);
        }
      } else {
        const minStep = Math.min(box.pointerStartStep, box.currentStep);
        const maxStep = Math.max(box.pointerStartStep, box.currentStep);
        const minPitch = Math.min(box.pointerStartPitch, box.currentPitch);
        const maxPitch = Math.max(box.pointerStartPitch, box.currentPitch);
        const hitIds = selectedNotes
          .filter((note) => {
            const noteStepStart = note.startStep;
            const noteStepEnd = note.startStep + Math.max(1, note.length) - 1;
            const overlapStep = !(noteStepEnd < minStep || noteStepStart > maxStep);
            const overlapPitch = note.pitch >= minPitch && note.pitch <= maxPitch;
            return overlapStep && overlapPitch;
          })
          .map((note) => note.id);
        onSelectionChange(hitIds);
      }

      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const boxStyle = useMemo(() => {
    if (!boxSelectUI) {
      return undefined;
    }
    const minStep = Math.min(boxSelectUI.startStep, boxSelectUI.endStep);
    const maxStep = Math.max(boxSelectUI.startStep, boxSelectUI.endStep);
    const startPitchIdx = Math.max(0, getPitchIndex(boxSelectUI.startPitch));
    const endPitchIdx = Math.max(0, getPitchIndex(boxSelectUI.endPitch));
    const topIndex = Math.min(startPitchIdx, endPitchIdx);
    const bottomIndex = Math.max(startPitchIdx, endPitchIdx);
    const leftPx = labelWidth + minStep * stepWidth;
    const widthPx = Math.max(1, (maxStep - minStep + 1) * stepWidth - 1);

    return {
      left: `${leftPx}px`,
      width: `${widthPx}px`,
      top: `${topIndex * rowHeight}px`,
      height: `${(bottomIndex - topIndex + 1) * rowHeight}px`,
    };
  }, [boxSelectUI, stepWidth]);

  useEffect(() => {
    if (playheadStep === null) {
      return;
    }
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return;
    }
    const playheadX = labelWidth + playheadStep * stepWidth;
    const left = wrapper.scrollLeft;
    const right = left + wrapper.clientWidth;
    const margin = stepWidth * 4;

    if (playheadX > right - margin) {
      wrapper.scrollLeft = Math.max(0, playheadX - wrapper.clientWidth + margin);
    } else if (playheadX < left + labelWidth + margin) {
      wrapper.scrollLeft = Math.max(0, playheadX - labelWidth - margin);
    }
  }, [playheadStep, stepWidth]);

  useEffect(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return;
    }
    const emitViewportStep = () => {
      const step = clamp(Math.floor((wrapper.scrollLeft - labelWidth) / stepWidth), 0, totalSteps - 1);
      onViewportStepChange(step);
    };
    emitViewportStep();
    wrapper.addEventListener("scroll", emitViewportStep, { passive: true });
    return () => wrapper.removeEventListener("scroll", emitViewportStep);
  }, [stepWidth, totalSteps, onViewportStepChange]);

  useEffect(() => {
    if (initializedScrollRef.current) {
      return;
    }
    const wrapper = scrollRef.current;
    if (!wrapper) {
      return;
    }
    const defaultPitch = 72;
    const index = pitchRows.findIndex((row) => row.pitch === defaultPitch);
    if (index >= 0) {
      wrapper.scrollTop = Math.max(0, (index - 10) * rowHeight);
    }
    initializedScrollRef.current = true;
  }, [pitchRows]);

  return (
    <div className="piano-roll">
      <div className="piano-roll-header">
        <div className="left-group">
          <h3>Piano Roll</h3>
          <span className="channel-label">
            {selectedChannel ? (
              <>
                <span
                  className="channel-label-dot"
                  style={{ background: selectedChannel.color }}
                />
                {`Editing: ${selectedChannel.name}`}
              </>
            ) : "No channel selected"}
          </span>
          <span className="selected-count">Selected: {selectedNoteIds.length}</span>
        </div>
        <div className="right-group">
          <label className="snap-label">
            Snap
            <select
              value={snapStepSize}
              onChange={(event) => setSnapStepSize(Number(event.target.value))}
            >
              <option value={1}>1/16</option>
              <option value={2}>1/8</option>
              <option value={4}>1/4</option>
            </select>
          </label>
        </div>
      </div>
      <div className="hint">
        Click to add notes. Drag blank area for box-select. Drag note body to move selected notes,
        drag right handle to resize, right-click note to delete, Ctrl/Cmd+Click to multi-select.
      </div>

      <div className="piano-grid-wrapper" ref={scrollRef} onPointerDown={beginBoxSelection}>
        <div
          className="piano-grid"
          style={{ width: `${labelWidth + totalSteps * stepWidth}px` }}
        >
          <div className="bar-guides">
            {Array.from({ length: bars + 1 }, (_, barIndex) => (
              <div
                key={`bar-guide-${barIndex}`}
                className={`bar-guide ${barIndex === 0 ? "is-start" : ""}`}
                style={{
                  left: `${labelWidth + barIndex * stepsPerBar * stepWidth}px`,
                }}
              />
            ))}
          </div>
          {playheadStep !== null ? (
            <div
              className="playhead-line"
              style={{ left: `${labelWidth + playheadStep * stepWidth}px` }}
            />
          ) : null}
          {boxStyle ? <div className="selection-box" style={boxStyle} /> : null}
          {pitchRows.map((row, rowIndex) => (
            <div
              key={row.pitch}
              className={`piano-row ${rowIndex % 2 === 1 ? "is-row-alt" : ""} ${
                isBlackKeyPitch(row.pitch) ? "is-black-key-row" : "is-white-key-row"
              }`}
            >
              <div className="pitch-label">{row.label}</div>
              <div className="cells">
                {Array.from({ length: totalSteps }, (_, step) => {
                  return (
                    <button
                      key={`${row.pitch}-${step}`}
                      className={`
                        piano-cell
                        ${step % 2 === 1 ? "is-step-alt" : ""}
                      `}
                      data-step={step}
                      data-pitch={row.pitch}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      title={`${row.label} / Step ${step + 1}`}
                    />
                  );
                })}
                {selectedNotes
                  .filter((note) => note.pitch === row.pitch)
                  .map((note) => (
                    <div
                      key={note.id}
                      className={`note-block ${selectedNoteIdSetRef.current.has(note.id) ? "is-selected" : ""}`}
                      style={{
                        left: `${note.startStep * stepWidth + 1}px`,
                        width: `${Math.max(1, note.length) * stepWidth - 2}px`,
                        background: selectedChannel?.color ?? "#60a5fa",
                      }}
                      onPointerDown={(event) => startDraggingNote(event, note, "move")}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteNote(note.id);
                        onSelectionChange(selectedNoteIds.filter((id) => id !== note.id));
                      }}
                    >
                      <span className="note-velocity">{note.velocity}</span>
                      <span
                        className="note-resize-handle"
                        onPointerDown={(event) => startDraggingNote(event, note, "resize")}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .piano-roll {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px;
          background: #1a1c21;
          box-sizing: border-box;
        }
        .piano-roll-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .left-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .right-group {
          display: flex;
          align-items: center;
        }
        .piano-roll-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
        }
        .channel-label {
          font-size: 12px;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .channel-label-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
          flex-shrink: 0;
        }
        .selected-count {
          font-size: 12px;
          color: #cbd5e1;
        }
        .snap-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #cbd5e1;
        }
        .snap-label select {
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 6px;
          padding: 3px 6px;
        }
        .hint {
          font-size: 12px;
          color: #93a3b8;
          margin-bottom: 8px;
        }
        .piano-grid-wrapper {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 420px;
          border-radius: 8px;
          border: 1px solid #2f3540;
          background: #22262d;
          box-sizing: border-box;
        }
        .piano-grid {
          position: relative;
        }
        .bar-guides {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .bar-guide {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(116, 126, 143, 0.35);
        }
        .bar-guide.is-start {
          background: rgba(170, 180, 196, 0.65);
        }
        .playhead-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(251, 191, 36, 0.9);
          z-index: 5;
          pointer-events: none;
        }
        .selection-box {
          position: absolute;
          z-index: 4;
          border: 1px dashed rgba(251, 191, 36, 0.8);
          background: rgba(251, 191, 36, 0.12);
          pointer-events: none;
        }
        .piano-row {
          display: grid;
          grid-template-columns: 56px 1fr;
          height: 24px;
          border-bottom: 1px solid #2b313c;
          box-sizing: border-box;
        }
        .piano-row.is-row-alt {
          background: rgba(255, 255, 255, 0.012);
        }
        .piano-row:last-child {
          border-bottom: none;
        }
        .pitch-label {
          border-right: 1px solid #313845;
          display: grid;
          place-items: center;
          color: #cdd3dd;
          font-size: 11px;
          background: #2a2f37;
          user-select: none;
          height: 24px;
          box-sizing: border-box;
        }
        .piano-row.is-black-key-row .pitch-label {
          background: #20252c;
          color: #9ea7b6;
        }
        .cells {
          display: grid;
          grid-template-columns: repeat(${totalSteps}, ${stepWidth}px);
          grid-template-rows: 24px;
          grid-auto-rows: 24px;
          position: relative;
          height: 24px;
          box-sizing: border-box;
        }
        .piano-cell {
          height: 24px;
          border: none;
          border-right: 1px solid #2a303a;
          border-bottom: 1px solid #2a303a;
          background: #242932;
          cursor: pointer;
          pointer-events: auto;
        }
        .piano-row.is-black-key-row .piano-cell {
          background: #20252d;
        }
        .piano-cell.is-step-alt {
          background: #272d37;
        }
        .piano-row.is-black-key-row .piano-cell.is-step-alt {
          background: #232931;
        }
        .piano-cell:hover {
          background: #313844;
        }
        .piano-row.is-black-key-row .piano-cell:hover {
          background: #2d343e;
        }
        .note-block {
          position: absolute;
          top: 2px;
          z-index: 2;
          border-radius: 4px;
          height: 20px;
          cursor: grab;
          display: grid;
          grid-template-columns: 1fr 8px;
          align-items: center;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.24);
          color: #0b1020;
          font-size: 10px;
          font-weight: 700;
          user-select: none;
          pointer-events: auto;
          box-sizing: border-box;
          overflow: hidden;
        }
        .note-block:active {
          cursor: grabbing;
        }
        .note-block.is-selected {
          box-shadow: 0 0 0 1px #ffffff, 0 0 10px rgba(255, 255, 255, 0.35);
        }
        .note-velocity {
          padding-left: 4px;
          opacity: 0.72;
        }
        .note-resize-handle {
          height: 100%;
          border-left: 1px solid rgba(0, 0, 0, 0.25);
          background: rgba(255, 255, 255, 0.32);
          cursor: ew-resize;
        }
        @media (max-width: 1366px), (max-height: 900px) {
          .piano-roll {
            padding: 10px;
          }
          .piano-roll-header {
            margin-bottom: 8px;
          }
          .left-group {
            gap: 6px;
          }
          .hint {
            font-size: 11px;
            margin-bottom: 6px;
          }
          .piano-grid-wrapper {
            max-height: 360px;
          }
        }
      `}</style>
    </div>
  );
}
