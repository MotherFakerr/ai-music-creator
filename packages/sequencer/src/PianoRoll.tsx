import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onMoveNotesByDelta: (
    noteIds: string[],
    pitchDelta: number,
    stepDelta: number,
  ) => void;
  onResizeNote: (noteId: string, nextLength: number) => void;
  onBeginEditTransaction: () => void;
  onEndEditTransaction: () => void;
  onViewportStepChange: (step: number) => void;
  onSeek?: (step: number) => void;
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
  onSeek,
  stepWidth,
  playheadStep,
}: PianoRollProps) {
  const totalSteps = stepsPerBar * bars;
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId,
  );
  const selectedNotes = useMemo(
    () => notes.filter((note) => note.channelId === selectedChannelId),
    [notes, selectedChannelId],
  );

  const [snapStepSize, setSnapStepSize] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const initializedScrollRef = useRef(false);
  const isDraggingRef = useRef(false);

  const rafRef = useRef(0);
  const [scrollY, setScrollY] = useState(0);

  const labelWidth = 56;
  const rowHeight = 24;
  const timelineHeight = 20;
  const [scrollX, setScrollX] = useState(0);
  const [scrollClientW, setScrollClientW] = useState(0);
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

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));
  const snapStep = (step: number) => {
    const snapped = Math.round(step / snapStepSize) * snapStepSize;
    return clamp(snapped, 0, totalSteps - 1);
  };
  const getPitchIndex = (pitch: number) =>
    pitchRows.findIndex((item) => item.pitch === pitch);
  const isBlackKeyPitch = (pitch: number) => {
    const semitone = ((pitch % 12) + 12) % 12;
    return (
      semitone === 1 ||
      semitone === 3 ||
      semitone === 6 ||
      semitone === 8 ||
      semitone === 10
    );
  };
  const isPointerOnScrollbar = (
    event: React.PointerEvent<HTMLDivElement>,
    wrapper: HTMLDivElement,
  ) => {
    const rect = wrapper.getBoundingClientRect();
    const hasVertical = wrapper.offsetWidth > wrapper.clientWidth;
    const hasHorizontal = wrapper.offsetHeight > wrapper.clientHeight;
    const onVerticalScrollbar =
      hasVertical && event.clientX >= rect.left + wrapper.clientWidth;
    const onHorizontalScrollbar =
      hasHorizontal && event.clientY >= rect.top + wrapper.clientHeight;
    return onVerticalScrollbar || onHorizontalScrollbar;
  };

  const getGridPoint = (clientX: number, clientY: number) => {
    const scroll = scrollRef.current;
    if (!scroll) return null;
    const rect = scroll.getBoundingClientRect();
    const x = clientX - rect.left + scroll.scrollLeft;
    const y = clientY - rect.top + scroll.scrollTop;
    const step = clamp(Math.floor(x / stepWidth), 0, totalSteps - 1);
    const rowIndex = clamp(Math.floor(y / rowHeight), 0, pitchRows.length - 1);
    const pitch =
      pitchRows[rowIndex]?.pitch ??
      pitchRows[pitchRows.length - 1]?.pitch ??
      48;
    return { step, pitch };
  };

  const hitTestNote = (clientX: number, clientY: number) => {
    const scroll = scrollRef.current;
    if (!scroll) return null;
    const rect = scroll.getBoundingClientRect();
    const x = clientX - rect.left + scroll.scrollLeft;
    const y = clientY - rect.top + scroll.scrollTop;
    const rowIndex = clamp(Math.floor(y / rowHeight), 0, pitchRows.length - 1);
    const pitch = pitchRows[rowIndex]?.pitch;
    if (pitch === undefined) return null;
    const yInRow = y - rowIndex * rowHeight;
    if (yInRow < 2 || yInRow > 22) return null;
    for (let i = selectedNotes.length - 1; i >= 0; i--) {
      const note = selectedNotes[i];
      if (note.pitch !== pitch) continue;
      const noteLeft = note.startStep * stepWidth + 1;
      const noteWidth = Math.max(1, note.length) * stepWidth - 2;
      if (x >= noteLeft && x <= noteLeft + noteWidth) {
        return { note, isResize: x >= noteLeft + noteWidth - 8 };
      }
    }
    return null;
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
        const nextLength =
          drag.originLength + (snappedStep - drag.pointerStartStep);
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
            const overlapStep = !(
              noteStepEnd < minStep || noteStepStart > maxStep
            );
            const overlapPitch =
              note.pitch >= minPitch && note.pitch <= maxPitch;
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;
    if (isPointerOnScrollbar(event, wrapper)) return;

    if (event.button === 0) {
      const hit = hitTestNote(event.clientX, event.clientY);
      if (hit) {
        startDraggingNote(event, hit.note, hit.isResize ? "resize" : "move");
        return;
      }
      beginBoxSelection(event);
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const hit = hitTestNote(event.clientX, event.clientY);
    if (hit) {
      event.preventDefault();
      onDeleteNote(hit.note.id);
      onSelectionChange(selectedNoteIds.filter((id) => id !== hit.note.id));
    }
  };

  const seekToPointer = (clientX: number) => {
    const el = timelineRef.current;
    const scroll = scrollRef.current;
    if (!el || !scroll || !onSeek) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + scroll.scrollLeft;
    const step = clamp(Math.floor(x / stepWidth), 0, totalSteps - 1);
    onSeek(step);
  };

  const handleTimelinePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0 || !onSeek) return;
    event.preventDefault();
    seekToPointer(event.clientX);
    const onMove = (e: PointerEvent) => seekToPointer(e.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = scroll.clientWidth;
    const ch = scroll.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const sx = scroll.scrollLeft;
    const sy = scroll.scrollTop;
    const startRow = Math.floor(sy / rowHeight);
    const endRow = Math.min(
      pitchRows.length - 1,
      Math.ceil((sy + ch) / rowHeight),
    );
    const startStep = Math.floor(sx / stepWidth);
    const endStep = Math.min(totalSteps - 1, Math.ceil((sx + cw) / stepWidth));

    // Draw row backgrounds and cell grid
    for (let r = startRow; r <= endRow; r++) {
      const row = pitchRows[r];
      const y = r * rowHeight - sy;
      const isBlack = isBlackKeyPitch(row.pitch);
      const isAlt = r % 2 === 1;

      for (let s = startStep; s <= endStep; s++) {
        const x = s * stepWidth - sx;
        const isStepAlt = s % 2 === 1;
        if (isBlack) {
          ctx.fillStyle = isStepAlt ? "#232931" : "#20252d";
        } else {
          ctx.fillStyle = isStepAlt ? "#272d37" : "#242932";
        }
        if (isAlt && !isBlack) {
          // slight alt tint
          ctx.fillStyle = isStepAlt ? "#282e38" : "#252a33";
        }
        ctx.fillRect(x, y, stepWidth, rowHeight);
        // cell border right
        ctx.fillStyle = "#2a303a";
        ctx.fillRect(x + stepWidth - 1, y, 1, rowHeight);
      }
      // row border bottom
      ctx.fillStyle = "#2b313c";
      ctx.fillRect(0, y + rowHeight - 1, cw, 1);
    }

    // Bar guides
    for (let b = 0; b <= bars; b++) {
      const bx = b * stepsPerBar * stepWidth - sx;
      if (bx < -1 || bx > cw) continue;
      ctx.fillStyle =
        b === 0 ? "rgba(170,180,196,0.65)" : "rgba(116,126,143,0.35)";
      ctx.fillRect(bx, 0, 1, ch);
    }

    // Notes
    const noteColor = selectedChannel?.color ?? "#60a5fa";
    const selSet = selectedNoteIdSetRef.current;
    for (const note of selectedNotes) {
      const ri = getPitchIndex(note.pitch);
      if (ri < 0) continue;
      const ny = ri * rowHeight - sy + 2;
      const nx = note.startStep * stepWidth - sx + 1;
      const nw = Math.max(1, note.length) * stepWidth - 2;
      const nh = 20;
      if (ny + nh < 0 || ny > ch || nx + nw < 0 || nx > cw) continue;

      const isSel = selSet.has(note.id);
      ctx.fillStyle = noteColor;
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, 4);
      ctx.fill();

      if (isSel) {
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.35)";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.24)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Resize handle
      if (nw > 10) {
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        ctx.fillRect(nx + nw - 8, ny, 8, nh);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(nx + nw - 8, ny, 1, nh);
      }

      // Velocity text
      if (nw > 16) {
        ctx.fillStyle = "rgba(11,16,32,0.72)";
        ctx.font = "bold 10px sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(String(note.velocity), nx + 4, ny + nh / 2);
      }
    }

    // Selection box
    if (boxSelectUI) {
      const minS = Math.min(boxSelectUI.startStep, boxSelectUI.endStep);
      const maxS = Math.max(boxSelectUI.startStep, boxSelectUI.endStep);
      const spi = Math.max(0, getPitchIndex(boxSelectUI.startPitch));
      const epi = Math.max(0, getPitchIndex(boxSelectUI.endPitch));
      const topI = Math.min(spi, epi);
      const botI = Math.max(spi, epi);
      const bx = minS * stepWidth - sx;
      const bw = Math.max(1, (maxS - minS + 1) * stepWidth - 1);
      const by = topI * rowHeight - sy;
      const bh = (botI - topI + 1) * rowHeight;
      ctx.fillStyle = "rgba(251,191,36,0.12)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = "rgba(251,191,36,0.8)";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      ctx.setLineDash([]);
    }

    // Playhead
    if (playheadStep !== null) {
      const px = playheadStep * stepWidth - sx;
      if (px >= -2 && px <= cw) {
        ctx.fillStyle = "rgba(251,191,36,0.9)";
        ctx.fillRect(px, 0, 2, ch);
      }
    }
  }, [
    pitchRows,
    totalSteps,
    stepWidth,
    rowHeight,
    bars,
    stepsPerBar,
    selectedNotes,
    selectedChannel,
    boxSelectUI,
    playheadStep,
  ]);

  // Redraw on state changes
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawCanvas);
  }, [drawCanvas, selectedNoteIds]);

  // Scroll sync: update pitch labels and redraw canvas
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    setScrollClientW(scroll.clientWidth);
    const onScroll = () => {
      setScrollY(scroll.scrollTop);
      setScrollX(scroll.scrollLeft);
      setScrollClientW(scroll.clientWidth);
      const step = clamp(
        Math.floor(scroll.scrollLeft / stepWidth),
        0,
        totalSteps - 1,
      );
      onViewportStepChange(step);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawCanvas);
    };
    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => scroll.removeEventListener("scroll", onScroll);
  }, [stepWidth, totalSteps, onViewportStepChange, drawCanvas]);

  // Canvas resize observer
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawCanvas);
    });
    ro.observe(scroll);
    return () => ro.disconnect();
  }, [drawCanvas]);

  // Initial scroll to center around C5
  useEffect(() => {
    if (initializedScrollRef.current) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    const index = pitchRows.findIndex((row) => row.pitch === 72);
    if (index >= 0) {
      scroll.scrollTop = Math.max(0, (index - 10) * rowHeight);
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
            ) : (
              "No channel selected"
            )}
          </span>
          <span className="selected-count">
            Selected: {selectedNoteIds.length}
          </span>
        </div>
        <div className="right-group">
          <label className="snap-label">
            Snap
            <Select
              className="snap-select"
              classNames={{
                input: "snap-select-input",
                dropdown: "snap-select-dropdown",
                option: "snap-select-option",
              }}
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
        Click to add notes. Drag blank area for box-select. Drag note body to
        move selected notes, drag right handle to resize, right-click note to
        delete, Ctrl/Cmd+Click to multi-select.
      </div>

      <div className="piano-grid-wrapper">
        <div
          ref={timelineRef}
          className="piano-timeline"
          onPointerDown={handleTimelinePointerDown}
        >
          <div
            className="piano-timeline-inner"
            style={{ transform: `translateX(${-scrollX}px)` }}
          >
            {Array.from({ length: bars }, (_, i) => (
              <span
                key={i}
                className="piano-timeline-bar"
                style={{ left: i * stepsPerBar * stepWidth }}
              >
                {i + 1}
              </span>
            ))}
            {playheadStep !== null && (
              <div
                className="piano-timeline-playhead"
                style={{ left: playheadStep * stepWidth }}
              />
            )}
          </div>
        </div>
        <div className="piano-pitch-labels">
          <div style={{ transform: `translateY(${-scrollY}px)` }}>
            {pitchRows.map((row) => (
              <div
                key={row.pitch}
                className={`pitch-label ${isBlackKeyPitch(row.pitch) ? "is-black-key" : ""}`}
              >
                {row.label}
              </div>
            ))}
          </div>
        </div>
        <canvas ref={canvasRef} className="piano-canvas" />
        <div
          ref={scrollRef}
          className="piano-scroll"
          onPointerDown={handlePointerDown}
          onContextMenu={handleContextMenu}
        >
          <div
            style={{
              width: totalSteps * stepWidth,
              height: pitchRows.length * rowHeight,
            }}
          />
        </div>
      </div>
      <div
        className="piano-locator"
        onPointerDown={(e) => {
          const scroll = scrollRef.current;
          if (!scroll || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          const totalW = totalSteps * stepWidth;
          const vpLeft = (scrollX / totalW) * rect.width;
          const vpRight = vpLeft + (scroll.clientWidth / totalW) * rect.width;
          const px = e.clientX - rect.left;
          const onThumb = px >= vpLeft && px <= vpRight;
          const offset = onThumb
            ? px - vpLeft
            : ((scroll.clientWidth / totalW) * rect.width) / 2;
          if (!onThumb) {
            scroll.scrollLeft = Math.max(
              0,
              ((px - offset) / rect.width) * totalW,
            );
          }
          const onMove = (me: PointerEvent) => {
            const x = me.clientX - rect.left;
            scroll.scrollLeft = Math.max(
              0,
              ((x - offset) / rect.width) * totalW,
            );
          };
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      >
        <span
          className="piano-locator-viewport"
          style={{
            left: `${(scrollX / (totalSteps * stepWidth)) * 100}%`,
            width: `${(scrollClientW / (totalSteps * stepWidth)) * 100}%`,
          }}
        />
        {playheadStep !== null && (
          <span
            className="piano-locator-playhead"
            style={{ left: `${(playheadStep / totalSteps) * 100}%` }}
          />
        )}
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
        .piano-grid-wrapper {
          position: relative;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: 420px;
          border-radius: 8px;
          border: 1px solid #2f3540;
          background: #22262d;
          box-sizing: border-box;
          overflow: hidden;
        }
        .piano-locator {
          position: relative;
          height: 8px;
          margin-top: 4px;
          background: #1a1e26;
          border: 1px solid #2f3540;
          border-radius: 4px;
          cursor: pointer;
          overflow: hidden;
        }
        .piano-locator-viewport {
          position: absolute;
          top: 0;
          bottom: 0;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 2px;
        }
        .piano-locator-playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(251,191,36,0.9);
        }
        .piano-pitch-labels {
          position: absolute;
          left: 0;
          top: ${timelineHeight}px;
          bottom: 0;
          width: ${labelWidth}px;
          overflow: hidden;
          z-index: 3;
          pointer-events: none;
        }
        .pitch-label {
          border-right: 1px solid #313845;
          display: grid;
          place-items: center;
          color: #cdd3dd;
          font-size: 11px;
          background: #2a2f37;
          user-select: none;
          height: ${rowHeight}px;
          box-sizing: border-box;
        }
        .pitch-label.is-black-key {
          background: #20252c;
          color: #9ea7b6;
        }
        .piano-canvas {
          position: absolute;
          left: ${labelWidth}px;
          top: ${timelineHeight}px;
          pointer-events: none;
          z-index: 1;
        }
        .piano-scroll {
          position: absolute;
          left: ${labelWidth}px;
          top: ${timelineHeight}px;
          right: 0;
          bottom: 0;
          overflow-y: auto;
          overflow-x: scroll;
          z-index: 2;
          cursor: pointer;
        }
        .piano-scroll::-webkit-scrollbar {
          width: 8px;
          height: 0;
        }
        .piano-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .piano-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .piano-timeline {
          position: absolute;
          left: ${labelWidth}px;
          top: 0;
          right: 0;
          height: ${timelineHeight}px;
          background: #1e2228;
          border-bottom: 1px solid #2f3540;
          z-index: 4;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }
        .piano-timeline-inner {
          position: relative;
          height: 100%;
        }
        .piano-timeline-bar {
          position: absolute;
          top: 0;
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: 4px;
          font-size: 10px;
          color: #6b7280;
          border-left: 1px solid rgba(116,126,143,0.35);
          box-sizing: border-box;
        }
        .piano-timeline-playhead {
          position: absolute;
          top: 0;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: ${timelineHeight}px solid rgba(251,191,36,0.9);
          margin-left: -4px;
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
            height: 360px;
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
          .piano-grid-wrapper {
            height: 300px;
          }
        }
        @media (max-width: 520px) {
          .hint {
            display: none;
          }
          .piano-grid-wrapper {
            height: 260px;
          }
        }
      `}</style>
    </div>
  );
}
