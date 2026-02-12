import { useCallback, useMemo } from "react";
import { getNoteName, useKeyboardMap } from "@ai-music-creator/core";

export interface NoteAnchor {
  note: number;
  label: string;
  x: number;
}

export interface AlignedNoteLabel extends NoteAnchor {
  row: number;
}

interface UsePerformanceLayoutOptions {
  baseNote: number;
  activeNotes: Set<number>;
  edgePadding?: number;
  labelRows?: number;
  minGap?: number;
}

export function useNoteLaneMapper(
  baseNote: number,
  edgePadding: number = 0.02
) {
  // 通过当前基准音拿到实际可演奏音域，用于动态映射轨道位置。
  // 这样切换基准音后，高低音仍能在整条轨道中均匀分布。
  const keyboardMap = useKeyboardMap(baseNote);
  const { minPlayableNote, maxPlayableNote } = useMemo(() => {
    const notes = Object.values(keyboardMap);
    return {
      minPlayableNote: Math.min(...notes),
      maxPlayableNote: Math.max(...notes),
    };
  }, [keyboardMap]);

  return useCallback(
    (note: number) => {
      const range = maxPlayableNote - minPlayableNote;
      if (range <= 0) return 0.5;
      // 先归一化到 0~1，再压缩到带边距的安全区间，避免贴边裁切。
      const normalized = Math.max(
        0,
        Math.min(1, (note - minPlayableNote) / range)
      );
      return edgePadding + normalized * (1 - edgePadding * 2);
    },
    [edgePadding, maxPlayableNote, minPlayableNote]
  );
}

export function useActiveNoteLayout({
  activeNotes,
  mapNoteToLane,
  labelRows = 2,
  minGap = 0.085,
}: {
  activeNotes: Set<number>;
  mapNoteToLane: (note: number) => number;
  labelRows?: number;
  minGap?: number;
}) {
  // 当前按下音 -> 轨迹锚点（音名 + x 坐标）
  const activeNoteAnchors = useMemo(
    () =>
      Array.from(activeNotes)
        .sort((a, b) => a - b)
        .map((note) => ({
          note,
          label: getNoteName(note),
          x: mapNoteToLane(note),
        })),
    [activeNotes, mapNoteToLane]
  );

  const alignedNoteLabels = useMemo(() => {
    // 文本避让策略：
    // 1) 按 x 从左到右排；2) 优先放到间距足够的行；3) 不够时落到冲突最小行。
    const lastXByRow = Array.from({ length: labelRows }, () => -1);
    const sorted = [...activeNoteAnchors].sort((a, b) => a.x - b.x);

    return sorted.map((anchor) => {
      let targetRow = 0;
      let fallbackRow = 0;
      let bestSpace = -Infinity;

      for (let row = 0; row < labelRows; row++) {
        const space = anchor.x - lastXByRow[row];
        if (space >= minGap) {
          targetRow = row;
          bestSpace = space;
          break;
        }
        if (space > bestSpace) {
          bestSpace = space;
          fallbackRow = row;
        }
      }

      if (bestSpace < minGap) {
        targetRow = fallbackRow;
      }

      lastXByRow[targetRow] = anchor.x;
      return { ...anchor, row: targetRow };
    });
  }, [activeNoteAnchors, labelRows, minGap]);

  return {
    activeNoteAnchors,
    alignedNoteLabels,
  };
}

export function usePerformanceLayout({
  baseNote,
  activeNotes,
  edgePadding = 0.02,
  labelRows = 2,
  minGap = 0.085,
}: UsePerformanceLayoutOptions) {
  // 组合入口：同时返回轨道映射函数、锚点和标签排布结果。
  const mapNoteToLane = useNoteLaneMapper(baseNote, edgePadding);
  const { activeNoteAnchors, alignedNoteLabels } = useActiveNoteLayout({
    activeNotes,
    mapNoteToLane,
    labelRows,
    minGap,
  });

  return {
    mapNoteToLane,
    activeNoteAnchors,
    alignedNoteLabels,
  };
}
