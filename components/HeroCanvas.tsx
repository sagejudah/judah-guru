'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  scatterX: number;
  scatterY: number;
  size: number;
  gold: boolean;
  phase: number;
  jitterAmp: number;
};

const PARTICLE_COUNT = 78;

/** Classic parametric heart curve, filled in loosely toward the center. */
function buildHeartTargets(width: number, height: number, count: number) {
  const points: { x: number; y: number }[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) * 0.034;

  const outline = Math.round(count * 0.65);
  for (let i = 0; i < outline; i++) {
    const t = (i / outline) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3;
    const hy =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    points.push({ x: cx + hx * scale, y: cy - hy * scale });
  }

  const interior = count - outline;
  for (let i = 0; i < interior; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    const hx = 16 * Math.sin(t) ** 3 * r;
    const hy =
      (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r;
    points.push({ x: cx + hx * scale, y: cy - hy * scale });
  }

  return points;
}

/** Ring + vertical bar + two lower diagonals, like a peace sign. */
function buildPeaceTargets(width: number, height: number, count: number) {
  const points: { x: number; y: number }[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.36;

  const ringCount = Math.round(count * 0.55);
  for (let i = 0; i < ringCount; i++) {
    const t = (i / ringCount) * Math.PI * 2;
    points.push({ x: cx + Math.cos(t) * R, y: cy + Math.sin(t) * R });
  }

  const barCount = count - ringCount;
  const perBar = Math.floor(barCount / 3);

  for (let i = 0; i < perBar; i++) {
    const f = i / (perBar - 1);
    points.push({ x: cx, y: cy - R + f * 2 * R });
  }
  for (let i = 0; i < perBar; i++) {
    const f = i / (perBar - 1);
    points.push({ x: cx - Math.sin(Math.PI / 6) * R * f, y: cy + Math.cos(Math.PI / 6) * R * f });
  }
  const remaining = barCount - 2 * perBar;
  for (let i = 0; i < remaining; i++) {
    const f = i / Math.max(remaining - 1, 1);
    points.push({ x: cx + Math.sin(Math.PI / 6) * R * f, y: cy + Math.cos(Math.PI / 6) * R * f });
  }

  return points;
}

/** A face ring, two dot eyes, and an inverted (upside-down) smile arc. */
function buildFaceTargets(width: number, height: number, count: number) {
  const points: { x: number; y: number }[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.36;

  const ringCount = Math.round(count * 0.6);
  for (let i = 0; i < ringCount; i++) {
    const t = (i / ringCount) * Math.PI * 2;
    points.push({ x: cx + Math.cos(t) * R, y: cy + Math.sin(t) * R });
  }

  const eyeCount = Math.round(count * 0.12);
  const eyeR = R * 0.1;
  for (let i = 0; i < eyeCount; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = eyeR * Math.sqrt(Math.random());
    const side = i < eyeCount / 2 ? -1 : 1;
    points.push({
      x: cx + side * R * 0.36 + Math.cos(t) * r,
      y: cy - R * 0.14 + Math.sin(t) * r,
    });
  }

  const mouthCount = count - ringCount - eyeCount;
  const mouthR = R * 0.46;
  const mouthCy = cy + R * 0.4;
  const startA = Math.PI * 1.15;
  const endA = Math.PI * 1.85;
  for (let i = 0; i < mouthCount; i++) {
    const f = i / Math.max(mouthCount - 1, 1);
    const t = startA + (endA - startA) * f;
    points.push({ x: cx + Math.cos(t) * mouthR, y: mouthCy + Math.sin(t) * mouthR });
  }

  return points;
}

const SHAPE_BUILDERS = [buildHeartTargets, buildPeaceTargets, buildFaceTargets];

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    let shapeSets: { x: number; y: number }[][] = [];
    let raf = 0;
    const start = performance.now();

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = width + 'px';
      canvas!.style.height = height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      shapeSets = SHAPE_BUILDERS.map((build) => build(width, height, PARTICLE_COUNT));

      particles = shapeSets[0].map((_, i) => ({
        scatterX: Math.random() * width,
        scatterY: Math.random() * height,
        size: 1.1 + Math.random() * 1.7,
        gold: i % 5 === 0,
        phase: Math.random() * Math.PI * 2,
        jitterAmp: 2 + Math.random() * 3,
      }));
    }

    function frame(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const elapsed = (now - start) / 1000;

      // Continuous breathing loop: a sine wave has no start/stop to notice.
      const raw = reduceMotion ? 1 : (Math.sin(elapsed * 0.28) + 1) / 2;
      const assemble = raw * raw * (3 - 2 * raw); // smoothstep easing

      // The shape swaps once per full sine cycle, right at the trough
      // (fully scattered), so the change itself is never visible.
      const cyclePos = (elapsed * 0.28) / (Math.PI * 2);
      const shapeIndex = reduceMotion
        ? 0
        : Math.floor(cyclePos + 0.25) % SHAPE_BUILDERS.length;
      const targets = shapeSets[shapeIndex] || shapeSets[0];

      particles.forEach((p, i) => {
        const target = targets[i];
        if (!target) return;

        const jitterX = reduceMotion ? 0 : Math.sin(elapsed * 0.6 + p.phase) * p.jitterAmp;
        const jitterY = reduceMotion
          ? 0
          : Math.cos(elapsed * 0.5 + p.phase * 1.3) * p.jitterAmp;

        const x =
          p.scatterX + (target.x - p.scatterX) * assemble + jitterX * (0.3 + assemble * 0.7);
        const y =
          p.scatterY + (target.y - p.scatterY) * assemble + jitterY * (0.3 + assemble * 0.7);

        const alpha = 0.14 + assemble * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(201, 161, 90, ${alpha})`
          : `rgba(241, 239, 233, ${alpha * 0.65})`;
        ctx.fill();
      });

      if (!reduceMotion) {
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hero-wrap" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
