import { ActionIcon, Badge, Group, Stack, Text } from "@mantine/core";
import { DEFAULT_BASE_NOTE, getNoteName } from "@ai-music-creator/core";

export interface BaseNoteSelectorProps {
  value?: number;
  onChange?: (note: number) => void;
}

const MIN_NOTE = 48; // C3
const MAX_NOTE = 60; // C4

export function BaseNoteSelector({
  value = DEFAULT_BASE_NOTE,
  onChange,
}: BaseNoteSelectorProps) {
  const displayNote = getNoteName(value);

  return (
    <Group align="center" gap={8} wrap="nowrap">
      <Text size="sm" fw={600} c="gray.4" style={{ minWidth: 36 }}>
        基准音
      </Text>
      <Group gap={8} align="center" style={{ flex: 1 }}>
        <ActionIcon
          variant="default"
          size="sm"
          radius={6}
          disabled={value <= MIN_NOTE}
          onClick={() => onChange?.(Math.max(value - 1, MIN_NOTE))}
          aria-label="降低"
          styles={{
            root: {
              width: 30,
              height: 30,
              minWidth: 30,
              minHeight: 30,
              borderColor: "#334155",
              background: "#0f172a",
              color: "#cbd5e1",
            },
          }}
        >
          ▼
        </ActionIcon>
        <Badge
          variant="light"
          color="blue"
          radius={6}
          styles={{
            root: {
              height: 30,
              minWidth: 56,
              justifyContent: "center",
              fontSize: 15,
              fontFamily: "Monaco, Consolas, monospace",
            },
          }}
        >
          {displayNote}
        </Badge>
        <ActionIcon
          variant="default"
          size="sm"
          radius={6}
          disabled={value >= MAX_NOTE}
          onClick={() => onChange?.(Math.min(value + 1, MAX_NOTE))}
          aria-label="升高"
          styles={{
            root: {
              width: 30,
              height: 30,
              minWidth: 30,
              minHeight: 30,
              borderColor: "#334155",
              background: "#0f172a",
              color: "#cbd5e1",
            },
          }}
        >
          ▲
        </ActionIcon>
      </Group>
    </Group>
  );
}
