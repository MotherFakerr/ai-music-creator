export const CHANNEL_TRIGGER_NOTE: Record<string, number> = {
  kick: 36,
  snare: 38,
  hat: 42,
};

export function getChannelTriggerNote(channelId: string, channelIndex: number): number {
  return CHANNEL_TRIGGER_NOTE[channelId] ?? 48 + channelIndex * 2;
}
