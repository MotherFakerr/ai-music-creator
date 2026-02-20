import { useRef } from "react";

export interface VolumeKnobProps {
  value: number;
  onChange: (value: number) => void;
  diameter: number;
  title?: string;
}

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

function clampVolume(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function VolumeKnob({ value, onChange, diameter, title }: VolumeKnobProps) {
  const safeDiameter = Math.max(24, Math.round(diameter));
  const pointerHeight = Math.max(8, Math.round(safeDiameter * 0.34));
  const pointerTop = Math.max(2, Math.round(safeDiameter * 0.08));
  const ringInset = Math.max(3, Math.round(safeDiameter * 0.1));
  const valueFontSize = Math.max(8, Math.round(safeDiameter * 0.26));
  const dragRef = useRef<{ pointerId: number; startY: number; startVolume: number } | null>(null);

  const angle = MIN_ANGLE + (clampVolume(value) / 100) * (MAX_ANGLE - MIN_ANGLE);

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startVolume: clampVolume(value),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    const sensitivity = event.shiftKey ? 0.2 : 0.6;
    const delta = (drag.startY - event.clientY) * sensitivity;
    onChange(clampVolume(drag.startVolume + delta));
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div
      role="slider"
      aria-label="Channel volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampVolume(value)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange(clampVolume(value + (event.deltaY < 0 ? 1 : -1)));
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onChange(100);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowRight") {
          event.preventDefault();
          onChange(clampVolume(value + 1));
        } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
          event.preventDefault();
          onChange(clampVolume(value - 1));
        } else if (event.key === "Home") {
          event.preventDefault();
          onChange(0);
        } else if (event.key === "End") {
          event.preventDefault();
          onChange(100);
        }
      }}
      title={title ?? `音量 ${clampVolume(value)}%（拖拽调节，Shift 精调）`}
      style={{
        width: safeDiameter,
        height: safeDiameter,
        borderRadius: 999,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #334155",
        background: "radial-gradient(circle at 35% 30%, #263249 0%, #0f172a 72%)",
        boxShadow: "inset 0 0 0 1px rgba(148, 163, 184, 0.14)",
        cursor: "ns-resize",
        userSelect: "none",
        outline: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: ringInset,
          borderRadius: 999,
          border: "1px solid rgba(148, 163, 184, 0.26)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: safeDiameter / 2 - 1,
          top: pointerTop,
          width: 2,
          height: pointerHeight,
          borderRadius: 2,
          background: "#60a5fa",
          transform: `rotate(${angle}deg)`,
          transformOrigin: `50% ${safeDiameter / 2 - pointerTop}px`,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          color: "#e2e8f0",
          fontSize: valueFontSize,
          fontWeight: 600,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          borderRadius: 999,
          border: "1px solid rgba(148, 163, 184, 0.26)",
          background: "rgba(15, 23, 42, 0.72)",
          padding: "1px 3px",
          pointerEvents: "none",
        }}
      >
        {clampVolume(value)}
      </span>
    </div>
  );
}
