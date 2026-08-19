'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  scatterX: number;
  scatterY: number;
  targetX: number;
  targetY: number;
  size: number;
  gold: boolean;
  phase: number;
  jitterAmp: number;
};

const PARTICLE_COUNT = 72;

/**
 * Generates target points along a soft, asymmetric blob — two loosely
 * overlapping lobes with an organic wobble. This is deliberately abstract:
 * it should read as "a shape gathering itself," not an anatomical diagram.
 */
function buildTargets(width: number, height: number, count: number) {
  const points: { x: number; y: number }[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const baseR = Math.min(width, height) * 0.34;

  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const wobble =
      1 +
      0.16 * Math.sin(t * 3 + 1.1) +
      0.09 * Math.sin(t * 5 + 2.4) +
      0.05 * Math.sin(t * 8 + 0.6);
    const r = baseR * wobble;
    const lobeShift = Math.cos(t) >= 0 ? 5 : -5;

    points.push({
      x: cx + Math.cos(t) * r * 1.15 + lobeShift,
      y: cy + Math.sin(t) * r * 0.82,
    });
  }

  // A handful of interior points so the shape doesn't read as a hollow ring.
  const interior = Math.round(count * 0.25);
  for (let i = 0; i < interior; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = baseR * 0.5 * Math.random();
    points.push({
      x: cx + Math.cos(t) * r * 1.15,
      y: cy + Math.sin(t) * r * 0.82,
    });
  }

  return points;
}

export default function BrainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
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

      const targets = buildTargets(width, height, PARTICLE_COUNT);
      particles = targets.map((p, i) => ({
        scatterX: Math.random() * width,
        scatterY: Math.random() * height,
        targetX: p.x,
        targetY: p.y,
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

      // Continuous breathing loop: a sine wave has no start/stop to notice,
      // so the assemble <-> scatter cycle just goes on forever.
      const raw = reduceMotion ? 1 : (Math.sin(elapsed * 0.28) + 1) / 2;
      const assemble = raw * raw * (3 - 2 * raw); // smoothstep easing

      for (const p of particles) {
        const jitterX = reduceMotion
          ? 0
          : Math.sin(elapsed * 0.6 + p.phase) * p.jitterAmp;
        const jitterY = reduceMotion
          ? 0
          : Math.cos(elapsed * 0.5 + p.phase * 1.3) * p.jitterAmp;

        const x =
          p.scatterX +
          (p.targetX - p.scatterX) * assemble +
          jitterX * (0.3 + assemble * 0.7);
        const y =
          p.scatterY +
          (p.targetY - p.scatterY) * assemble +
          jitterY * (0.3 + assemble * 0.7);

        const alpha = 0.14 + assemble * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(201, 161, 90, ${alpha})`
          : `rgba(241, 239, 233, ${alpha * 0.65})`;
        ctx.fill();
      }

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
    <div className="brain-wrap" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
