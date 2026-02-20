import {
  Badge,
  Box,
  Group,
  Paper,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";

interface AppHeaderProps {
  isInitialized: boolean;
  isInstrumentLoading: boolean;
}

export function AppHeader({
  isInitialized,
  isInstrumentLoading,
}: AppHeaderProps) {
  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(10, 14, 24, 0.7)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap={10}>
        <Group gap={10}>
          <ThemeIcon
            size={42}
            radius="md"
            variant="gradient"
            gradient={{ from: "indigo.5", to: "cyan.5", deg: 120 }}
          >
            🎵
          </ThemeIcon>
          <Box>
            <Title order={2} style={{ fontSize: "1.9rem", lineHeight: 1.1 }}>
              AI Music Co-Creator
            </Title>
            <Text c="dimmed" size="md">
              演奏 · 跟奏 · MIDI记录 · AI续写
            </Text>
          </Box>
        </Group>

        <Group gap={8}>
          <Badge
            size="sm"
            color={isInitialized ? "teal" : "gray"}
            variant="light"
            styles={{
              root: {
                textTransform: "none",
                height: 30,
                borderRadius: 6,
              },
            }}
          >
            {isInitialized ? "音频引擎已就绪" : "音频引擎初始化中"}
          </Badge>
          <Badge
            size="sm"
            color={isInstrumentLoading ? "yellow" : "grape"}
            variant="light"
            styles={{
              root: {
                textTransform: "none",
                height: 30,
                borderRadius: 6,
              },
            }}
          >
            {isInstrumentLoading ? "音色加载中" : "可演奏"}
          </Badge>
        </Group>
      </Group>
    </Paper>
  );
}
