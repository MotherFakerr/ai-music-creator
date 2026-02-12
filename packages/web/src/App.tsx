import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  BaseNoteSelector,
  InstrumentSelector,
  Keyboard,
  useKeyboard,
} from "@ai-music-creator/ui";
import { EN_INSTRUMENT_TYPE, getAudioEngine } from "@ai-music-creator/audio";
import {
  DEFAULT_BASE_NOTE,
  getNoteName,
  setBaseNote,
} from "@ai-music-creator/core";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInstrumentLoading, setIsInstrumentLoading] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<EN_INSTRUMENT_TYPE>(
    EN_INSTRUMENT_TYPE.PIANO
  );
  const [baseNote, setBaseNoteState] = useState(DEFAULT_BASE_NOTE);
  const [audioEngine] = useState(() => getAudioEngine());

  useEffect(() => {
    const init = async () => {
      try {
        await audioEngine.init();
        setIsInitialized(true);
      } catch (err) {
        console.error("[App] 音频引擎初始化失败:", err);
      }
    };

    void init();

    return () => {
      audioEngine.dispose();
    };
  }, [audioEngine]);

  const canPlay = isInitialized && !isInstrumentLoading;

  const handleNoteOn = useCallback(
    (note: number, velocity: number) => {
      if (!canPlay) return;
      audioEngine.playNote(note, velocity);
      setCurrentNote(getNoteName(note));
    },
    [canPlay, audioEngine]
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      if (!isInitialized) return;
      audioEngine.stopNote(note);
    },
    [isInitialized, audioEngine]
  );

  const handleInstrumentChange = useCallback(
    async (newInstrument: EN_INSTRUMENT_TYPE) => {
      if (newInstrument === instrument) return;

      setIsInstrumentLoading(true);
      setCurrentNote(null);
      audioEngine.stopAllNotes();
      setInstrument(newInstrument);

      try {
        await audioEngine.setInstrument(newInstrument);
      } finally {
        setIsInstrumentLoading(false);
      }
    },
    [audioEngine, instrument]
  );

  const handleBaseNoteChange = useCallback((note: number) => {
    setBaseNoteState(note);
    setBaseNote(note);
  }, []);

  const { activeNotes } = useKeyboard({
    baseNote,
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    disabled: !canPlay,
  });

  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 10%, #1f245f 0%, transparent 38%), radial-gradient(circle at 88% 90%, #0d4f5f 0%, transparent 35%), #090b12",
      }}
    >
      <Container size="xl" py={36}>
        <Stack gap={24}>
          <Paper
            radius="xl"
            p="lg"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(10, 14, 24, 0.7)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Group
              justify="space-between"
              align="flex-start"
              wrap="wrap"
              gap={12}
            >
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
                  <Title order={2}>AI Music Co-Creator</Title>
                  <Text c="dimmed" size="sm">
                    演奏 · 跟奏 · MIDI记录 · AI续写
                  </Text>
                </Box>
              </Group>

              <Group gap={8}>
                <Badge color={isInitialized ? "teal" : "gray"} variant="light">
                  {isInitialized ? "音频引擎已就绪" : "音频引擎初始化中"}
                </Badge>
                <Badge
                  color={isInstrumentLoading ? "yellow" : "grape"}
                  variant="light"
                >
                  {isInstrumentLoading ? "音色加载中" : "可演奏"}
                </Badge>
              </Group>
            </Group>
          </Paper>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card
              radius="lg"
              padding="lg"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(15, 19, 32, 0.7)",
              }}
            >
              <BaseNoteSelector
                value={baseNote}
                onChange={handleBaseNoteChange}
              />
            </Card>

            <Card
              radius="lg"
              padding="lg"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(15, 19, 32, 0.7)",
              }}
            >
              {currentNote ? (
                <Center h={88}>
                  <Stack align="center" gap={4}>
                    <Text size="xs" c="dimmed">
                      当前音符
                    </Text>
                    <Text
                      fw={700}
                      size="2.4rem"
                      ff="Monaco, Consolas, monospace"
                      variant="gradient"
                      gradient={{ from: "indigo.4", to: "violet.3", deg: 120 }}
                    >
                      {currentNote}
                    </Text>
                  </Stack>
                </Center>
              ) : (
                <Center h={88}>
                  <Group gap={8}>
                    {isInstrumentLoading ? (
                      <Loader color="yellow" size="sm" />
                    ) : null}
                    <Text size="sm" c="dimmed">
                      {isInstrumentLoading
                        ? "乐器加载中，暂不可演奏"
                        : "按下键盘开始演奏"}
                    </Text>
                  </Group>
                </Center>
              )}
            </Card>
          </SimpleGrid>

          <Card
            radius="lg"
            padding="lg"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(15, 19, 32, 0.7)",
            }}
          >
            <InstrumentSelector
              value={instrument}
              onChange={handleInstrumentChange}
              isLoading={isInstrumentLoading}
              disabled={!isInitialized}
            />
          </Card>

          <Card
            radius="xl"
            padding="lg"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(8, 10, 20, 0.85)",
            }}
          >
            <Box style={{ paddingBottom: 8 }}>
              <Keyboard activeNotes={activeNotes} baseNote={baseNote} />
            </Box>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
