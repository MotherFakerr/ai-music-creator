import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconGripVertical,
  IconHeadphones,
  IconPencil,
  IconPlus,
  IconTrash,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";
import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";
import type { SequencerChannel } from "./types";

export interface ChannelRackProps {
  channels: SequencerChannel[];
  stepsPerBar: number;
  selectedChannelId: string | null;
  isStepEnabled: (channelId: string, step: number) => boolean;
  isStepEditable: (channelId: string) => boolean;
  onSelectChannel: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleSolo: (channelId: string) => void;
  onSetVolume: (channelId: string, volume: number) => void;
  onSetInstrument: (channelId: string, instrument: EN_INSTRUMENT_TYPE) => void;
  onAddChannel: () => void;
  onRemoveChannel: (channelId: string) => void;
  onRenameChannel: (channelId: string, name: string) => void;
  onMoveChannel: (channelId: string, newIndex: number) => void;
  onToggleStep: (channelId: string, step: number) => void;
}

function SortableChannelRow({
  channel,
  stepsPerBar,
  isSelected,
  canEditStep,
  draftName,
  onDraftNameChange,
  commitName,
  onSelectChannel,
  setEditingChannelId,
  editingChannelId,
  isStepEnabled,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onSetInstrument,
  onRemoveChannel,
  onRenameChannel,
  onToggleStep,
}: {
  channel: SequencerChannel;
  stepsPerBar: number;
  isSelected: boolean;
  canEditStep: boolean;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  commitName: (fallback: string) => void;
  onSelectChannel: () => void;
  setEditingChannelId: (id: string | null) => void;
  editingChannelId: string | null;
  isStepEnabled: (step: number) => boolean;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSetVolume: (volume: number) => void;
  onSetInstrument: (instrument: EN_INSTRUMENT_TYPE) => void;
  onRemoveChannel: () => void;
  onRenameChannel: (name: string) => void;
  onToggleStep: (step: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingChannelId === channel.id;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`channel-row ${isSelected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""}`}
    >
      <div className="channel-drag-handle" title="拖动排序" {...attributes} {...listeners}>
        <IconGripVertical size={14} />
      </div>
      <div
        className="channel-name-wrap"
        style={{ borderColor: channel.color }}
        onClick={onSelectChannel}
      >
        <span className="channel-dot" style={{ background: channel.color }} />
        {isEditing ? (
          <input
            ref={inputRef}
            className="channel-name-input"
            value={draftName}
            onBlur={() => {
              commitName(channel.name);
              setEditingChannelId(null);
            }}
            onChange={(event) => onDraftNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitName(channel.name);
                setEditingChannelId(null);
                (event.currentTarget as HTMLInputElement).blur();
              } else if (event.key === "Escape") {
                onDraftNameChange(channel.name);
                setEditingChannelId(null);
                (event.currentTarget as HTMLInputElement).blur();
              }
            }}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <>
            <span className="channel-name-text">{draftName || channel.name}</span>
            <button
              type="button"
              className="channel-edit-btn"
              title="编辑名称"
              onClick={(event) => {
                event.stopPropagation();
                onSelectChannel();
                setEditingChannelId(channel.id);
              }}
            >
              <IconPencil size={14} />
            </button>
          </>
        )}
      </div>
      <button
        className={`mute-btn ${channel.muted ? "is-muted" : ""}`}
        onClick={onToggleMute}
        title={channel.muted ? "Unmute" : "Mute"}
      >
        {channel.muted ? (
          <IconVolumeOff size={14} />
        ) : (
          <IconVolume size={14} />
        )}
      </button>
      <button
        className={`solo-btn ${channel.solo ? "is-solo" : ""}`}
        onClick={onToggleSolo}
        title={channel.solo ? "Solo on" : "Solo off"}
      >
        <IconHeadphones size={14} />
      </button>
      <label className="volume-wrap">
        <span>Vol</span>
        <input
          type="range"
          min={0}
          max={100}
          value={channel.volume}
          onChange={(event) => onSetVolume(Number(event.target.value))}
        />
        <span className="volume-value">{channel.volume}</span>
      </label>
      <label className="instrument-wrap">
        <span>Inst</span>
        <select
          value={channel.instrument}
          onChange={(event) =>
            onSetInstrument(event.target.value as EN_INSTRUMENT_TYPE)
          }
        >
          <option value={EN_INSTRUMENT_TYPE.DRUM}>Drum</option>
          <option value={EN_INSTRUMENT_TYPE.PIANO}>Piano</option>
          <option value={EN_INSTRUMENT_TYPE.SYNTH}>Synth</option>
          <option value={EN_INSTRUMENT_TYPE.GUITAR}>Guitar</option>
          <option value={EN_INSTRUMENT_TYPE.DISTORTION_GUITAR}>Dist Guitar</option>
        </select>
      </label>
      <div className="step-grid">
        {Array.from({ length: stepsPerBar }, (_, step) => {
          const enabled = isStepEnabled(step);
          return (
            <button
              key={step}
              className={`step-btn ${enabled ? "is-enabled" : ""}`}
              onClick={() => onToggleStep(step)}
              disabled={!canEditStep}
              title={
                canEditStep
                  ? `${channel.name} step ${step + 1}`
                  : `${channel.name} step preview (locked by piano roll edits)`
              }
              style={
                enabled
                  ? {
                      background: channel.color,
                      boxShadow: `0 0 0 1px ${channel.color}55, 0 0 8px ${channel.color}66`,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      <button
        className="remove-btn"
        onClick={onRemoveChannel}
        title={`Remove ${channel.name}`}
      >
        <IconTrash size={14} />
      </button>
    </div>
  );
}

export function ChannelRack({
  channels,
  stepsPerBar,
  selectedChannelId,
  isStepEnabled,
  isStepEditable,
  onSelectChannel,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onSetInstrument,
  onAddChannel,
  onRemoveChannel,
  onRenameChannel,
  onMoveChannel,
  onToggleStep,
}: ChannelRackProps) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    setDraftNames((prev) => {
      const next: Record<string, string> = {};
      channels.forEach((channel) => {
        const prevValue = prev[channel.id];
        const keepDraft = editingChannelId === channel.id && prevValue !== undefined;
        next[channel.id] = keepDraft ? prevValue : channel.name;
      });
      return next;
    });
  }, [channels, editingChannelId]);

  const commitName = (channelId: string, fallback: string) => {
    const draft = (draftNames[channelId] ?? fallback).trim();
    const nextName = draft || fallback;
    setDraftNames((prev) => ({
      ...prev,
      [channelId]: nextName,
    }));
    onRenameChannel(channelId, nextName);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = channels.findIndex((c) => c.id === active.id);
    const newIndex = channels.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onMoveChannel(active.id as string, newIndex);
  };

  const channelIds = channels.map((c) => c.id);

  return (
    <div className="channel-rack">
      <div className="channel-rack-header">
        <h3>Channel Rack</h3>
        <button className="header-btn" onClick={onAddChannel} title="Add channel">
          <IconPlus size={14} />
          <span>Add Channel</span>
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="channel-rack-list">
          <SortableContext
            items={channelIds}
            strategy={verticalListSortingStrategy}
          >
            {channels.map((channel) => (
              <SortableChannelRow
                key={channel.id}
                channel={channel}
                stepsPerBar={stepsPerBar}
                isSelected={channel.id === selectedChannelId}
                canEditStep={isStepEditable(channel.id)}
                draftName={draftNames[channel.id] ?? channel.name}
                onDraftNameChange={(value) =>
                  setDraftNames((prev) => ({ ...prev, [channel.id]: value }))
                }
                commitName={(fallback) => commitName(channel.id, fallback)}
                onSelectChannel={() => onSelectChannel(channel.id)}
                setEditingChannelId={setEditingChannelId}
                editingChannelId={editingChannelId}
                isStepEnabled={(step) => isStepEnabled(channel.id, step)}
                onToggleMute={() => onToggleMute(channel.id)}
                onToggleSolo={() => onToggleSolo(channel.id)}
                onSetVolume={(volume) => onSetVolume(channel.id, volume)}
                onSetInstrument={(instrument) =>
                  onSetInstrument(channel.id, instrument)
                }
                onRemoveChannel={() => onRemoveChannel(channel.id)}
                onRenameChannel={(name) => onRenameChannel(channel.id, name)}
                onToggleStep={(step) => onToggleStep(channel.id, step)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <style>{`
        .channel-rack {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 10px;
          background: #11131a;
        }
        .channel-rack-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .channel-rack-header h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #e5e7eb;
        }
        .channel-rack-list {
          display: grid;
          gap: 4px;
        }
        .channel-row {
          display: grid;
          grid-template-columns: 24px 150px 56px 50px 170px 170px 1fr 52px;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border-radius: 6px;
          background: #181b25;
        }
        .channel-row.is-selected {
          outline: 1px solid rgba(148, 163, 184, 0.5);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
        }
        .channel-row.is-dragging {
          opacity: 0.85;
          z-index: 1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .channel-drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          color: #64748b;
          padding: 2px;
          border-radius: 4px;
          touch-action: none;
        }
        .channel-drag-handle:active {
          cursor: grabbing;
        }
        .channel-drag-handle:hover {
          color: #94a3b8;
        }
        .channel-name-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #374151;
          background: #101217;
          color: #f3f4f6;
          border-radius: 4px;
          padding: 3px 6px;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .channel-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
        }
        .channel-name-text {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          color: #e5e7eb;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .channel-name-input {
          border: none;
          outline: none;
          background: transparent;
          color: #e5e7eb;
          flex: 1;
          min-width: 0;
          font-size: 12px;
        }
        .channel-edit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border: none;
          background: transparent;
          color: #64748b;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .channel-name-wrap:hover .channel-edit-btn {
          opacity: 1;
        }
        .channel-edit-btn:hover {
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.06);
        }
        .mute-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #374151;
          background: #111827;
          color: #cbd5e1;
          border-radius: 4px;
          padding: 3px 6px;
          cursor: pointer;
        }
        .mute-btn.is-muted {
          background: #1f2937;
          color: #fca5a5;
          border-color: #ef4444;
        }
        .solo-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #374151;
          background: #111827;
          color: #cbd5e1;
          border-radius: 4px;
          padding: 3px 6px;
          cursor: pointer;
        }
        .solo-btn.is-solo {
          background: #422006;
          color: #fde68a;
          border-color: #f59e0b;
        }
        .volume-wrap {
          display: inline-grid;
          grid-template-columns: 24px 1fr 26px;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 10px;
        }
        .volume-wrap input[type="range"] {
          width: 100%;
        }
        .volume-value {
          color: #e2e8f0;
          text-align: right;
        }
        .instrument-wrap {
          display: inline-grid;
          grid-template-columns: 28px 1fr;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 10px;
        }
        .instrument-wrap select {
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 4px;
          padding: 2px 5px;
          min-width: 0;
          font-size: 11px;
        }
        .step-grid {
          display: grid;
          grid-template-columns: repeat(16, minmax(12px, 1fr));
          gap: 3px;
        }
        .step-btn {
          height: 14px;
          border: 1px solid #374151;
          background: #0b1020;
          border-radius: 3px;
          cursor: pointer;
        }
        .step-btn:disabled {
          cursor: default;
          opacity: 0.72;
        }
        .step-btn.is-enabled {
          border-color: transparent;
        }
        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #7f1d1d;
          background: #3f0f12;
          color: #fecaca;
          border-radius: 4px;
          padding: 3px 6px;
          cursor: pointer;
        }
        .header-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
        }
        @media (max-width: 1024px) {
          .channel-row {
            grid-template-columns: 24px 1fr;
          }
        }
      `}</style>
    </div>
  );
}
