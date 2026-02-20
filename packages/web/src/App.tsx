import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Card, Container, Grid, Group, Stack } from "@mantine/core";
import {
  Keyboard,
  PianoKeyboard,
  KeyboardModeSwitch,
  useKeyboard,
  AudioPlayer,
  type KeyboardMode,
} from "@ai-music-creator/ui";
import { EN_INSTRUMENT_TYPE, getAudioEngine } from "@ai-music-creator/audio";
import {
  DEFAULT_BASE_NOTE,
  getNoteName,
  setBaseNote,
} from "@ai-music-creator/core";
import { AppHeader } from "./components/AppHeader";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  PerformancePreviewPanel,
  type PerformanceTrace,
} from "./components/PerformancePreviewPanel";
import {
  useActiveNoteLayout,
  useNoteLaneMapper,
} from "./hooks/usePerformanceLayout";

const TRACE_LIFETIME_MS = 1650;
const TRACE_MAX_ITEMS = 48;
const TRACK_EDGE_PADDING = 0.02;
const MODULE_PANEL_STYLE = {
  border: "1px solid rgba(148,163,184,0.2)",
  background:
    "linear-gradient(180deg, rgba(7, 12, 22, 0.78) 0%, rgba(4, 8, 16, 0.72) 100%)",
  boxShadow: "inset 0 1px 0 rgba(148,163,184,0.06)",
};

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInstrumentLoading, setIsInstrumentLoading] = useState(false);
  const [traces, setTraces] = useState<PerformanceTrace[]>([]);
  const [volume, setVolume] = useState(0.9);
  const [reverb, setReverb] = useState(0.18);
  const [instrument, setInstrument] = useState<EN_INSTRUMENT_TYPE>(
    EN_INSTRUMENT_TYPE.PIANO,
  );
  const [baseNote, setBaseNoteState] = useState(DEFAULT_BASE_NOTE);
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("qwerty");
  const [audioEngine] = useState(() => getAudioEngine());
  const traceIdRef = useRef(0);
  const mapNoteToLane = useNoteLaneMapper(baseNote, TRACK_EDGE_PADDING);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // 确保音频引擎初始化（移动端需要在用户交互时调用）
  const ensureInitialized = useCallback(async () => {
    if (isInitialized) return;

    if (!initPromiseRef.current) {
      initPromiseRef.current = audioEngine.init();
    }

    try {
      await initPromiseRef.current;
      setIsInitialized(true);
    } catch (err) {
      console.error("[App] 音频引擎初始化失败:", err);
    }
  }, [audioEngine, isInitialized]);

  useEffect(() => {
    // PC端可以自动初始化
    const init = async () => {
      try {
        await audioEngine.init();
        setIsInitialized(true);
      } catch (err) {
        console.error("[App] 音频引擎初始化失败:", err);
      }
    };

    // 延迟初始化，给移动端用户交互的机会
    const timer = setTimeout(() => {
      void init();
    }, 1000);

    return () => {
      clearTimeout(timer);
      audioEngine.dispose();
    };
  }, [audioEngine]);

  const canPlay = isInitialized && !isInstrumentLoading;

  const handleNoteOn = useCallback(
    async (note: number, velocity: number) => {
      // 移动端首次点击时初始化
      if (!isInitialized) {
        await ensureInitialized();
      }

      if (!canPlay) return;
      audioEngine.playNote(note, velocity);

      const lane = mapNoteToLane(note);
      const hue = 8 + ((note % 12) / 12) * 35; // 暖色谱，接近“能量束”观感
      const strength = Math.max(0.35, Math.min(1, velocity / 127));
      const nextTrace: PerformanceTrace = {
        id: ++traceIdRef.current,
        note,
        noteName: getNoteName(note),
        x: lane,
        hue,
        bornAt: Date.now(),
        strength,
      };

      setTraces((prev) => [...prev, nextTrace].slice(-TRACE_MAX_ITEMS));
    },
    [audioEngine, canPlay, mapNoteToLane, isInitialized, ensureInitialized],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      if (!isInitialized) return;
      audioEngine.stopNote(note);
    },
    [isInitialized, audioEngine],
  );

  const handleInstrumentChange = useCallback(
    async (newInstrument: EN_INSTRUMENT_TYPE) => {
      if (newInstrument === instrument) return;

      setIsInstrumentLoading(true);
      audioEngine.stopAllNotes();
      setInstrument(newInstrument);

      try {
        await audioEngine.setInstrument(newInstrument);
      } finally {
        setIsInstrumentLoading(false);
      }
    },
    [audioEngine, instrument],
  );

  const handleBaseNoteChange = useCallback((note: number) => {
    setBaseNoteState(note);
    setBaseNote(note);
  }, []);

  const { activeNotes, noteOn, noteOff } = useKeyboard({
    baseNote,
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    disabled: !canPlay,
  });
  const { activeNoteAnchors, alignedNoteLabels } = useActiveNoteLayout({
    activeNotes,
    mapNoteToLane,
  });
  const activeNoteLabel = useMemo(() => {
    if (activeNotes.size === 0) return null;
    return Array.from(activeNotes)
      .sort((a, b) => a - b)
      .map((note) => getNoteName(note))
      .join(" · ");
  }, [activeNotes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTraces((prev) => {
        const next = prev.filter(
          (item) => now - item.bornAt < TRACE_LIFETIME_MS,
        );
        return next.length === prev.length ? prev : next;
      });
    }, 120);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [audioEngine, volume]);

  useEffect(() => {
    audioEngine.setReverb(reverb);
  }, [audioEngine, reverb]);

  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 10%, #1f245f 0%, transparent 38%), radial-gradient(circle at 88% 90%, #0d4f5f 0%, transparent 35%), #090b12",
      }}
    >
      <Container size="xl" py={18}>
        <Stack gap={12}>
          <AppHeader
            isInitialized={isInitialized}
            isInstrumentLoading={isInstrumentLoading}
          />
          <Card
            radius="md"
            padding="md"
            style={{
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(15, 19, 32, 0.7)",
            }}
          >
            <Stack gap={10}>
              <Group justify="space-between" align="center" wrap="wrap" gap={8}>
                <Box
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#dbeafe",
                    letterSpacing: 0.3,
                  }}
                >
                  演奏与跟奏
                </Box>
                <Button
                  component="a"
                  href="/sequencer"
                  variant="default"
                  size="xs"
                  styles={{
                    root: {
                      height: 30,
                      minHeight: 30,
                      borderRadius: 6,
                      borderColor: "rgba(96,165,250,0.45)",
                      background: "rgba(30, 58, 138, 0.22)",
                      color: "#dbeafe",
                      paddingInline: 12,
                    },
                  }}
                >
                  进入编曲工作台
                </Button>
              </Group>

              <Grid gutter="sm" align="stretch">
                <Grid.Col span={{ base: 12, md: 4 }} style={{ display: "flex" }}>
                  <SettingsPanel
                    baseNote={baseNote}
                    volume={volume}
                    reverb={reverb}
                    instrument={instrument}
                    isInstrumentLoading={isInstrumentLoading}
                    disabled={!isInitialized}
                    onBaseNoteChange={handleBaseNoteChange}
                    onVolumeChange={setVolume}
                    onReverbChange={setReverb}
                    onInstrumentChange={handleInstrumentChange}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 8 }} style={{ display: "flex" }}>
                  <PerformancePreviewPanel
                    activeNoteLabel={activeNoteLabel}
                    activeNotesSize={activeNotes.size}
                    isInstrumentLoading={isInstrumentLoading}
                    activeNoteAnchors={activeNoteAnchors}
                    traces={traces}
                    alignedNoteLabels={alignedNoteLabels}
                    traceLifetimeMs={TRACE_LIFETIME_MS}
                  />
                </Grid.Col>
              </Grid>

              <Stack gap={6}>
                <Box style={{ display: "flex", justifyContent: "flex-end" }}>
                  <KeyboardModeSwitch
                    value={keyboardMode}
                    onChange={setKeyboardMode}
                  />
                </Box>

                <Card radius="md" padding="sm" style={MODULE_PANEL_STYLE}>
                  <Box className="keyboard-area">
                    {keyboardMode === "qwerty" ? (
                      <Keyboard
                        activeNotes={activeNotes}
                        baseNote={baseNote}
                        onNoteOn={noteOn}
                        onNoteOff={noteOff}
                      />
                    ) : (
                      <PianoKeyboard
                        activeNotes={activeNotes}
                        baseNote={baseNote}
                        onNoteOn={noteOn}
                        onNoteOff={noteOff}
                      />
                    )}
                  </Box>
                </Card>
              </Stack>

              <Card
                radius="md"
                padding="sm"
                style={MODULE_PANEL_STYLE}
              >
                <AudioPlayer />
              </Card>
            </Stack>
          </Card>

          <style>{`
            .keyboard-area {
              height: 300px;
            }
            @media (max-width: 860px) {
              .keyboard-area {
                height: auto;
              }
            }
          `}</style>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
