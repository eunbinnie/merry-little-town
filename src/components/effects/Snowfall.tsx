"use client";

import { useEffect, useRef } from "react";

type Flake = { x: number; y: number; size: number; speed: number; phase: number; sway: number };

/**
 * Pixel snowfall on one canvas. Flakes are squares sized in art pixels (read
 * from the scene's --px) and snapped to that grid so they match the sprites.
 * `burst` briefly thickens the snow for the final celebration.
 */
export function Snowfall({ burst = false }: { burst?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef(burst);

  useEffect(() => {
    burstRef.current = burst;
  }, [burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let unit = 2;
    let flakes: Flake[] = [];
    let extra: Flake[] = [];
    let raf = 0;
    let last = 0;

    const make = (anywhere: boolean): Flake => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -Math.random() * h * 0.5,
      size: Math.random() < 0.25 ? 2 : 1,
      speed: 7 + Math.random() * 10, // art px per second
      phase: Math.random() * Math.PI * 2,
      sway: 0.4 + Math.random() * 1.2,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const core = document.querySelector(".core");
      unit = core ? core.getBoundingClientRect().width / 256 : 2;
      const count = Math.min(180, Math.max(50, Math.round((w * h) / (unit * unit * 420))));
      flakes = Array.from({ length: count }, () => make(true));
      extra = Array.from({ length: Math.round(count * 0.8) }, () => make(false));
      draw(0, 0);
    };

    const step = (list: Flake[], dt: number, t: number) => {
      for (const f of list) {
        f.y += f.speed * unit * dt;
        f.x += Math.sin(t * 0.0008 + f.phase) * f.sway * unit * dt * 2;
        if (f.y > h + 4) Object.assign(f, make(false), { y: -unit * 2 });
        if (f.x < -4) f.x = w + 2;
        if (f.x > w + 4) f.x = -2;
      }
    };

    const paint = (list: Flake[]) => {
      for (const f of list) {
        ctx.fillStyle = f.size === 2 ? "#f7f9fc" : "rgba(232,237,243,0.72)";
        const s = f.size * unit;
        ctx.fillRect(Math.round(f.x / unit) * unit, Math.round(f.y / unit) * unit, s, s);
      }
    };

    const draw = (dt: number, t: number) => {
      ctx.clearRect(0, 0, w, h);
      step(flakes, dt, t);
      paint(flakes);
      if (burstRef.current) {
        step(extra, dt * 1.4, t);
        paint(extra);
      }
    };

    const loop = (t: number) => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      draw(dt, t);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (!document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}
