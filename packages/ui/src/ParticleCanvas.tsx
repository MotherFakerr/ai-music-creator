/**
 * ParticleCanvas – 墨水喷涌特效
 *
 * 渲染管线（每帧）：
 *   1. 离屏画布（offscreen）保留上一帧残影，用 destination-out 缓慢擦除
 *   2. 在离屏画布上用 screen 混合绘制新墨团（实心圆，无逐粒子渐变）
 *   3. 将离屏画布整体施加 blur 后 screen 混合到主画布
 *   → 模糊让相邻墨团融合为连续流体，残影形成拖尾水痕
 *
 * 视觉：像颜料从底部喷入水中、向上翻涌扩散的效果
 */

import { useRef, useEffect } from "react";
import type { PerformanceTrace, NoteAnchor } from "./PerformancePreviewPanel";

/* ── 粒子结构 ── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  growRate: number;
  hue: number;
  sat: number;
  lit: number;
  alpha: number;
  life: number;
  decay: number;
  wPhase: number;
  wAmp: number;
  wFreq: number;
}

/* ═══════════════════════════════════════
   粒子生成（从底部向上喷涌）
   ═══════════════════════════════════════ */

/** 击键爆发：大墨团 + 卷曲墨丝 + 弥散水雾 */
function spawnInkBurst(
  x: number,
  h: number,
  hue: number,
  strength: number
): Particle[] {
  const result: Particle[] = [];
  const bottom = h;

  // ── 主墨团（大、浓、向上冲）──
  const blobCount = 5 + Math.floor(strength * 6);
  for (let i = 0; i < blobCount; i++) {
    const spread = (Math.random() - 0.5) * 1.0;
    const upSpeed = -(1.0 + Math.random() * 2.2 * strength);
    result.push({
      x: x + (Math.random() - 0.5) * 14,
      y: bottom - Math.random() * 6,
      vx: spread,
      vy: upSpeed,
      size: 6 + Math.random() * 6,
      maxSize: 16 + Math.random() * 22,
      growRate: 0.3 + Math.random() * 0.4,
      hue: hue + (Math.random() - 0.5) * 28,
      sat: 65 + Math.random() * 30,
      lit: 38 + Math.random() * 22,
      alpha: 0.12 + Math.random() * 0.1 * strength,
      life: 1,
      decay: 0.002 + Math.random() * 0.003,
      wPhase: Math.random() * Math.PI * 2,
      wAmp: 0.12 + Math.random() * 0.28,
      wFreq: 0.012 + Math.random() * 0.02,
    });
  }

  // ── 墨丝（细、快、强烈卷曲）──
  const tendrilCount = 5 + Math.floor(strength * 7);
  for (let i = 0; i < tendrilCount; i++) {
    const spread = (Math.random() - 0.5) * 1.6;
    const upSpeed = -(0.6 + Math.random() * 2.8 * strength);
    result.push({
      x: x + (Math.random() - 0.5) * 18,
      y: bottom - Math.random() * 5,
      vx: spread,
      vy: upSpeed,
      size: 3 + Math.random() * 4,
      maxSize: 8 + Math.random() * 14,
      growRate: 0.2 + Math.random() * 0.3,
      hue: hue + (Math.random() - 0.5) * 25,
      sat: 70 + Math.random() * 28,
      lit: 44 + Math.random() * 20,
      alpha: 0.08 + Math.random() * 0.1,
      life: 1,
      decay: 0.003 + Math.random() * 0.004,
      wPhase: Math.random() * Math.PI * 2,
      wAmp: 0.35 + Math.random() * 0.8,
      wFreq: 0.02 + Math.random() * 0.04,
    });
  }

  // ── 水雾（极大极淡，营造弥漫感）──
  const mistCount = 2 + Math.floor(strength * 2);
  for (let i = 0; i < mistCount; i++) {
    result.push({
      x: x + (Math.random() - 0.5) * 22,
      y: bottom - Math.random() * 8,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.3 + Math.random() * 0.7),
      size: 12 + Math.random() * 10,
      maxSize: 32 + Math.random() * 28,
      growRate: 0.12 + Math.random() * 0.15,
      hue: hue + (Math.random() - 0.5) * 15,
      sat: 55 + Math.random() * 30,
      lit: 35 + Math.random() * 18,
      alpha: 0.04 + Math.random() * 0.04,
      life: 1,
      decay: 0.0012 + Math.random() * 0.0018,
      wPhase: Math.random() * Math.PI * 2,
      wAmp: 0.06 + Math.random() * 0.1,
      wFreq: 0.008 + Math.random() * 0.012,
    });
  }

  return result;
}

/** 持续喷墨：按住时从底部缓缓涌出 */
function spawnInkStream(x: number, h: number, hue: number): Particle {
  const spread = (Math.random() - 0.5) * 0.5;
  const upSpeed = -(0.35 + Math.random() * 0.85);
  return {
    x: x + (Math.random() - 0.5) * 8,
    y: h - Math.random() * 3,
    vx: spread,
    vy: upSpeed,
    size: 4 + Math.random() * 4,
    maxSize: 12 + Math.random() * 12,
    growRate: 0.15 + Math.random() * 0.2,
    hue: hue + (Math.random() - 0.5) * 20,
    sat: 65 + Math.random() * 30,
    lit: 40 + Math.random() * 20,
    alpha: 0.06 + Math.random() * 0.08,
    life: 1,
    decay: 0.0025 + Math.random() * 0.004,
    wPhase: Math.random() * Math.PI * 2,
    wAmp: 0.2 + Math.random() * 0.45,
    wFreq: 0.015 + Math.random() * 0.025,
  };
}

