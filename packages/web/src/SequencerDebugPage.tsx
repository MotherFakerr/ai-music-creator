import { Anchor, Card, Container, Stack, Text, Title } from "@mantine/core";
import { PatternEditor } from "@ai-music-creator/sequencer";

export function SequencerDebugPage() {
  return (
    <Container size="xl" py={20}>
      <Stack gap="md">
        <Card
          radius="lg"
          padding="lg"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15, 19, 32, 0.7)",
          }}
        >
          <Stack gap={6}>
            <Title order={3}>Sequencer Debug</Title>
            <Text c="dimmed" size="sm">
              This page is only for quickly tuning Channel Rack and Piano Roll interactions.
            </Text>
            <Anchor href="/" size="sm">
              Back to main page
            </Anchor>
          </Stack>
        </Card>

        <PatternEditor />
      </Stack>
    </Container>
  );
}
