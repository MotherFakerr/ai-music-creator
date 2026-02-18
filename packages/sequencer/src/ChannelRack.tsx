import { useEffect, useState } from "react";
import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";
import type { SequencerChannel } from "./types";

export interface ChannelRackProps {
  channels: SequencerChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleSolo: (channelId: string) => void;
  onSetVolume: (channelId: string, volume: number) => void;
  onSetInstrument: (channelId: string, instrument: EN_INSTRUMENT_TYPE) => void;
  onAddChannel: () => void;
  onRemoveChannel: (channelId: string) => void;
  onRenameChannel: (channelId: string, name: string) => void;
  onMoveChannel: (channelId: string, direction: "up" | "down") => void;
  onToggleStep: (channelId: string, step: number) => void;
}

export function ChannelRack({
  channels,
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
  onToggleStep,
}: ChannelRackProps) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

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

  return (
    <div className="channel-rack">
      <div className="channel-rack-header">
        <h3>Channel Rack</h3>
        <button className="header-btn" onClick={onAddChannel}>
          + Add Channel
        </button>
      </div>
      <div className="channel-rack-list">
        {channels.map((channel) => {
          const isSelected = channel.id === selectedChannelId;
          return (
            <div
              key={channel.id}
              className={`channel-row ${isSelected ? "is-selected" : ""}`}
            >
              <div
                className="channel-name-wrap"
                style={{ borderColor: channel.color }}
                onClick={() => onSelectChannel(channel.id)}
              >
                <span className="channel-dot" style={{ background: channel.color }} />
                <input
                  className="channel-name-input"
                  value={draftNames[channel.id] ?? channel.name}
                  onFocus={() => {
                    onSelectChannel(channel.id);
                    setEditingChannelId(channel.id);
                  }}
                  onBlur={() => {
                    if (editingChannelId === channel.id) {
                      setEditingChannelId(null);
                    }
                  }}
                  onChange={(event) =>
                    setDraftNames((prev) => ({
                      ...prev,
                      [channel.id]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitName(channel.id, channel.name);
                      setEditingChannelId(null);
                      (event.currentTarget as HTMLInputElement).blur();
                    } else if (event.key === "Escape") {
                      setDraftNames((prev) => ({
                        ...prev,
                        [channel.id]: channel.name,
                      }));
                      setEditingChannelId(null);
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
                <button
                  className="rename-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    commitName(channel.id, channel.name);
                  }}
                >
                  Rename
                </button>
              </div>
              <button
                className={`mute-btn ${channel.muted ? "is-muted" : ""}`}
                onClick={() => onToggleMute(channel.id)}
              >
                {channel.muted ? "Muted" : "On"}
              </button>
              <button
                className={`solo-btn ${channel.solo ? "is-solo" : ""}`}
                onClick={() => onToggleSolo(channel.id)}
              >
                {channel.solo ? "Solo" : "S"}
              </button>
              <label className="volume-wrap">
                <span>Vol</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={channel.volume}
                  onChange={(event) => onSetVolume(channel.id, Number(event.target.value))}
                />
                <span className="volume-value">{channel.volume}</span>
              </label>
              <label className="instrument-wrap">
                <span>Inst</span>
                <select
                  value={channel.instrument}
                  onChange={(event) =>
                    onSetInstrument(channel.id, event.target.value as EN_INSTRUMENT_TYPE)
                  }
                >
                  <option value={EN_INSTRUMENT_TYPE.DRUM}>Drum</option>
                  <option value={EN_INSTRUMENT_TYPE.PIANO}>Piano</option>
                  <option value={EN_INSTRUMENT_TYPE.SYNTH}>Synth</option>
                  <option value={EN_INSTRUMENT_TYPE.GUITAR}>Guitar</option>
                  <option value={EN_INSTRUMENT_TYPE.DISTORTION_GUITAR}>Dist Guitar</option>
                </select>
              </label>
              <div className="move-wrap">
                <button
                  className="move-btn"
                  onClick={() => onMoveChannel(channel.id, "up")}
                  title={`Move ${channel.name} up`}
                >
                  ↑
                </button>
                <button
                  className="move-btn"
                  onClick={() => onMoveChannel(channel.id, "down")}
                  title={`Move ${channel.name} down`}
                >
                  ↓
                </button>
              </div>
              <div className="step-grid">
                {channel.steps.map((step) => (
                  <button
                    key={step.step}
                    className={`step-btn ${step.enabled ? "is-enabled" : ""}`}
                    onClick={() => onToggleStep(channel.id, step.step)}
                    title={`${channel.name} step ${step.step + 1}`}
                    style={
                      step.enabled
                        ? {
                            background: channel.color,
                            boxShadow: `0 0 0 1px ${channel.color}55, 0 0 8px ${channel.color}66`,
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
              <button
                className="remove-btn"
                onClick={() => onRemoveChannel(channel.id)}
                title={`Remove ${channel.name}`}
              >
                Del
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        .channel-rack {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px;
          background: #11131a;
        }
        .channel-rack-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .channel-rack-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
        }
        .channel-rack-list {
          display: grid;
          gap: 8px;
        }
        .channel-row {
          display: grid;
          grid-template-columns: 220px 56px 50px 170px 170px 58px 1fr 52px;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 8px;
          background: #181b25;
        }
        .channel-row.is-selected {
          outline: 1px solid rgba(148, 163, 184, 0.5);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
        }
        .channel-name-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #374151;
          background: #101217;
          color: #f3f4f6;
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .channel-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
        }
        .channel-name-input {
          border: none;
          outline: none;
          background: transparent;
          color: #e5e7eb;
          width: 100%;
          min-width: 0;
          font-size: 13px;
        }
        .rename-btn {
          border: 1px solid #334155;
          background: #0f172a;
          color: #cbd5e1;
          border-radius: 6px;
          padding: 3px 7px;
          cursor: pointer;
          font-size: 11px;
          line-height: 1.2;
        }
        .mute-btn {
          border: 1px solid #374151;
          background: #111827;
          color: #cbd5e1;
          border-radius: 6px;
          padding: 6px 0;
          cursor: pointer;
        }
        .mute-btn.is-muted {
          background: #1f2937;
          color: #fca5a5;
          border-color: #ef4444;
        }
        .solo-btn {
          border: 1px solid #374151;
          background: #111827;
          color: #cbd5e1;
          border-radius: 6px;
          padding: 6px 0;
          cursor: pointer;
        }
        .solo-btn.is-solo {
          background: #422006;
          color: #fde68a;
          border-color: #f59e0b;
        }
        .volume-wrap {
          display: inline-grid;
          grid-template-columns: 26px 1fr 28px;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 11px;
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
          grid-template-columns: 30px 1fr;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 11px;
        }
        .instrument-wrap select {
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 6px;
          padding: 4px 6px;
          min-width: 0;
        }
        .move-wrap {
          display: grid;
          gap: 4px;
        }
        .move-btn {
          border: 1px solid #334155;
          background: #0f172a;
          color: #cbd5e1;
          border-radius: 6px;
          padding: 2px 0;
          cursor: pointer;
          line-height: 1.1;
        }
        .step-grid {
          display: grid;
          grid-template-columns: repeat(16, minmax(14px, 1fr));
          gap: 4px;
        }
        .step-btn {
          height: 18px;
          border: 1px solid #374151;
          background: #0b1020;
          border-radius: 4px;
          cursor: pointer;
        }
        .step-btn.is-enabled {
          border-color: transparent;
        }
        .remove-btn {
          border: 1px solid #7f1d1d;
          background: #3f0f12;
          color: #fecaca;
          border-radius: 6px;
          padding: 6px 0;
          cursor: pointer;
        }
        .header-btn {
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
        }
        @media (max-width: 1024px) {
          .channel-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
