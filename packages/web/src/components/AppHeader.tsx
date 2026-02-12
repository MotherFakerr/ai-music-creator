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
      radius="xl"
      p="lg"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(10, 14, 24, 0.7)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap={12}>
        <Group gap={12}>
          <ThemeIcon
            size={42}
            radius="md"
            variant="gradient"
            gradient={{ from: "indigo.5", to: "cyan.5", deg: 120 }}
          >
            🎵
          </ThemeIcon>
          <Box>
            <Title order={2} style={{ fontSize: "2.1rem", lineHeight: 1.1 }}>
              AI Music Co-Creator
            </Title>
            <Text c="dimmed" size="md">
              演奏 · 跟奏 · MIDI记录 · AI续写
            </Text>
          </Box>
        </Group>

        <Group gap={10}>
          <Badge
            size="lg"
            color={isInitialized ? "teal" : "gray"}
            variant="light"
            style={{ textTransform: "none" }}
          >
            {isInitialized ? "音频引擎已就绪" : "音频引擎初始化中"}
          </Badge>
          <Badge
            size="lg"
            color={isInstrumentLoading ? "yellow" : "grape"}
            variant="light"
            style={{ textTransform: "none" }}
          >
            {isInstrumentLoading ? "音色加载中" : "可演奏"}
          </Badge>
        </Group>
      </Group>
    </Paper>
  );
}
