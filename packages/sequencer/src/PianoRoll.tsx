import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Select } from "@mantine/core";
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
  const notesByPitch = useMemo(() => {
    const grouped = new Map<number, PianoRollNote[]>();
    selectedNotes.forEach((note) => {
      const current = grouped.get(note.pitch);
      if (current) {
        current.push(note);
      } else {
        grouped.set(note.pitch, [note]);
      }
    });
    return grouped;
  }, [selectedNotes]);
  const [snapStepSize, setSnapStepSize] = useState(1);
  const [boxSelectUI, setBoxSelectUI] = useState<{
    startStep: number;
    startPitch: number;
    endStep: number;
    endPitch: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pitchLabelsInnerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initializedScrollRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastAutoScrollAtRef = useRef(0);

  const labelWidth = 56;
  const rowHeight = 24;
  const selectedNoteIdSetRef = useRef(new Set<string>());
  selectedNoteIdSetRef.current = new Set(selectedNoteIds);

  const canvasWidth = totalSteps * stepWidth;
  const canvasHeight = pitchRows.length * rowHeight;

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const snapStep = useCallback((step: number) => {
    const snapped = Math.round(step / snapStepSize) * snapStepSize;
    return clamp(snapped, 0, totalSteps - 1);
  }, [snapStepSize, totalSteps]);

  const getPitchIndex = useCallback((pitch: number) => pitchRows.findIndex((item) => item.pitch === pitch), [pitchRows]);
  const isBlackKeyPitch = useCallback((pitch: number) => {
    const semitone = ((pitch % 12) + 12) % 12;
    return semitone === 1 || semitone === 3 || semitone === 6 || semitone === 8 || semitone === 10;
  }, []);

  const getGridPoint = useCallback((clientX: number, clientY: number) => {
    const wrapper = scrollRef.current;
    if (!wrapper) return null;

    const rect = wrapper.getBoundingClientRect();
    const x = clientX - rect.left + wrapper.scrollLeft - labelWidth;
    const y = clientY - rect.top + wrapper.scrollTop;
    const step = clamp(Math.floor(x / stepWidth), 0, totalSteps - 1);
    const rowIndex = clamp(Math.floor(y / rowHeight), 0, pitchRows.length - 1);
    const pitch = pitchRows[rowIndex]?.pitch ?? pitchRows[pitchRows.length - 1]?.pitch ?? 48;

    return { step, pitch };
  }, [stepWidth, rowHeight, totalSteps, pitchRows]);

  // Canvas 渲染：尺寸 = 可见区域，绘制时偏移内容
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = scrollRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const contentWidth = totalSteps * stepWidth;
    const contentHeight = pitchRows.length * rowHeight;
    const scrollLeft = wrapper.scrollLeft;
    const scrollTop = wrapper.scrollTop;
    const visibleWidth = wrapper.clientWidth;
    const visibleHeight = wrapper.clientHeight;

    // canvas 尺寸 = 可见区域
    const needsResize = canvas.width !== visibleWidth * dpr || canvas.height !== visibleHeight * dpr;
    if (needsResize) {
      canvas.width = visibleWidth * dpr;
      canvas.height = visibleHeight * dpr;
      canvas.style.width = `${visibleWidth}px`;
      canvas.style.height = `${visibleHeight}px`;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // 绘制偏移量：canvas 0,0 对应内容的 scrollLeft, scrollTop
    const offsetX = scrollLeft;
    const offsetY = scrollTop;

    // 计算可见范围（在内容坐标系中）
    const startStep = Math.floor(scrollLeft / stepWidth);
    const endStep = Math.min(totalSteps, Math.ceil((scrollLeft + visibleWidth) / stepWidth) + 1);
    const startPitchIdx = Math.floor(scrollTop / rowHeight);
    const endPitchIdx = Math.min(pitchRows.length, Math.ceil((scrollTop + visibleHeight) / rowHeight) + 1);

    // Background (可见区域)
    ctx.fillStyle = "#242932";
    ctx.fillRect(0, 0, visibleWidth, visibleHeight);

    // Grid lines
    for (let step = startStep; step < endStep; step++) {
      const x = step * stepWidth - offsetX;
      const isAlt = step % 2 === 1;
      const isBarStart = step % stepsPerBar === 0;

      // Row backgrounds
      for (let rowIdx = startPitchIdx; rowIdx < endPitchIdx; rowIdx++) {
        const y = rowIdx * rowHeight - offsetY;
        const pitch = pitchRows[rowIdx]?.pitch;
        if (!pitch) continue;
        const isBlack = isBlackKeyPitch(pitch);

        if (isBlack) {
          ctx.fillStyle = isAlt ? "#232931" : "#20252d";
        } else {
          ctx.fillStyle = isAlt ? "#272d37" : "#242932";
        }
        ctx.fillRect(x, y, stepWidth, rowHeight);
      }

      // Vertical lines
      if (x >= -stepWidth && x <= visibleWidth) {
        ctx.fillStyle = isBarStart ? "rgba(170, 180, 196, 0.65)" : "rgba(116, 126, 143, 0.2)";
        ctx.fillRect(x, 0, 1, visibleHeight);
      }
    }

    // Horizontal lines
    for (let rowIdx = startPitchIdx; rowIdx <= endPitchIdx; rowIdx++) {
      const y = rowIdx * rowHeight - offsetY;
      if (y >= -rowHeight && y <= visibleHeight) {
        ctx.fillStyle = "rgba(116, 126, 143, 0.35)";
        ctx.fillRect(0, y, visibleWidth, 1);
      }
    }

    // Bar guides
    for (let bar = 0; bar <= bars; bar++) {
      const x = bar * stepsPerBar * stepWidth - offsetX;
      if (x >= -stepWidth && x <= visibleWidth) {
        ctx.fillStyle = "rgba(170, 180, 196, 0.65)";
        ctx.fillRect(x, 0, 1, visibleHeight);
      }
    }

    // Box selection
    if (boxSelectUI) {
      const minStep = Math.min(boxSelectUI.startStep, boxSelectUI.endStep);
      const maxStep = Math.max(boxSelectUI.startStep, boxSelectUI.endStep);
      const startPitchIdxBox = Math.max(0, getPitchIndex(boxSelectUI.startPitch));
      const endPitchIdxBox = Math.max(0, getPitchIndex(boxSelectUI.endPitch));
      const topIndex = Math.min(startPitchIdxBox, endPitchIdxBox);
      const bottomIndex = Math.max(startPitchIdxBox, endPitchIdxBox);

      const bx = minStep * stepWidth - offsetX;
      const by = topIndex * rowHeight - offsetY;
      const bw = (maxStep - minStep + 1) * stepWidth;
      const bh = (bottomIndex - topIndex + 1) * rowHeight;

      ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
    }

    // Notes (只绘制可见的)
    const channelColor = selectedChannel?.color ?? "#60a5fa";
    selectedNotes.forEach((note) => {
      const rowIndex = getPitchIndex(note.pitch);
      if (rowIndex < 0) return;

      // 跳过完全不可见的音符
      if (rowIndex < startPitchIdx - 1 || rowIndex > endPitchIdx) return;
      const noteEndStep = note.startStep + note.length;
      if (noteEndStep < startStep || note.startStep > endStep) return;

      const nx = note.startStep * stepWidth - offsetX + 1;
      const ny = rowIndex * rowHeight - offsetY + 2;
      const nw = Math.max(1, note.length) * stepWidth - 2;
      const nh = rowHeight - 4;

      // canvas 是内容尺寸，直接绘制
      ctx.fillStyle = channelColor;
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, 4);
      ctx.fill();

      // Selection outline
      if (selectedNoteIdSetRef.current.has(note.id)) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(nx, ny, nw, nh, 4);
        ctx.stroke();
        ctx.shadowColor = "rgba(255, 255, 255, 0.35)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Velocity text
      if (nw > 20) {
        ctx.fillStyle = "#0b1020";
        ctx.font = "700 10px system-ui";
        ctx.fillText(String(note.velocity), nx + 4, ny + 14);
      }

      // Resize handle
      if (nw > 12) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(nx + nw - 8, ny, 8, nh);
        ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
        ctx.fillRect(nx + nw - 8, ny, 1, nh);
      }
    });

    // Playhead
    if (playheadStep !== null) {
      const px = playheadStep * stepWidth - offsetX;
      if (px >= 0 && px <= visibleWidth) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
        ctx.fillRect(px, 0, 2, visibleHeight);
      }
    }

    ctx.restore();
  }, [totalSteps, stepsPerBar, bars, stepWidth, rowHeight, pitchRows, isBlackKeyPitch, boxSelectUI, selectedNotes, selectedChannel, getPitchIndex, playheadStep]);

  // 初始化 canvas 并监听 scroll
  useEffect(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;

    drawCanvas();

    const handleScroll = () => {
      // 同步 pitch labels 滚动位置
      if (pitchLabelsInnerRef.current && wrapper) {
        pitchLabelsInnerRef.current.style.transform = `translateY(${-wrapper.scrollTop}px)`;
      }
      // 使用节流避免频繁重绘
      if (frameRequestedRef.current) return;
      frameRequestedRef.current = true;
      requestAnimationFrame(() => {
        drawCanvas();
        frameRequestedRef.current = false;
      });
    };
    wrapper.addEventListener("scroll", handleScroll, { passive: true });
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, [drawCanvas]);

  // State 变化时重绘
  // 性能优化：使用 ref 跟踪是否正在绘制，避免频繁重绘
  const frameRequestedRef = useRef(false);

  useEffect(() => {
    if (frameRequestedRef.current) return;
    frameRequestedRef.current = true;
    requestAnimationFrame(() => {
      drawCanvas();
      frameRequestedRef.current = false;
    });
  }, [drawCanvas]);

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

  const isPointerOnScrollbar = (
    event: React.PointerEvent<HTMLElement>,
    wrapper: HTMLDivElement,
  ) => {
    const rect = wrapper.getBoundingClientRect();
    const hasVertical = wrapper.offsetWidth > wrapper.clientWidth;
    const hasHorizontal = wrapper.offsetHeight > wrapper.clientHeight;
    const onVerticalScrollbar = hasVertical && event.clientX >= rect.left + wrapper.clientWidth;
    const onHorizontalScrollbar = hasHorizontal && event.clientY >= rect.top + wrapper.clientHeight;
    return onVerticalScrollbar || onHorizontalScrollbar;
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

  const beginBoxSelection = (event: React.PointerEvent<HTMLElement>) => {
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

    const point = getGridPoint(event.clientX, event.clientY);
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

  // Handle canvas pointer events for note interaction
  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;

    // Check if clicking on a note
    const clickedNote = selectedNotes.find((note) => {
      const rowIndex = getPitchIndex(note.pitch);
      if (rowIndex < 0) return false;

      const noteX = note.startStep * stepWidth;
      const noteWidth = Math.max(1, note.length) * stepWidth;
      const clickX = point.step * stepWidth;

      return note.pitch === point.pitch && clickX >= noteX && clickX <= noteX + noteWidth;
    });

    if (clickedNote) {
      const noteX = clickedNote.startStep * stepWidth;
      const noteWidth = Math.max(1, clickedNote.length) * stepWidth;
      const clickX = point.step * stepWidth;
      const isOnResizeHandle = clickX >= noteX + noteWidth - 12;
      startDraggingNote(event as any, clickedNote, isOnResizeHandle ? "resize" : "move");
    } else {
      beginBoxSelection(event);
    }
  };

  // Handle right-click on canvas for note deletion
  const handleCanvasContextMenu = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;

    // Find note at click position
    const clickedNote = selectedNotes.find((note) => {
      const rowIndex = getPitchIndex(note.pitch);
      if (rowIndex < 0) return false;

      const noteX = note.startStep * stepWidth;
      const noteWidth = Math.max(1, note.length) * stepWidth;
      const clickX = point.step * stepWidth;

      return note.pitch === point.pitch && clickX >= noteX && clickX <= noteX + noteWidth;
    });

    if (clickedNote) {
      onDeleteNote(clickedNote.id);
      onSelectionChange(selectedNoteIds.filter((id) => id !== clickedNote.id));
    }
  };

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
    const now = performance.now();
    if (now - lastAutoScrollAtRef.current < 40) {
      return;
    }

    if (playheadX > right - margin) {
      lastAutoScrollAtRef.current = now;
      wrapper.scrollLeft = Math.max(0, playheadX - wrapper.clientWidth + margin);
    } else if (playheadX < left + labelWidth + margin) {
      lastAutoScrollAtRef.current = now;
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
            <Select
              className="snap-select"
              classNames={{ input: "snap-select-input", dropdown: "snap-select-dropdown", option: "snap-select-option" }}
              size="xs"
              value={String(snapStepSize)}
              data={[
                { value: "1", label: "1/16" },
                { value: "2", label: "1/8" },
                { value: "4", label: "1/4" },
              ]}
              onChange={(value) => setSnapStepSize(Number(value ?? 1))}
            />
          </label>
        </div>
      </div>
      <div className="hint">
        Click to add notes. Drag blank area for box-select. Drag note body to move selected notes,
        drag right handle to resize, right-click note to delete, Ctrl/Cmd+Click to multi-select.
      </div>

      <div className="piano-roll-container">
        {/* Pitch Labels - DOM (随 vertical scroll 滚动) */}
        <div className="pitch-labels" style={{ overflow: 'hidden' }}>
          <div className="pitch-labels-inner" ref={pitchLabelsInnerRef}>
            {pitchRows.map((row, rowIndex) => (
              <div
                key={row.pitch}
                className={`pitch-label ${rowIndex % 2 === 1 ? "is-row-alt" : ""} ${
                  isBlackKeyPitch(row.pitch) ? "is-black-key-row" : "is-white-key-row"
                }`}
              >
                {row.label}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Container - Scrollable */}
        <div className="piano-canvas-wrapper" ref={scrollRef}>
          <div 
            className="piano-canvas-inner"
            style={{
              width: `${totalSteps * stepWidth}px`,
              height: `${pitchRows.length * rowHeight}px`,
            }}
          />
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onContextMenu={handleCanvasContextMenu}
          />
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
        .snap-select {
          min-width: 0;
          width: 88px;
        }
        .snap-select-input {
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 6px;
        }
        .snap-select-dropdown {
          background: #0f172a;
          border-color: #334155;
        }
        .snap-select-option {
          color: #e2e8f0;
        }
        .hint {
          font-size: 12px;
          color: #93a3b8;
          margin-bottom: 8px;
        }
        .piano-roll-container {
          display: flex;
          overflow: hidden;
          border-radius: 8px;
          border: 1px solid #2f3540;
          background: #22262d;
          max-height: 420px;
        }
        .pitch-labels {
          flex-shrink: 0;
          width: 56px;
          overflow: hidden;
        }
        .pitch-labels-inner {
          /* 内容高度与 canvas 一致 */
          height: ${pitchRows.length * rowHeight}px;
          position: relative;
        }
        .pitch-label {
          height: 24px;
          display: grid;
          place-items: center;
          color: #cdd3dd;
          font-size: 11px;
          background: #2a2f37;
          user-select: none;
          border-right: 1px solid #313845;
          border-bottom: 1px solid #2b313c;
          box-sizing: border-box;
        }
        .pitch-label.is-row-alt {
          background: rgba(255, 255, 255, 0.012);
        }
        .pitch-label.is-black-key-row {
          background: #20252c;
          color: #9ea7b6;
        }
        .pitch-label.is-black-key-row.is-row-alt {
          background: #1e2228;
        }
        .piano-canvas-wrapper {
          flex: 1;
          overflow: auto;
          position: relative;
        }
        .piano-canvas-inner {
          position: relative;
        }
        .piano-canvas-wrapper canvas {
          position: absolute;
          top: 0;
          left: 0;
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
          .piano-roll-container {
            max-height: 360px;
          }
        }
        @media (max-width: 768px) {
          .piano-roll {
            padding: 8px;
          }
          .piano-roll-header {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
          }
          .left-group {
            flex-wrap: wrap;
            gap: 6px;
          }
          .right-group {
            justify-content: flex-start;
          }
          .channel-label,
          .selected-count,
          .snap-label {
            font-size: 11px;
          }
          .piano-roll-container {
            max-height: 300px;
          }
        }
        @media (max-width: 520px) {
          .hint {
            display: none;
          }
          .piano-roll-container {
            max-height: 260px;
          }
        }
      `}</style>
    </div>
  );
}
