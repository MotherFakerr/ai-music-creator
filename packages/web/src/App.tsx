import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, Container, Grid, Stack } from "@mantine/core";
import {
  InstrumentSelector,
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
import { PatternEditor } from "@ai-music-creator/sequencer";

const TRACE_LIFETIME_MS = 1650;
const TRACE_MAX_ITEMS = 48;
const TRACK_EDGE_PADDING = 0.02;

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInstrumentLoading, setIsInstrumentLoading] = useState(false);
  const [traces, setTraces] = useState<PerformanceTrace[]>([]);
  const [volume, setVolume] = useState(0.9);
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

  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 10%, #1f245f 0%, transparent 38%), radial-gradient(circle at 88% 90%, #0d4f5f 0%, transparent 35%), #090b12",
      }}
    >
      <Container size="xl" py={20}>
        <Stack gap={16}>
          <AppHeader
            isInitialized={isInitialized}
            isInstrumentLoading={isInstrumentLoading}
          />
          <Box style={{ display: "flex", justifyContent: "flex-end" }}>
            <a
              href="/sequencer-debug"
              style={{
                color: "#93c5fd",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Open Sequencer Debug Page
            </a>
          </Box>

          <Grid gutter="md" align="stretch">
            <Grid.Col span={{ base: 12, md: 4 }} style={{ display: "flex" }}>
              <SettingsPanel
                baseNote={baseNote}
                volume={volume}
                onBaseNoteChange={handleBaseNoteChange}
                onVolumeChange={setVolume}
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

          <Card
            radius="lg"
            padding="lg"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(15, 19, 32, 0.7)",
            }}
          >
            <AudioPlayer />
          </Card>

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

          <Stack gap={6}>
            <Box style={{ display: "flex", justifyContent: "flex-end" }}>
              <KeyboardModeSwitch
                value={keyboardMode}
                onChange={setKeyboardMode}
              />
            </Box>

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
          </Stack>

          <Card
            radius="lg"
            padding="lg"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(15, 19, 32, 0.7)",
            }}
          >
            <PatternEditor />
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
