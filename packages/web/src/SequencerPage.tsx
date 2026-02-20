import { Box, Card, Container, Stack, Text, Title } from "@mantine/core";
import { PatternEditor } from "@ai-music-creator/sequencer";

export function SequencerPage() {
  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 8%, #1a2455 0%, transparent 42%), radial-gradient(circle at 86% 88%, #0d3f5a 0%, transparent 36%), #090b12",
      }}
    >
      <Container size="xl" py={20}>
        <Stack gap={14}>
          <Card
            radius="lg"
            padding="lg"
            style={{
              border: "1px solid rgba(147,197,253,0.35)",
              background: "rgba(10, 15, 28, 0.78)",
            }}
          >
            <Stack gap={6}>
              <Title order={3} style={{ color: "#dbeafe" }}>
                编曲工作台（Sequencer）
              </Title>
              <Text c="dimmed" size="sm">
                独立编曲页面：Channel Rack + Piano Roll。
              </Text>
              <a
                href="/"
                style={{
                  color: "#93c5fd",
                  fontSize: 13,
                  textDecoration: "none",
                  width: "fit-content",
                }}
              >
                返回演奏与跟奏
              </a>
            </Stack>
          </Card>
          <PatternEditor />
        </Stack>
      </Container>
    </Box>
  );
}
