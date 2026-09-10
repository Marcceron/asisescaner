"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { StandardReferencePrediction } from "@/services/measurement/standard-reference-detector";

type Box = StandardReferencePrediction["referenceBox"];
type Corner = "move" | "nw" | "ne" | "se" | "sw";
type Props = { reference: StandardReferencePrediction; onChange: (box: Box) => void };

export function ReferenceOverlay({ reference, onChange }: Props) {
  function startEdit(event: ReactPointerEvent<HTMLElement>, corner: Corner) {
    event.preventDefault();
    event.stopPropagation();
    const plane = event.currentTarget.closest(".imagePlane");
    if (!(plane instanceof HTMLElement)) return;
    const bounds = plane.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = reference.referenceBox;

    const move = (pointerEvent: PointerEvent) => {
      const dx = (pointerEvent.clientX - startX) / bounds.width;
      const dy = (pointerEvent.clientY - startY) / bounds.height;
      let left = initial.x;
      let top = initial.y;
      let right = initial.x + initial.width;
      let bottom = initial.y + initial.height;
      if (corner === "move") {
        left = Math.max(0, Math.min(1 - initial.width, initial.x + dx));
        top = Math.max(0, Math.min(1 - initial.height, initial.y + dy));
        right = left + initial.width;
        bottom = top + initial.height;
      } else {
        if (corner.includes("w")) left = Math.max(0, Math.min(right - .015, left + dx));
        if (corner.includes("e")) right = Math.min(1, Math.max(left + .015, right + dx));
        if (corner.includes("n")) top = Math.max(0, Math.min(bottom - .015, top + dy));
        if (corner.includes("s")) bottom = Math.min(1, Math.max(top + .015, bottom + dy));
      }
      onChange({ x: left, y: top, width: right - left, height: bottom - top });
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  }

  const box = reference.referenceBox;
  return <div className="standardReferenceBox" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }} onPointerDown={(event) => startEdit(event, "move")}>
    <span>{reference.label}</span>
    {(["nw", "ne", "se", "sw"] as const).map((corner) => <button key={corner} className={`referenceHandle ${corner}`} aria-label={`Ajustar referencia ${corner}`} onPointerDown={(event) => startEdit(event, corner)} />)}
  </div>;
}
