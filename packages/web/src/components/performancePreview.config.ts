// 预览面板视觉配置（集中调参入口）
// - 尺寸类：track / labels / beam 的 width/height/offset
// - 视觉类：颜色、描边、阴影
// - 动效类：motion.mode + presets
export const PERFORMANCE_PREVIEW_UI = {
  card: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(15, 19, 32, 0.7)",
  },
  noteText: {
    multiSize: "1.9rem",
    singleSize: "2.4rem",
  },
  track: {
    height: 120,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.06)",
    background:
      "linear-gradient(180deg, rgba(2, 4, 10, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)",
    overlay:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 24%)",
  },
  anchor: {
    offsetX: 1,
    width: 3,
    glow: "0 0 10px rgba(99,102,241,0.55)",
    gradient:
      "linear-gradient(180deg, rgba(129,140,248,0.9) 0%, rgba(99,102,241,0.45) 45%, rgba(99,102,241,0) 100%)",
  },
  beam: {
    offsetX: 3,
    top: -10,
    width: 9,
    height: "138%",
    glowAlpha: 0.55,
    startAlpha: 0.95,
    midAlpha: 0.45,
  },
  labels: {
    containerHeight: 28,
    rowStep: 14,
    width: 26,
    height: 13,
    offsetX: 13,
    borderRadius: 999,
    background: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(129,140,248,0.45)",
    color: "#e0e7ff",
    fontSize: 10,
    lineHeight: "11px",
  },
  motion: {
    // 可选：soft | balanced | intense
    // 若要快速调手感，优先改这里。
    mode: "balanced" as "soft" | "balanced" | "intense",
    presets: {
      soft: {
        startY: -12,
        startScaleY: 0.86,
        peakOpacity: 0.88,
        endY: 170,
        endScaleY: 1.04,
      },
      balanced: {
        startY: -16,
        startScaleY: 0.8,
        peakOpacity: 0.95,
        endY: 198,
        endScaleY: 1.08,
      },
      intense: {
        startY: -20,
        startScaleY: 0.76,
        peakOpacity: 1,
        endY: 224,
        endScaleY: 1.12,
      },
    },
  },
};
