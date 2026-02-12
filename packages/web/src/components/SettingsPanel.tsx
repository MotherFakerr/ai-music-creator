import { Badge, Box, Card, Group, Slider, Stack, Text } from "@mantine/core";
import { BaseNoteSelector } from "@ai-music-creator/ui";

interface SettingsPanelProps {
  baseNote: number;
  volume: number;
  onBaseNoteChange: (note: number) => void;
  onVolumeChange: (volume: number) => void;
}

export function SettingsPanel({
  baseNote,
  volume,
  onBaseNoteChange,
  onVolumeChange,
}: SettingsPanelProps) {
  return (
    <Card
      radius="lg"
      padding="md"
      style={{
        flex: 1,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(15, 19, 32, 0.7)",
      }}
    >
      <Stack gap={12} h="100%">
        <BaseNoteSelector value={baseNote} onChange={onBaseNoteChange} />
        <Box>
          <Group justify="space-between" mb={4}>
            <Text size="sm" fw={600} c="gray.2">
              音量
            </Text>
            <Badge size="md" variant="light" color="blue">
              {Math.round(volume * 100)}%
            </Badge>
          </Group>
          <Slider
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(v) => onVolumeChange(v / 100)}
            color="indigo"
            size="sm"
          />
        </Box>
      </Stack>
    </Card>
  );
}
