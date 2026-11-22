"use client";

import { useEffect, useRef } from "react";

interface StarMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  twinkleSpeed: number;
  color: string;
}

interface TrailSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

const STAR_PALETTE = [
  "192, 132, 252", // soft lavender
  "168, 85, 247",  // violet
  "244, 114, 182", // warm rose
  "245, 243, 250", // moonlit white
] as const;

function createStars(width: number, height: number): StarMote[] {
  const count = Math.min(72, Math.max(32, Math.floor((width * height) / 22000)));
  const stars: StarMote[] = [];

  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.06 - Math.random() * 0.2,
      radius: 0.9 + Math.random() * 1.6,
      alpha: 0.18 + Math.random() * 0.42,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.008 + Math.random() * 0.015,
      color: STAR_PALETTE[i % STAR_PALETTE.length],
    });
  }

  return stars;
}

export function InteractiveMidnightBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars = createStars(width, height);
    const sparks: TrailSpark[] = [];

    const pointer = {
      targetX: width * 0.5,
      targetY: height * 0.35,
      x: width * 0.5,
      y: height * 0.35,
      active: false,
      lastSparkAt: 0,
    };

    function resizeCanvas() {
      if (!canvas || !ctx) {
        return;
      }
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(width, height);
    }

    function drawStaticBackground() {
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${star.alpha})`;
        ctx.fill();
      }
    }

    resizeCanvas();

    if (reducedMotion) {
      drawStaticBackground();
      window.addEventListener("resize", resizeCanvas);
      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }

    function handlePointerMove(event: PointerEvent) {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.active = true;

      const now = performance.now();
      if (now - pointer.lastSparkAt > 36 && sparks.length < 28) {
        pointer.lastSparkAt = now;
        sparks.push({
          x: event.clientX + (Math.random() - 0.5) * 10,
          y: event.clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.25 - Math.random() * 0.45,
          life: 0,
          maxLife: 34 + Math.random() * 20,
          radius: 1 + Math.random() * 1.4,
          color: Math.random() > 0.35 ? "192, 132, 252" : "244, 114, 182",
        });
      }
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    let animationFrameId = 0;

    function renderFrame(timestamp: number) {
      if (!ctx) {
        return;
      }

      if (document.hidden) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Gentle ambient drift when pointer is idle/away
      if (!pointer.active) {
        pointer.targetX = width * (0.5 + Math.sin(timestamp * 0.00025) * 0.16);
        pointer.targetY = height * (0.4 + Math.cos(timestamp * 0.0002) * 0.12);
      }

      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;

      // Soft cursor-following violet & rose aurora wash
      const glowRadius = Math.max(260, Math.min(460, width * 0.34));
      const gradient = ctx.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        glowRadius
      );
      gradient.addColorStop(0, "rgba(168, 85, 247, 0.14)");
      gradient.addColorStop(0.45, "rgba(244, 114, 182, 0.05)");
      gradient.addColorStop(1, "rgba(11, 10, 16, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const interactRadius = 155;
      const interactRadiusSq = interactRadius * interactRadius;

      // Update & draw drifting stars + delicate cursor constellation lines
      for (const star of stars) {
        star.x += star.vx;
        star.y += star.vy;
        star.phase += star.twinkleSpeed;

        if (star.x < -12) {
          star.x = width + 12;
        } else if (star.x > width + 12) {
          star.x = -12;
        }

        if (star.y < -12) {
          star.y = height + 12;
        } else if (star.y > height + 12) {
          star.y = -12;
        }

        const dx = pointer.x - star.x;
        const dy = pointer.y - star.y;
        const distSq = dx * dx + dy * dy;

        let boost = 0;
        if (distSq < interactRadiusSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - dist / interactRadius;
          boost = proximity * 0.42;

          // Subtle organic drift toward cursor without clumping
          star.x += (dx / dist) * proximity * 0.28;
          star.y += (dy / dist) * proximity * 0.28;

          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.strokeStyle = `rgba(192, 132, 252, ${(proximity * 0.16).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        const twinkle = 0.65 + 0.35 * Math.sin(star.phase);
        const finalAlpha = Math.min(0.9, star.alpha * twinkle + boost);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius + boost * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${finalAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // Draw fading cursor stardust trail
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.life += 1;
        if (spark.life >= spark.maxLife) {
          sparks.splice(i, 1);
          continue;
        }

        spark.x += spark.vx;
        spark.y += spark.vy;
        const progress = spark.life / spark.maxLife;
        const alpha = (1 - progress) * 0.55;

        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.radius * (1 - progress * 0.45), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${spark.color}, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      animationFrameId = window.requestAnimationFrame(renderFrame);
    }

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
