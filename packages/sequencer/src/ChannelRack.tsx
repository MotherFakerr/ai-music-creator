import { useEffect, useMemo, useRef, useState } from "react";
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
import { ActionIcon, Button, Select, TextInput } from "@mantine/core";
import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";
import { VolumeKnob } from "@ai-music-creator/ui";
import type { PianoRollNote, SequencerChannel } from "./types";

export interface ChannelRackProps {
  channels: SequencerChannel[];
  stepsPerBar: number;
  bars: number;
  notes: PianoRollNote[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleSolo: (channelId: string) => void;
  onSetVolume: (channelId: string, volume: number) => void;
  onSetInstrument: (channelId: string, instrument: EN_INSTRUMENT_TYPE) => void;
  onAddChannel: () => void;
  onRemoveChannel: (channelId: string) => void;
  onRenameChannel: (channelId: string, name: string) => void;
  onMoveChannel: (channelId: string, newIndex: number) => void;
}

function SortableChannelRow({
  channel,
  stepsPerBar,
  bars,
  notes,
  isSelected,
  draftName,
  onDraftNameChange,
  commitName,
  onSelectChannel,
  setEditingChannelId,
  editingChannelId,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onSetInstrument,
  onRemoveChannel,
  onRenameChannel,
}: {
  channel: SequencerChannel;
  stepsPerBar: number;
  bars: number;
  notes: PianoRollNote[];
  isSelected: boolean;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  commitName: (fallback: string) => void;
  onSelectChannel: () => void;
  setEditingChannelId: (id: string | null) => void;
  editingChannelId: string | null;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSetVolume: (volume: number) => void;
  onSetInstrument: (instrument: EN_INSTRUMENT_TYPE) => void;
  onRemoveChannel: () => void;
  onRenameChannel: (name: string) => void;
}) {
  const PREVIEW_LANES = 10;
  const PREVIEW_PADDING_Y = 2;
  const PREVIEW_LANE_SPACING = 2;
  const PREVIEW_NOTE_HEIGHT = 2;
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
  const stopRowSelect: React.MouseEventHandler<HTMLElement> = (event) => {
    event.stopPropagation();
  };
  const stopRowSelectPointer: React.PointerEventHandler<HTMLElement> = (event) => {
    event.stopPropagation();
  };
  const totalSteps = Math.max(1, stepsPerBar * bars);
  const channelNotes = useMemo(
    () => notes.filter((note) => note.channelId === channel.id),
    [notes, channel.id],
  );
  const previewNotes = useMemo(
    () =>
      channelNotes.map((note) => {
        const safeLength = Math.max(1, note.length);
        const normalized = Math.max(0, Math.min(127, note.pitch)) / 127;
        const lane = Math.max(0, Math.min(PREVIEW_LANES - 1, Math.round(normalized * (PREVIEW_LANES - 1))));
        return {
          id: note.id,
          left: (note.startStep / totalSteps) * 100,
          width: Math.max((safeLength / totalSteps) * 100, 0.8),
          laneTop:
            PREVIEW_PADDING_Y + (PREVIEW_LANES - 1 - lane) * PREVIEW_LANE_SPACING,
          velocityOpacity: 0.45 + (Math.max(1, Math.min(127, note.velocity)) / 127) * 0.5,
        };
      }),
    [channelNotes, totalSteps],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`channel-row ${isSelected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""}`}
      onClick={onSelectChannel}
    >
      <div
        className="channel-drag-handle"
        title="拖动排序"
        onClick={stopRowSelect}
        onPointerDown={stopRowSelectPointer}
        {...attributes}
        {...listeners}
      >
        <IconGripVertical size={14} />
      </div>
      <div
        className="channel-name-wrap"
        style={{ borderColor: channel.color }}
        onClick={onSelectChannel}
      >
        <span className="channel-dot" style={{ background: channel.color }} />
        {isEditing ? (
          <TextInput
            ref={inputRef}
            className="channel-name-text-input"
            classNames={{ input: "channel-name-input" }}
            size="xs"
            variant="unstyled"
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
            <ActionIcon
              type="button"
              className="channel-edit-btn"
              unstyled
              size="xs"
              variant="subtle"
              title="编辑名称"
              onClick={(event) => {
                event.stopPropagation();
                onSelectChannel();
                setEditingChannelId(channel.id);
              }}
            >
              <IconPencil size={14} />
            </ActionIcon>
          </>
        )}
      </div>
      <ActionIcon
        className={`mute-btn ${channel.muted ? "is-muted" : ""}`}
        unstyled
        size="sm"
        variant="default"
        onClick={(event) => {
          event.stopPropagation();
          onToggleMute();
        }}
        onPointerDown={stopRowSelectPointer}
        title={channel.muted ? "Unmute" : "Mute"}
      >
        {channel.muted ? (
          <IconVolumeOff size={14} />
        ) : (
          <IconVolume size={14} />
        )}
      </ActionIcon>
      <ActionIcon
        className={`solo-btn ${channel.solo ? "is-solo" : ""}`}
        unstyled
        size="sm"
        variant="default"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSolo();
        }}
        onPointerDown={stopRowSelectPointer}
        title={channel.solo ? "Solo on" : "Solo off"}
      >
        <IconHeadphones size={15} />
      </ActionIcon>
      <label
        className="volume-wrap"
        onClick={stopRowSelect}
        onPointerDown={stopRowSelectPointer}
      >
        <span>Vol</span>
        <VolumeKnob value={channel.volume} onChange={onSetVolume} diameter={30} />
      </label>
      <label
        className="instrument-wrap"
        onClick={stopRowSelect}
        onPointerDown={stopRowSelectPointer}
      >
        <span className="instrument-label">Inst</span>
        <Select
          className="instrument-select"
          classNames={{ input: "rack-select-input", dropdown: "rack-select-dropdown", option: "rack-select-option" }}
          size="xs"
          checkIconPosition="right"
          data={[
            { value: EN_INSTRUMENT_TYPE.DRUM, label: "Drum" },
            { value: EN_INSTRUMENT_TYPE.PIANO, label: "Piano" },
            { value: EN_INSTRUMENT_TYPE.SYNTH, label: "Synth" },
            { value: EN_INSTRUMENT_TYPE.GUITAR, label: "Guitar" },
            { value: EN_INSTRUMENT_TYPE.DISTORTION_GUITAR, label: "Dist Guitar" },
          ]}
          value={channel.instrument}
          onChange={(value) => {
            if (!value) {
              return;
            }
            onSetInstrument(value as EN_INSTRUMENT_TYPE);
          }}
        />
      </label>
      <div
        className={`piano-mini-preview ${isSelected ? "is-selected" : ""}`}
        title={`${channel.name} piano roll preview`}
        style={{ "--preview-accent": channel.color } as React.CSSProperties}
      >
        <div className="preview-grid-lines">
          {Array.from({ length: totalSteps + 1 }, (_, index) => (
            <span
              key={`line-${index}`}
              className={`preview-line ${
                index % stepsPerBar === 0 ? "is-bar" : index % 4 === 0 ? "is-beat" : ""
              }`}
              style={{ left: `${(index / totalSteps) * 100}%` }}
            />
          ))}
        </div>
        <div className="preview-pitch-lines">
          {Array.from({ length: PREVIEW_LANES }, (_, index) => (
            <span
              key={`pitch-${index}`}
              className="preview-pitch-line"
              style={{ top: `${PREVIEW_PADDING_Y + index * PREVIEW_LANE_SPACING}px` }}
            />
          ))}
        </div>
        <div className="preview-notes">
          {previewNotes.map((note) => (
            <span
              key={note.id}
              className="preview-note"
              style={{
                left: `${note.left}%`,
                width: `${note.width}%`,
                top: `${note.laneTop}px`,
                opacity: note.velocityOpacity,
                background: channel.color,
              }}
            />
          ))}
        </div>
      </div>
      <ActionIcon
        className="remove-btn"
        unstyled
        size="sm"
        variant="filled"
        color="red"
        onClick={(event) => {
          event.stopPropagation();
          onRemoveChannel();
        }}
        onPointerDown={stopRowSelectPointer}
        title={`Remove ${channel.name}`}
      >
        <IconTrash size={14} />
      </ActionIcon>
    </div>
  );
}

