import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import type { PianoRollNote, PitchRow, SequencerChannel } from "./types";

export interface PianoRollCanvasProps {
  stepsPerBar: number;
  bars: number;
  pitchRows: PitchRow[];
  selectedChannelId: string | null;
  channels: SequencerChannel[];
  notes: PianoRollNote[];
  selectedNoteIds: string[];
  stepWidth: number;
  rowHeight: number;
  playheadStep: number | null;
  boxSelectUI: {
    startStep: number;
    startPitch: number;
    endStep: number;
    endPitch: number;
  } | null;
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
}

export function PianoRollCanvas({
  stepsPerBar,
  bars,
  pitchRows,
  selectedChannelId,
  channels,
  notes,
  selectedNoteIds,
  stepWidth,
  rowHeight,
  playheadStep,
  boxSelectUI,
  onSelectionChange,
  onAddNote,
  onPreviewAddedNote,
  onPreviewMovedNote,
  onDeleteNote,
  onMoveNote,
  onMoveNotesByDelta,
  onResizeNote,
  onBeginEditTransaction,
  onEndEditTransaction,
}: PianoRollCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);

  const totalSteps = stepsPerBar * bars;
  const totalPitchRows = pitchRows.length;
  
  const canvasWidth = totalSteps * stepWidth;
  const canvasHeight = totalPitchRows * rowHeight;

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const selectedNotes = useMemo(
    () => notes.filter((note) => note.channelId === selectedChannelId),
    [notes, selectedChannelId],
  );
  const selectedNoteIdSet = useMemo(() => new Set(selectedNoteIds), [selectedNoteIds]);

  const isBlackKeyPitch = useCallback((pitch: number) => {
    const semitone = ((pitch % 12) + 12) % 12;
    return semitone === 1 || semitone === 3 || semitone === 6 || semitone === 8 || semitone === 10;
  }, []);

  const getPitchIndex = useCallback((pitch: number) => {
    return pitchRows.findIndex((item) => item.pitch === pitch);
  }, [pitchRows]);

  const snapStepSize = 1;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const snapStep = useCallback((step: number) => {
    const snapped = Math.round(step / snapStepSize) * snapStepSize;
    return clamp(snapped, 0, totalSteps - 1);
  }, [totalSteps]);

  const getGridPoint = useCallback((clientX: number, clientY: number) => {
    const wrapper = containerRef.current;
    if (!wrapper) return null;

    const rect = wrapper.getBoundingClientRect();
    const scrollLeft = wrapper.scrollLeft;
    const scrollTop = wrapper.scrollTop;
    const x = clientX - rect.left + scrollLeft;
    const y = clientY - rect.top + scrollTop;
    
    const step = clamp(Math.floor(x / stepWidth), 0, totalSteps - 1);
    const rowIndex = clamp(Math.floor(y / rowHeight), 0, pitchRows.length - 1);
    const pitch = pitchRows[rowIndex]?.pitch ?? pitchRows[pitchRows.length - 1]?.pitch ?? 48;

    return { step, pitch };
  }, [stepWidth, rowHeight, totalSteps, pitchRows]);

  // Drawing functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    
    // Clear
    ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#242932";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw grid lines
    for (let step = 0; step < totalSteps; step++) {
      const x = step * stepWidth;
      const isAlt = step % 2 === 1;
      const isBarStart = step % stepsPerBar === 0;
      
      // Row backgrounds
      for (let rowIdx = 0; rowIdx < pitchRows.length; rowIdx++) {
        const y = rowIdx * rowHeight;
        const pitch = pitchRows[rowIdx].pitch;
        const isBlack = isBlackKeyPitch(pitch);
        
        if (isBlack) {
          ctx.fillStyle = isAlt ? "#232931" : "#20252d";
        } else {
          ctx.fillStyle = isAlt ? "#272d37" : "#242932";
        }
        ctx.fillRect(x, y, stepWidth, rowHeight);
      }

      // Vertical lines
      if (isBarStart) {
        ctx.fillStyle = "rgba(170, 180, 196, 0.65)";
        ctx.fillRect(x, 0, 1, canvasHeight);
      } else {
        ctx.fillStyle = "rgba(116, 126, 143, 0.2)";
        ctx.fillRect(x, 0, 1, canvasHeight);
      }
    }

    // Horizontal lines
    for (let rowIdx = 0; rowIdx <= pitchRows.length; rowIdx++) {
      const y = rowIdx * rowHeight;
      ctx.fillStyle = "rgba(116, 126, 143, 0.35)";
      ctx.fillRect(0, y, canvasWidth, 1);
    }

    ctx.restore();
  }, [canvasWidth, canvasHeight, totalSteps, stepsPerBar, stepWidth, rowHeight, pitchRows, isBlackKeyPitch]);

  const drawNotes = useCallback((ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const channelColor = selectedChannel?.color ?? "#60a5fa";

    selectedNotes.forEach((note) => {
      const rowIndex = getPitchIndex(note.pitch);
      if (rowIndex < 0) return;

      const x = note.startStep * stepWidth + 1;
      const y = rowIndex * rowHeight + 2;
      const width = Math.max(1, note.length) * stepWidth - 2;
      const height = rowHeight - 4;

      // Note body
      ctx.fillStyle = channelColor;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 4);
      ctx.fill();

      // Selection outline
      if (selectedNoteIdSet.has(note.id)) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.stroke();

        // Glow effect
        ctx.shadowColor = "rgba(255, 255, 255, 0.35)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Velocity text
      ctx.fillStyle = "#0b1020";
      ctx.font = "700 10px system-ui";
      if (width > 20) {
        ctx.fillText(String(note.velocity), x + 4, y + 14);
      }

      // Resize handle
      if (width > 12) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(x + width - 8, y, 8, height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
        ctx.fillRect(x + width - 8, y, 1, height);
      }
    });

    ctx.restore();
  }, [selectedNotes, selectedChannel, stepWidth, rowHeight, getPitchIndex, selectedNoteIdSet]);

  const drawPlayhead = useCallback((ctx: CanvasRenderingContext2D) => {
    if (playheadStep === null) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const x = playheadStep * stepWidth;
    ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
    ctx.fillRect(x, 0, 2, canvasHeight);

    ctx.restore();
  }, [playheadStep, stepWidth, canvasHeight]);

  const drawBoxSelection = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!boxSelectUI) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const minStep = Math.min(boxSelectUI.startStep, boxSelectUI.endStep);
    const maxStep = Math.max(boxSelectUI.startStep, boxSelectUI.endStep);
    const startPitchIdx = Math.max(0, getPitchIndex(boxSelectUI.startPitch));
    const endPitchIdx = Math.max(0, getPitchIndex(boxSelectUI.endPitch));
    const topIndex = Math.min(startPitchIdx, endPitchIdx);
    const bottomIndex = Math.max(startPitchIdx, endPitchIdx);

    const x = minStep * stepWidth;
    const y = topIndex * rowHeight;
    const width = (maxStep - minStep + 1) * stepWidth;
    const height = (bottomIndex - topIndex + 1) * rowHeight;

    ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }, [boxSelectUI, stepWidth, rowHeight, getPitchIndex]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGrid(ctx);
    drawBoxSelection(ctx);
    drawNotes(ctx);
    drawPlayhead(ctx);
  }, [drawGrid, drawBoxSelection, drawNotes, drawPlayhead]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    // Set canvas size to full content size (not just visible area)
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    render();
  }, [canvasWidth, canvasHeight, render]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Drag handling
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

  const isDraggingRef = useRef(false);

  const startDraggingNote = (
    event: React.PointerEvent<HTMLElement>,
    note: PianoRollNote,
    mode: "move" | "resize",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const isMultiSelectKey = event.ctrlKey || event.metaKey;
    if (mode === "move" && isMultiSelectKey) {
      const nextIds = selectedNoteIdSet.has(note.id)
        ? selectedNoteIds.filter((id) => id !== note.id)
        : [...selectedNoteIds, note.id];
      onSelectionChange(nextIds);
      return;
    }
    if (mode === "move" && !selectedNoteIdSet.has(note.id)) {
      onSelectionChange([note.id]);
    }

    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;

    const movingIds = selectedNoteIdSet.has(note.id)
      ? Array.from(selectedNoteIdSet)
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
      if (!drag) return;

      const currentPoint = getGridPoint(moveEvent.clientX, moveEvent.clientY);
      if (!currentPoint) return;

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
            const previewPitch = Math.max(0, Math.min(127, drag.originPitch + drag.pitchDeltaTotal));
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

  const beginBoxSelection = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    
    const wrapper = containerRef.current;
    if (!wrapper) return;

    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;

    const snappedStart = snapStep(point.step);
    boxSelectRef.current = {
      pointerStartStep: snappedStart,
      pointerStartPitch: point.pitch,
      currentStep: snappedStart,
      currentPitch: point.pitch,
    };
    isDraggingRef.current = false;

    const onMove = (moveEvent: PointerEvent) => {
      const current = getGridPoint(moveEvent.clientX, moveEvent.clientY);
      if (!current || !boxSelectRef.current) return;

      const snappedCurrent = snapStep(current.step);
      boxSelectRef.current.currentStep = snappedCurrent;
      boxSelectRef.current.currentPitch = current.pitch;

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

  // Handle pointer down on canvas for note selection/drag
  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;

    // Check if clicking on a note
    const clickedNote = selectedNotes.find((note) => {
      const rowIndex = getPitchIndex(note.pitch);
      if (rowIndex < 0) return false;
      
      const noteX = note.startStep * stepWidth;
      const noteY = rowIndex * rowHeight;
      const noteWidth = Math.max(1, note.length) * stepWidth;
      const noteHeight = rowHeight;
      
      const canvasX = point.step * stepWidth;
      const canvasY = point.pitch; // This is the pitch value
      
      return (
        canvasX >= noteX &&
        canvasX <= noteX + noteWidth &&
        note.pitch === point.pitch
      );
    });

    if (clickedNote) {
      // Check if clicking on resize handle
      const rowIndex = getPitchIndex(clickedNote.pitch);
      const noteX = clickedNote.startStep * stepWidth;
      const noteWidth = Math.max(1, clickedNote.length) * stepWidth;
      const clickX = point.step * stepWidth;
      
      const isOnResizeHandle = clickX >= noteX + noteWidth - 12;
      
      startDraggingNote(event as any, clickedNote, isOnResizeHandle ? "resize" : "move");
    } else {
      // Start box selection
      beginBoxSelection(event);
    }
  };

  return (
    <div
      ref={containerRef}
      className="piano-roll-canvas-container"
      style={{
        overflow: "auto",
        width: "100%",
        maxWidth: "100%",
        maxHeight: "420px",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        style={{
          display: "block",
        }}
      />
    </div>
  );
}
