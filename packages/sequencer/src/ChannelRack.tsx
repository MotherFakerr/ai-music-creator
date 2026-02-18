import type { SequencerChannel } from "./types";

export interface ChannelRackProps {
  channels: SequencerChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onToggleMute: (channelId: string) => void;
  onToggleStep: (channelId: string, step: number) => void;
}

export function ChannelRack({
  channels,
  selectedChannelId,
  onSelectChannel,
  onToggleMute,
  onToggleStep,
}: ChannelRackProps) {
  return (
    <div className="channel-rack">
      <div className="channel-rack-header">
        <h3>Channel Rack</h3>
      </div>
      <div className="channel-rack-list">
        {channels.map((channel) => {
          const isSelected = channel.id === selectedChannelId;
          return (
            <div
              key={channel.id}
              className={`channel-row ${isSelected ? "is-selected" : ""}`}
            >
              <button
                className="channel-name"
                onClick={() => onSelectChannel(channel.id)}
                style={{ borderColor: channel.color }}
              >
                <span className="channel-dot" style={{ background: channel.color }} />
                {channel.name}
              </button>
              <button
                className={`mute-btn ${channel.muted ? "is-muted" : ""}`}
                onClick={() => onToggleMute(channel.id)}
              >
                {channel.muted ? "Muted" : "On"}
              </button>
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
          grid-template-columns: 120px 60px 1fr;
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
        .channel-name {
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
        }
        .channel-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
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
        @media (max-width: 1024px) {
          .channel-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