/* ═══════════════════════════════════════
   画布组件
   ═══════════════════════════════════════ */

interface ParticleCanvasProps {
  traces: PerformanceTrace[];
  activeAnchors: NoteAnchor[];
}

const MAX_PARTICLES = 400;
const BLUR_PX = 6; // CSS 像素模糊量
const TRAIL_FADE = 0.022; // 残影衰减速率（越小拖尾越长）

export function ParticleCanvas({ traces, activeAnchors }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const dataRef = useRef({ traces, activeAnchors });
  dataRef.current = { traces, activeAnchors };
  const rafRef = useRef(0);

  useEffect(() => {
    const cnv = canvasRef.current;
    const box = containerRef.current;
    if (!cnv || !box) return;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    // 离屏画布：积累墨水残影
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");
    if (!offCtx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      const r = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cnv.width = w * dpr;
      cnv.height = h * dpr;
      cnv.style.width = w + "px";
      cnv.style.height = h + "px";
      off.width = w * dpr;
      off.height = h * dpr;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(box);

    let alive = true;
    let tick = 0;

    const loop = () => {
      if (!alive) return;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const { traces: tr, activeAnchors: anch } = dataRef.current;

      // ── 1. 生成新墨团 ──
      for (let i = 0; i < tr.length; i++) {
        const t = tr[i];
        if (!seenIdsRef.current.has(t.id)) {
          seenIdsRef.current.add(t.id);
          const drops = spawnInkBurst(t.x * w, h, t.hue, t.strength);
          for (let j = 0; j < drops.length; j++) {
            particlesRef.current.push(drops[j]);
          }
        }
      }

      const liveIds = new Set<number>();
      for (let i = 0; i < tr.length; i++) liveIds.add(tr[i].id);
      seenIdsRef.current.forEach((id) => {
        if (!liveIds.has(id)) seenIdsRef.current.delete(id);
      });

      // ── 2. 持续喷墨（按住音符）──
      tick++;
      if (tick % 3 === 0) {
        for (let i = 0; i < anch.length; i++) {
          const a = anch[i];
          const hue = 8 + ((a.note % 12) / 12) * 35;
          particlesRef.current.push(spawnInkStream(a.x * w, h, hue));
        }
      }

      // ═══════════════════════════════════════
      // 离屏画布：残影衰减 + 绘制墨团
      // ═══════════════════════════════════════
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 残影衰减（逐帧降低透明度 → 产生拖尾水痕）
      offCtx.globalCompositeOperation = "destination-out";
      offCtx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
      offCtx.fillRect(0, 0, w, h);

      // 绘制墨团（screen 混合 → 颜色自然叠加，不过曝）
      offCtx.globalCompositeOperation = "screen";

      const next: Particle[] = [];
      const pts = particlesRef.current;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        p.life -= p.decay;
        if (p.life <= 0) continue;

        // 扩散（墨水在水中逐渐膨胀）
        if (p.size < p.maxSize) {
          p.size = Math.min(p.size + p.growRate, p.maxSize);
        }

        // 物理：向上运动 + 水中阻力 + 有机摇摆
        p.wPhase += p.wFreq;
        p.x += p.vx + Math.sin(p.wPhase) * p.wAmp;
        p.y += p.vy + Math.cos(p.wPhase * 0.7) * p.wAmp * 0.3;
        p.vx *= 0.993;
        p.vy *= 0.997;
        p.vy -= 0.002; // 浮力

        const a = p.alpha * p.life;
        if (a < 0.003) continue;

        // 实心圆（模糊由画布整体施加，无需逐粒子渐变）
        offCtx.beginPath();
        offCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        offCtx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${a.toFixed(4)})`;
        offCtx.fill();

        next.push(p);
      }
      offCtx.globalCompositeOperation = "source-over";

      particlesRef.current =
        next.length > MAX_PARTICLES ? next.slice(-MAX_PARTICLES) : next;

      // ═══════════════════════════════════════
      // 主画布：清屏 → 光柱 → 模糊合成墨水层
      // ═══════════════════════════════════════
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 活跃音符：底部光源 + 垂直光柱
      for (let i = 0; i < anch.length; i++) {
        const a = anch[i];
        const px = a.x * w;
        const hue = 8 + ((a.note % 12) / 12) * 35;

        const lg = ctx.createLinearGradient(px, h, px, 0);
        lg.addColorStop(0, `hsla(${hue},90%,55%,0.15)`);
        lg.addColorStop(0.3, `hsla(${hue},85%,50%,0.06)`);
        lg.addColorStop(0.7, `hsla(${hue},75%,45%,0.02)`);
        lg.addColorStop(1, `hsla(${hue},65%,40%,0)`);
        ctx.fillStyle = lg;
        ctx.fillRect(px - 14, 0, 28, h);

        const rg = ctx.createRadialGradient(px, h, 0, px, h, 36);
        rg.addColorStop(0, `hsla(${hue},100%,60%,0.22)`);
        rg.addColorStop(0.4, `hsla(${hue},90%,52%,0.08)`);
        rg.addColorStop(1, `hsla(${hue},80%,45%,0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(px - 36, h - 36, 72, 36);
      }

      // 核心：模糊合成离屏画布 → 墨水融为连续流体
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "screen";
      ctx.filter = `blur(${Math.round(BLUR_PX * dpr)}px)`;
      ctx.drawImage(off, 0, 0);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
