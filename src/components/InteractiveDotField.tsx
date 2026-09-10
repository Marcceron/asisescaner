"use client";

import { useEffect, useRef } from "react";

export function InteractiveDotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    let width = 1;
    let height = 1;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = host.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const onLeave = () => { pointer = null; };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const spacing = 18;
      const interactionRadius = 190;
      const motion = reduceMotion ? 0 : time * .00022;
      const driftX = Math.sin(motion * 1.7) * spacing;
      const driftY = Math.cos(motion * 1.3) * spacing;

      for (let y = -spacing; y < height + spacing; y += spacing) {
        for (let x = -spacing; x < width + spacing; x += spacing) {
          const column = Math.round(x / spacing);
          const row = Math.round(y / spacing);
          const px = x + driftX + Math.sin(motion * 7 + row * .37) * 2.2;
          const py = y + driftY + Math.cos(motion * 6 + column * .31) * 2.2;
          const distance = pointer ? Math.hypot(px - pointer.x, py - pointer.y) : interactionRadius;
          const influence = pointer ? Math.max(0, 1 - distance / interactionRadius) : 0;
          const eased = influence * influence * (3 - 2 * influence);
          const radius = .76 + eased * 3.45;
          const shade = Math.round(188 + eased * 67);
          const opacity = .1 + eased * .84;
          context.beginPath();
          context.arc(px, py, radius, 0, Math.PI * 2);
          context.fillStyle = `rgba(${shade},${shade},${shade},${opacity})`;
          context.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    resize();
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="dotPattern" aria-hidden="true" />;
}
