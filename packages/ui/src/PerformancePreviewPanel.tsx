import { Box, Card, Center, Group, Loader, Stack, Text } from "@mantine/core";
import { PERFORMANCE_PREVIEW_UI } from "./performancePreview.config";
import { ParticleCanvas } from "./ParticleCanvas";

export interface PerformanceTrace {
  id: number;
  note: number;
  noteName: string;
  x: number;
  hue: number;
  bornAt: number;
  strength: number;
}

export interface NoteAnchor {
  note: number;
  label: string;
  x: number;
}

export interface AlignedNoteLabel extends NoteAnchor {
  row: number;
}

interface PerformancePreviewPanelProps {
  activeNoteLabel: string | null;
  activeNotesSize: number;
  isInstrumentLoading: boolean;
  activeNoteAnchors: NoteAnchor[];
  traces: PerformanceTrace[];
  alignedNoteLabels: AlignedNoteLabel[];
  traceLifetimeMs: number;
}

export function PerformancePreviewPanel({
  activeNoteLabel,
  activeNotesSize,
  isInstrumentLoading,
  activeNoteAnchors,
  traces,
  alignedNoteLabels,
}: PerformancePreviewPanelProps) {
  return (
    <Card
      radius="lg"
      padding="lg"
      style={{
        flex: 1,
        border: PERFORMANCE_PREVIEW_UI.card.border,
        background: PERFORMANCE_PREVIEW_UI.card.background,
      }}
    >
      <Stack gap={10}>
        <Center h={46}>
          {activeNoteLabel ? (
            <Text
              fw={700}
              size={
                activeNotesSize > 1
                  ? PERFORMANCE_PREVIEW_UI.noteText.multiSize
                  : PERFORMANCE_PREVIEW_UI.noteText.singleSize
              }
              ff="Monaco, Consolas, monospace"
              variant="gradient"
              gradient={{
                from: "indigo.4",
                to: "violet.3",
                deg: 120,
              }}
            >
              {activeNoteLabel}
            </Text>
          ) : (
            <Group gap={8}>
              {isInstrumentLoading ? <Loader color="yellow" size="sm" /> : null}
              <Text size="sm" c="dimmed">
                {isInstrumentLoading
                  ? "乐器加载中，暂不可演奏"
                  : "按下键盘开始演奏"}
              </Text>
            </Group>
          )}
        </Center>

        {/* ── 粒子特效轨道 ── */}
        <Box
          h={PERFORMANCE_PREVIEW_UI.track.height}
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: PERFORMANCE_PREVIEW_UI.track.borderRadius,
            border: PERFORMANCE_PREVIEW_UI.track.border,
            background: PERFORMANCE_PREVIEW_UI.track.background,
          }}
        >
          <ParticleCanvas traces={traces} activeAnchors={activeNoteAnchors} />
        </Box>

        {/* ── 音符标签 ── */}
        <Box
          h={PERFORMANCE_PREVIEW_UI.labels.containerHeight}
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
          }}
        >
          {alignedNoteLabels.length === 0 ? (
            <Center h="100%">
              <Text size="xs" c="dimmed">
                当前按下音符会显示在对应轨迹下方
              </Text>
            </Center>
          ) : null}
          {alignedNoteLabels.map((anchor) => (
            <Box
              key={`outside-note-${anchor.note}`}
              style={{
                position: "absolute",
                left: `calc(${(anchor.x * 100).toFixed(2)}% - ${
                  PERFORMANCE_PREVIEW_UI.labels.offsetX
                }px)`,
                top: anchor.row * PERFORMANCE_PREVIEW_UI.labels.rowStep,
                width: PERFORMANCE_PREVIEW_UI.labels.width,
                height: PERFORMANCE_PREVIEW_UI.labels.height,
                borderRadius: PERFORMANCE_PREVIEW_UI.labels.borderRadius,
                background: PERFORMANCE_PREVIEW_UI.labels.background,
                border: PERFORMANCE_PREVIEW_UI.labels.border,
                color: PERFORMANCE_PREVIEW_UI.labels.color,
                fontSize: PERFORMANCE_PREVIEW_UI.labels.fontSize,
                lineHeight: PERFORMANCE_PREVIEW_UI.labels.lineHeight,
                textAlign: "center",
                fontFamily: "Monaco, Consolas, monospace",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {anchor.label}
            </Box>
          ))}
        </Box>
      </Stack>
    </Card>
  );
}
