import { EN_INSTRUMENT_TYPE } from "@ai-music-creator/audio";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";

export interface InstrumentSelectorProps {
  value: EN_INSTRUMENT_TYPE;
  onChange: (instrument: EN_INSTRUMENT_TYPE) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const INSTRUMENTS: { id: EN_INSTRUMENT_TYPE; label: string }[] = [
  { id: EN_INSTRUMENT_TYPE.PIANO, label: "钢琴" },
  { id: EN_INSTRUMENT_TYPE.SYNTH, label: "合成器" },
  { id: EN_INSTRUMENT_TYPE.GUITAR, label: "吉他" },
  { id: EN_INSTRUMENT_TYPE.DISTORTION_GUITAR, label: "失真吉他" },
  { id: EN_INSTRUMENT_TYPE.DRUM, label: "鼓组" },
];

export function InstrumentSelector({
  value,
  onChange,
  isLoading = false,
  disabled = false,
}: InstrumentSelectorProps) {
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Text size="xs" fw={600} c="#94a3b8">
          音色
        </Text>
        {isLoading ? (
          <Badge size="xs" variant="light" color="yellow" radius={6}>
            切换中
          </Badge>
        ) : null}
      </Group>
      <Group gap={6}>
        {INSTRUMENTS.map((inst) => (
          <Button
            key={inst.id}
            size="xs"
            radius={6}
            variant={value === inst.id ? "filled" : "default"}
            color={value === inst.id ? "blue" : "gray"}
            onClick={() => onChange(inst.id)}
            disabled={disabled || isLoading}
            styles={{
              root: {
                height: 30,
                paddingInline: 12,
                borderColor: value === inst.id ? "rgba(96,165,250,0.55)" : "#334155",
                background: value === inst.id ? "rgba(59,130,246,0.2)" : "#0f172a",
                color: value === inst.id ? "#eaf2ff" : "#cbd5e1",
              },
            }}
          >
            {inst.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}
