"use client";

import { useRef } from "react";
import type { Point } from "@/domain/types";

type Props = {
  polygon: [Point, Point, Point, Point];
  widthCm: number;
  heightCm: number;
  aspectRatio: number;
  onPointChange: (index: number, point: Point) => void;
};

function clamp(value: number) { return Math.max(0.015, Math.min(0.985, value)); }
function angle(a: Point, b: Point, aspectRatio: number) { return Math.atan2(b.y - a.y, (b.x - a.x) * aspectRatio) * 180 / Math.PI; }

export function MeasurementOverlay({ polygon, widthCm, heightCm, aspectRatio, onPointChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activePoint = useRef<number | null>(null);
  const points = polygon.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
  const topMid = { x: (polygon[0].x + polygon[1].x) / 2, y: (polygon[0].y + polygon[1].y) / 2 };
  const rightMid = { x: (polygon[1].x + polygon[2].x) / 2, y: (polygon[1].y + polygon[2].y) / 2 };

  function updatePoint(event: React.PointerEvent<HTMLButtonElement>) {
    const index = activePoint.current;
    const rect = rootRef.current?.getBoundingClientRect();
    if (index === null || !rect) return;
    onPointChange(index, { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) });
  }

  function stopDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activePoint.current = null;
  }

  return (
    <div ref={rootRef} className="measurementOverlay" aria-label="Área de medición editable">
      <svg className="measurementLines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={points} className="measurementPolygon" />
      </svg>
      <span className="measureLabel measureLabelWidth" style={{ left: `${topMid.x * 100}%`, top: `${topMid.y * 100}%`, rotate: `${angle(polygon[0], polygon[1], aspectRatio)}deg` }}>L {Math.round(widthCm) || "—"} CM</span>
      <span className="measureLabel measureLabelHeight" style={{ left: `${rightMid.x * 100}%`, top: `${rightMid.y * 100}%`, rotate: `${angle(polygon[1], polygon[2], aspectRatio)}deg` }}>{Math.round(heightCm) || "—"} CM</span>
      {polygon.map((point, index) => (
        <button key={index} type="button" className="measurementNode" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} aria-label={`Nodo de medición ${index + 1}`}
          onPointerDown={(event) => { event.preventDefault(); activePoint.current = index; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={updatePoint} onPointerUp={stopDrag} onPointerCancel={stopDrag}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.02 : 0.004;
            const next = { ...point };
            if (event.key === "ArrowLeft") next.x -= step; else if (event.key === "ArrowRight") next.x += step;
            else if (event.key === "ArrowUp") next.y -= step; else if (event.key === "ArrowDown") next.y += step; else return;
            event.preventDefault(); onPointChange(index, { x: clamp(next.x), y: clamp(next.y) });
          }}><span /></button>
      ))}
      <span className="measurementEditBadge" style={{ left: `${polygon[1].x * 100}%`, top: `${polygon[1].y * 100}%` }} aria-hidden="true"><img src="/assets/edit.svg" alt="" /></span>
    </div>
  );
}