export function ChannelRack({
  channels,
  stepsPerBar,
  bars,
  notes,
  selectedChannelId,
  onSelectChannel,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onSetInstrument,
  onAddChannel,
  onRemoveChannel,
  onRenameChannel,
  onMoveChannel,
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
        <Button
          className="header-btn"
          unstyled
          size="xs"
          variant="default"
          onClick={onAddChannel}
          title="Add channel"
          leftSection={<IconPlus size={14} />}
        >
          <span>Add Channel</span>
        </Button>
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
                bars={bars}
                notes={notes}
                isSelected={channel.id === selectedChannelId}
                draftName={draftNames[channel.id] ?? channel.name}
                onDraftNameChange={(value) =>
                  setDraftNames((prev) => ({ ...prev, [channel.id]: value }))
                }
                commitName={(fallback) => commitName(channel.id, fallback)}
                onSelectChannel={() => onSelectChannel(channel.id)}
                setEditingChannelId={setEditingChannelId}
                editingChannelId={editingChannelId}
                onToggleMute={() => onToggleMute(channel.id)}
                onToggleSolo={() => onToggleSolo(channel.id)}
                onSetVolume={(volume) => onSetVolume(channel.id, volume)}
                onSetInstrument={(instrument) =>
                  onSetInstrument(channel.id, instrument)
                }
                onRemoveChannel={() => onRemoveChannel(channel.id)}
                onRenameChannel={(name) => onRenameChannel(channel.id, name)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <style>{`
        .channel-rack {
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
          grid-template-columns: 24px 150px 48px 48px auto 170px 1fr 48px;
          align-items: center;
          gap: 6px;
          padding: 4px 6px;
          border-radius: 6px;
          background: #181b25;
          position: relative;
        }
        .channel-row.is-selected {
          outline: 1px solid rgba(96, 165, 250, 0.55);
          box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.2);
          background: linear-gradient(90deg, rgba(96, 165, 250, 0.14) 0, rgba(24, 27, 37, 1) 36px);
        }
        .channel-row.is-selected::before {
          content: "";
          position: absolute;
          left: 0;
          top: 2px;
          bottom: 2px;
          width: 3px;
          border-radius: 3px;
          background: #60a5fa;
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
          min-width: 0;
          height: 30px;
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
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          border-radius: var(--control-radius);
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
          border: 1px solid var(--control-border);
          background: var(--control-bg);
          color: var(--control-fg);
          border-radius: var(--control-radius);
          height: 30px;
          padding: 0;
          cursor: pointer;
        }
        .mute-btn:hover {
          background: var(--control-hover-bg);
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
          border: 1px solid var(--control-border);
          background: var(--control-bg);
          color: var(--control-fg);
          border-radius: var(--control-radius);
          height: 30px;
          padding: 0;
          cursor: pointer;
        }
        .solo-btn:hover {
          background: var(--control-hover-bg);
        }
        .solo-btn.is-solo {
          background: #422006;
          color: #fde68a;
          border-color: #f59e0b;
        }
        .volume-wrap {
          display: inline-grid;
          grid-template-columns: 22px 36px;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 10px;
        }
        .instrument-wrap {
          display: inline-grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 10px;
        }
        .instrument-label {
          justify-self: end;
          text-align: right;
        }
        .instrument-select {
          min-width: 0;
        }
        .rack-select-input {
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 4px;
          padding: 0 20px 0 6px;
          min-width: 0;
          font-size: 11px;
        }
        .rack-select-dropdown {
          background: #0f172a;
          border-color: #334155;
        }
        .rack-select-option {
          color: #e2e8f0;
        }
        .piano-mini-preview {
          position: relative;
          height: 30px;
          border: 1px solid #334155;
          border-radius: 4px;
          background: #0b1020;
          overflow: hidden;
        }
        .piano-mini-preview.is-selected {
          border-color: var(--preview-accent, #60a5fa);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--preview-accent, #60a5fa) 45%, transparent);
        }
        .preview-grid-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .preview-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(148, 163, 184, 0.12);
        }
        .preview-line.is-beat {
          background: rgba(148, 163, 184, 0.2);
        }
        .preview-line.is-bar {
          background: rgba(203, 213, 225, 0.4);
        }
        .preview-pitch-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .preview-pitch-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(148, 163, 184, 0.08);
        }
        .preview-notes {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .preview-note {
          position: absolute;
          height: 2px;
          border-radius: 1px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
        }
        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--control-danger-border);
          background: var(--control-danger-bg);
          color: var(--control-danger-fg);
          border-radius: var(--control-radius);
          height: 30px;
          cursor: pointer;
        }
        .header-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--control-border);
          background: var(--control-bg);
          color: var(--control-fg);
          border-radius: var(--control-radius);
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
        }
        .header-btn:hover {
          background: var(--control-hover-bg);
        }
        @media (max-width: 900px) {
          .channel-row {
            grid-template-columns: 20px auto minmax(0, 1fr) 42px 42px;
            grid-template-areas:
              "drag name name mute solo"
              "drag preview preview preview preview"
              "drag volume inst remove remove";
            row-gap: 6px;
            column-gap: 6px;
            padding: 6px;
          }
          .channel-drag-handle {
            grid-area: drag;
          }
          .channel-name-wrap {
            grid-area: name;
          }
          .mute-btn {
            grid-area: mute;
          }
          .solo-btn {
            grid-area: solo;
          }
          .piano-mini-preview {
            grid-area: preview;
          }
          .volume-wrap {
            grid-area: volume;
          }
          .instrument-wrap {
            grid-area: inst;
          }
          .remove-btn {
            grid-area: remove;
            align-self: stretch;
          }
          .channel-rack-header h3 {
            font-size: 12px;
          }
          .header-btn span {
            display: none;
          }
        }
        @media (max-width: 640px) {
          .channel-rack {
            padding: 6px;
          }
          .channel-row {
            grid-template-columns: 18px auto minmax(0, 1fr) 38px 38px;
          }
          .volume-wrap,
          .instrument-wrap {
            font-size: 9px;
          }
          .channel-name-text,
          .channel-name-input {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
