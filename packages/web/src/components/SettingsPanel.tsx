import { Badge, Box, Card, Group, Select, Slider, Stack, Text } from "@mantine/core";
import { BaseNoteSelector } from "@ai-music-creator/ui";
import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";

interface SettingsPanelProps {
  baseNote: number;
  volume: number;
  reverb: number;
  instrument: EN_INSTRUMENT_TYPE;
  isInstrumentLoading?: boolean;
  disabled?: boolean;
  onBaseNoteChange: (note: number) => void;
  onVolumeChange: (volume: number) => void;
  onReverbChange: (reverb: number) => void;
  onInstrumentChange: (instrument: EN_INSTRUMENT_TYPE) => void;
}

export function SettingsPanel({
  baseNote,
  volume,
  reverb,
  instrument,
  isInstrumentLoading = false,
  disabled = false,
  onBaseNoteChange,
  onVolumeChange,
  onReverbChange,
  onInstrumentChange,
}: SettingsPanelProps) {
  const instrumentOptions = [
    { value: EN_INSTRUMENT_TYPE.PIANO, label: "钢琴" },
    { value: EN_INSTRUMENT_TYPE.SYNTH, label: "合成器" },
    { value: EN_INSTRUMENT_TYPE.GUITAR, label: "吉他" },
    { value: EN_INSTRUMENT_TYPE.DISTORTION_GUITAR, label: "失真吉他" },
    { value: EN_INSTRUMENT_TYPE.DRUM, label: "鼓组" },
  ];

  return (
    <Card
      radius="lg"
      padding="md"
      style={{
        flex: 1,
        border: "1px solid rgba(148,163,184,0.2)",
        background:
          "linear-gradient(180deg, rgba(12, 18, 31, 0.86) 0%, rgba(8, 12, 22, 0.8) 100%)",
        boxShadow: "inset 0 1px 0 rgba(148,163,184,0.06)",
      }}
    >
      <Stack gap={0} h="100%">
        <Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <Group align="center" gap={8} wrap="nowrap" style={{ width: "100%" }}>
            <Text size="sm" fw={600} c="gray.4" style={{ minWidth: 36 }}>
              音色
            </Text>
            <Box style={{ flex: 1 }}>
              <Select
                data={instrumentOptions}
                value={instrument}
                onChange={(next) => {
                  if (!next) return;
                  onInstrumentChange(next as EN_INSTRUMENT_TYPE);
                }}
                disabled={disabled || isInstrumentLoading}
                size="xs"
                styles={{
                  input: {
                    height: 30,
                    minHeight: 30,
                    borderRadius: 6,
                    borderColor: "#334155",
                    background: "#0f172a",
                    color: "#e2e8f0",
                  },
                  dropdown: {
                    background: "#0b1220",
                    borderColor: "#334155",
                  },
                  option: {
                    color: "#e2e8f0",
                  },
                }}
              />
            </Box>
            <Badge
              size="sm"
              variant="light"
              color={isInstrumentLoading ? "yellow" : "blue"}
              styles={{
                root: {
                  height: 24,
                  minWidth: 48,
                  lineHeight: "24px",
                  borderRadius: 6,
                  justifyContent: "center",
                },
              }}
            >
              {isInstrumentLoading ? "切换中" : "就绪"}
            </Badge>
          </Group>
        </Box>
        <Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <BaseNoteSelector value={baseNote} onChange={onBaseNoteChange} />
        </Box>
        <Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <Group align="center" gap={8} wrap="nowrap" style={{ width: "100%" }}>
            <Text size="sm" fw={600} c="gray.4" style={{ minWidth: 36 }}>
              音量
            </Text>
            <Box style={{ flex: 1 }}>
              <Slider
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(v) => onVolumeChange(v / 100)}
                color="indigo"
                size="sm"
              />
            </Box>
            <Badge
              size="sm"
              variant="light"
              color="blue"
              styles={{
                root: {
                  height: 24,
                  minWidth: 48,
                  lineHeight: "24px",
                  borderRadius: 6,
                  justifyContent: "center",
                },
              }}
            >
              {Math.round(volume * 100)}%
            </Badge>
          </Group>
        </Box>
        <Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <Group align="center" gap={8} wrap="nowrap" style={{ width: "100%" }}>
            <Text size="sm" fw={600} c="gray.4" style={{ minWidth: 36 }}>
              混响
            </Text>
            <Box style={{ flex: 1 }}>
              <Slider
                min={0}
                max={100}
                value={Math.round(reverb * 100)}
                onChange={(v) => onReverbChange(v / 100)}
                color="violet"
                size="sm"
              />
            </Box>
            <Badge
              size="sm"
              variant="light"
              color="violet"
              styles={{
                root: {
                  height: 24,
                  minWidth: 48,
                  lineHeight: "24px",
                  borderRadius: 6,
                  justifyContent: "center",
                },
              }}
            >
              {Math.round(reverb * 100)}%
            </Badge>
          </Group>
        </Box>
      </Stack>
    </Card>
  );
}
