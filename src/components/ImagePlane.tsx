"use client";

import { useEffect, useRef, useState } from "react";

type Props = { imageData: string; imageSize: { width: number; height: number }; focusPoint: { x: number; y: number }; viewZoom: number; panEnabled: boolean; panOffset: { x: number; y: number }; onPan: (delta: { x: number; y: number }) => void; children: React.ReactNode };

export function ImagePlane({ imageData, imageSize, focusPoint, viewZoom, panEnabled, panOffset, onPan, children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [plane, setPlane] = useState({ width: "100%", height: "100%", left: "0px", top: "0px" });
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const { width, height } = host.getBoundingClientRect();
      const desktop = width > 800;
      const targetX = desktop ? (375 + width) / 2 : width / 2;
      const targetY = desktop ? (height - 78) / 2 : height / 2;
      const baseScale = Math.max(
        width / imageSize.width, height / imageSize.height,
        targetX / Math.max(1, focusPoint.x * imageSize.width),
        (width - targetX) / Math.max(1, (1 - focusPoint.x) * imageSize.width),
        targetY / Math.max(1, focusPoint.y * imageSize.height),
        (height - targetY) / Math.max(1, (1 - focusPoint.y) * imageSize.height),
      );
      const scale = baseScale * viewZoom;
      const renderedWidth = imageSize.width * scale;
      const renderedHeight = imageSize.height * scale;
      setPlane({ width: `${renderedWidth}px`, height: `${renderedHeight}px`, left: `${targetX - focusPoint.x * renderedWidth}px`, top: `${targetY - focusPoint.y * renderedHeight}px` });
    };
    const observer = new ResizeObserver(update); observer.observe(host); update();
    return () => observer.disconnect();
  }, [focusPoint.x, focusPoint.y, imageSize.height, imageSize.width, viewZoom]);
  return <div ref={hostRef} className={`imagePlaneHost ${panEnabled ? "panActive" : ""}`}
    onPointerDown={(event) => { if (!panEnabled) return; event.preventDefault(); lastPointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={(event) => { if (!panEnabled || !lastPointer.current) return; const next = { x: event.clientX, y: event.clientY }; onPan({ x: next.x - lastPointer.current.x, y: next.y - lastPointer.current.y }); lastPointer.current = next; }}
    onPointerUp={(event) => { lastPointer.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { lastPointer.current = null; }}>
    <div className="imagePlane" style={{ ...plane, transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)` }}><img className="roomImage" src={imageData} alt="Habitación capturada para personalizar" />{children}</div>
  </div>;
}
