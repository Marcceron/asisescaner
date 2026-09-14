"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Point, Product } from "@/domain/types";
import { useConfiguratorStore, type AssetTransform } from "@/store/configurator-store";
import type { RodEditorProps } from "./Rod3DEditor";

type EditMode = "translate" | "rotate" | "scale";
type PartId = "hook" | "wand" | "curtain" | "tube" | "bracket-left" | "bracket-right" | "finial-left" | "finial-right";
type Part = { id: PartId; product: Product; image: HTMLImageElement; crop?: [number, number, number, number] };
type CanvasPoint = { x: number; y: number };
type Quad = [CanvasPoint, CanvasPoint, CanvasPoint, CanvasPoint];
type Placement = { cx: number; cy: number; width: number; height: number; angle: number; quad?: Quad };

const labels: Record<PartId, string> = { hook: "Gancho", wand: "Varilla", curtain: "Cortina", tube: "Cortinero", "bracket-left": "Soporte izquierdo", "bracket-right": "Soporte derecho", "finial-left": "Remate izquierdo", "finial-right": "Remate derecho" };
const blankTransform = (): AssetTransform => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } });

function overlayUrl(product: Product) {
  const style = product.renderStyle;
  if (!style || !["wave", "blackout", "sheer", "roller", "rod", "bracket", "finial", "hook", "wand"].includes(style)) return product.image;
  if (product.id.includes("curtain-grid")) return "/assets/overlays/curtain-grid.png?v=2";
  if (product.id.includes("curtain-stripes")) return "/assets/overlays/curtain-stripes.png?v=2";
  if (style === "wave" || style === "blackout" || style === "sheer" || style === "roller") return "/assets/overlays/curtain-dots.png?v=2";
  const walnut = product.material === "walnut" || product.material === "wood" || product.id.includes("wood");
  return `/assets/overlays/${style === "rod" ? "rod" : style}-${walnut ? "walnut" : "brass"}.png?v=2`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}

function quadPoint([tl, tr, br, bl]: Quad, u: number, v: number): CanvasPoint {
  return {
    x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x,
    y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y,
  };
}

function drawImageTriangle(context: CanvasRenderingContext2D, image: HTMLImageElement, source: [CanvasPoint, CanvasPoint, CanvasPoint], target: [CanvasPoint, CanvasPoint, CanvasPoint]) {
  const [s0, s1, s2] = source; const [d0, d1, d2] = target;
  const denominator = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denominator) < .0001) return;
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denominator;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denominator;
  const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denominator;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denominator;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denominator;
  const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denominator;
  context.save(); context.beginPath(); context.moveTo(d0.x, d0.y); context.lineTo(d1.x, d1.y); context.lineTo(d2.x, d2.y); context.closePath(); context.clip(); context.transform(a, b, c, d, e, f); context.drawImage(image, 0, 0); context.restore();
}

function drawImageInQuad(context: CanvasRenderingContext2D, image: HTMLImageElement, quad: Quad, crop: [number, number, number, number]) {
  const columns = 10; const rows = 12;
  const sourceLeft = crop[0] * image.naturalWidth; const sourceTop = crop[1] * image.naturalHeight;
  const sourceWidth = crop[2] * image.naturalWidth; const sourceHeight = crop[3] * image.naturalHeight;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const u0 = column / columns; const u1 = (column + 1) / columns; const v0 = row / rows; const v1 = (row + 1) / rows;
    const s00 = { x: sourceLeft + u0 * sourceWidth, y: sourceTop + v0 * sourceHeight }; const s10 = { x: sourceLeft + u1 * sourceWidth, y: sourceTop + v0 * sourceHeight };
    const s11 = { x: sourceLeft + u1 * sourceWidth, y: sourceTop + v1 * sourceHeight }; const s01 = { x: sourceLeft + u0 * sourceWidth, y: sourceTop + v1 * sourceHeight };
    const d00 = quadPoint(quad, u0, v0); const d10 = quadPoint(quad, u1, v0); const d11 = quadPoint(quad, u1, v1); const d01 = quadPoint(quad, u0, v1);
    drawImageTriangle(context, image, [s00, s10, s11], [d00, d10, d11]); drawImageTriangle(context, image, [s00, s11, s01], [d00, d11, d01]);
  }
}

export function ImageAssetEditor({ layerOrder, polygon, rod, curtain, bracket, finial, hook, wand, onDeleteHook, onDeleteWand, onDeleteRod, onDeleteCurtain, onDeleteBracket, onDeleteFinial }: RodEditorProps) {
  const initialPart: PartId = rod ? "tube" : curtain ? "curtain" : bracket ? "bracket-left" : finial ? "finial-left" : hook ? "hook" : "wand";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partsRef = useRef<Part[]>([]);
  const placementsRef = useRef(new Map<PartId, Placement>());
  const modeRef = useRef<EditMode>("translate");
  const selectedRef = useRef<PartId>(initialPart);
  const [mode, setMode] = useState<EditMode>("translate");
  const [selectedPart, setSelectedPart] = useState<PartId>(initialPart);
  const [ready, setReady] = useState(false);
  const canUsePortal = useSyncExternalStore(() => () => {}, () => true, () => false);
  const controlsHidden = useRef(false);

  const specs = useMemo(() => [
    hook && { id: "hook" as const, product: hook }, wand && { id: "wand" as const, product: wand },
    curtain && { id: "curtain" as const, product: curtain, crop: [.18, .02, .62, .94] as [number, number, number, number] }, rod && { id: "tube" as const, product: rod, crop: [0, .25, 1, .5] as [number, number, number, number] },
    bracket && { id: "bracket-left" as const, product: bracket }, bracket && { id: "bracket-right" as const, product: bracket },
    finial && !rod && { id: "finial-left" as const, product: finial, crop: [0, 0, .5, 1] as [number, number, number, number] },
    finial && !rod && { id: "finial-right" as const, product: finial, crop: [.5, 0, .5, 1] as [number, number, number, number] },
  ].filter(Boolean) as Array<{ id: PartId; product: Product; crop?: [number, number, number, number] }>, [bracket, curtain, finial, hook, rod, wand]);

  const availableParts = specs.map(({ id }) => id);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedRef.current = selectedPart; }, [selectedPart]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(specs.map(async (spec) => ({ ...spec, image: await loadImage(overlayUrl(spec.product)) }))).then((parts) => {
      if (!cancelled) { partsRef.current = parts; setReady(true); }
    });
    return () => { cancelled = true; };
  }, [specs]);

  useEffect(() => {
    const canvas = canvasRef.current; const host = canvas?.parentElement;
    if (!canvas || !host || !ready) return;
    const context = canvas.getContext("2d"); if (!context) return;
    let frame = 0; let dragging: { part: PartId; startX: number; startY: number; startAngle: number; transform: AssetTransform } | null = null;

    const keyFor = (part: Part) => `image:${part.product.id}:${part.id}`;
    const getTransform = (part: Part) => useConfiguratorStore.getState().assetTransforms[keyFor(part)] ?? blankTransform();
    const point = (value: Point, bounds: DOMRect, editor: DOMRect) => ({ x: bounds.left - editor.left + value.x * bounds.width, y: bounds.top - editor.top + value.y * bounds.height });

    const render = () => {
      frame = requestAnimationFrame(render);
      const ratio = Math.min(window.devicePixelRatio, 2); const width = Math.max(1, host.clientWidth); const height = Math.max(1, host.clientHeight);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; }
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
      const imageBounds = host.parentElement?.getBoundingClientRect() ?? host.getBoundingClientRect(); const editorBounds = host.getBoundingClientRect();
      const corners = polygon.map((value) => point(value, imageBounds, editorBounds));
      const [tl, tr, br, bl] = corners; const topWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y); const windowHeight = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;
      const angle = Math.atan2(tr.y - tl.y, tr.x - tl.x); const center = { x: (tl.x + tr.x + br.x + bl.x) / 4, y: (tl.y + tr.y + br.y + bl.y) / 4 };
      const base = (id: PartId): Placement => {
        if (id === "curtain") return { cx: center.x, cy: center.y, width: topWidth, height: windowHeight, angle: 0, quad: [tl, tr, br, bl] };
        if (id === "tube") return { cx: (tl.x + tr.x) / 2, cy: (tl.y + tr.y) / 2 - topWidth * .035, width: topWidth * 1.18, height: topWidth * .16, angle };
        if (id === "wand") return { cx: tr.x - topWidth * .08, cy: tr.y + windowHeight * .38, width: windowHeight * .58, height: windowHeight * .58, angle: -Math.PI / 4 };
        if (id === "hook") return { cx: tl.x + topWidth * .25, cy: tl.y + topWidth * .02, width: topWidth * .12, height: topWidth * .12, angle };
        if (id.startsWith("bracket")) { const left = id.endsWith("left"); return { cx: left ? tl.x + topWidth * .13 : tr.x - topWidth * .13, cy: (left ? tl.y : tr.y) + topWidth * .035, width: topWidth * .13, height: topWidth * .13, angle }; }
        const left = id.endsWith("left"); return { cx: left ? tl.x - topWidth * .055 : tr.x + topWidth * .055, cy: left ? tl.y : tr.y, width: topWidth * .15, height: topWidth * .15, angle };
      };

      const ordered = [...partsRef.current].sort((a, b) => layerOrder.indexOf(b.product.id) - layerOrder.indexOf(a.product.id));
      placementsRef.current.clear();
      for (const part of ordered) {
        const placement = base(part.id); const transform = getTransform(part);
        const translation = { x: transform.position.x * imageBounds.width, y: transform.position.y * imageBounds.height };
        placement.cx += translation.x; placement.cy += translation.y;
        placement.width *= transform.scale.x; placement.height *= transform.scale.y; placement.angle += transform.rotation.z;
        if (placement.quad) placement.quad = placement.quad.map((corner) => {
          const x = (corner.x - center.x) * transform.scale.x; const y = (corner.y - center.y) * transform.scale.y;
          const cos = Math.cos(transform.rotation.z); const sin = Math.sin(transform.rotation.z);
          return { x: center.x + translation.x + x * cos - y * sin, y: center.y + translation.y + x * sin + y * cos };
        }) as Quad;
        placementsRef.current.set(part.id, placement);
        const crop = part.crop ?? [0, 0, 1, 1];
        if (placement.quad) {
          context.save(); context.globalAlpha = .94; drawImageInQuad(context, part.image, placement.quad, crop); context.restore();
        } else {
          context.save(); context.translate(placement.cx, placement.cy); context.rotate(placement.angle); context.filter = "drop-shadow(0 6px 7px rgba(0,0,0,.22))";
          context.drawImage(part.image, crop[0] * part.image.naturalWidth, crop[1] * part.image.naturalHeight, crop[2] * part.image.naturalWidth, crop[3] * part.image.naturalHeight, -placement.width / 2, -placement.height / 2, placement.width, placement.height); context.restore();
        }
      }

      if (!controlsHidden.current) {
        const selected = placementsRef.current.get(selectedRef.current);
        if (selected) {
          context.save(); context.strokeStyle = "rgba(0,145,255,.95)"; context.lineWidth = 1.5; context.setLineDash([6, 5]);
          if (selected.quad) { context.beginPath(); selected.quad.forEach((corner, index) => index ? context.lineTo(corner.x, corner.y) : context.moveTo(corner.x, corner.y)); context.closePath(); context.stroke(); } else { context.translate(selected.cx, selected.cy); context.rotate(selected.angle); context.strokeRect(-selected.width / 2, -selected.height / 2, selected.width, selected.height); }
          context.setLineDash([]);
          context.fillStyle = modeRef.current === "rotate" ? "#ffd43b" : modeRef.current === "scale" ? "#00c853" : "#079cf1";
          const handles = selected.quad ?? [[-selected.width / 2, -selected.height / 2], [selected.width / 2, -selected.height / 2], [selected.width / 2, selected.height / 2], [-selected.width / 2, selected.height / 2]].map(([x, y]) => ({ x, y })) as Quad;
          for (const handle of handles) { context.beginPath(); context.arc(handle.x, handle.y, 6, 0, Math.PI * 2); context.fill(); context.strokeStyle = "white"; context.lineWidth = 2; context.stroke(); }
          context.restore();
        }
      }
    };

    const hitPart = (x: number, y: number) => [...partsRef.current].reverse().find((part) => { const p = placementsRef.current.get(part.id); if (!p) return false; const dx = x - p.cx; const dy = y - p.cy; const cos = Math.cos(-p.angle); const sin = Math.sin(-p.angle); const lx = dx * cos - dy * sin; const ly = dx * sin + dy * cos; return Math.abs(lx) <= p.width / 2 && Math.abs(ly) <= p.height / 2; });
    const onDown = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const part = hitPart(x, y); if (!part) return; selectedRef.current = part.id; setSelectedPart(part.id); const p = placementsRef.current.get(part.id)!; dragging = { part: part.id, startX: x, startY: y, startAngle: Math.atan2(y - p.cy, x - p.cx), transform: structuredClone(getTransform(part)) }; canvas.setPointerCapture(event.pointerId); };
    const onMove = (event: PointerEvent) => { if (!dragging) return; const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const part = partsRef.current.find((candidate) => candidate.id === dragging!.part); const p = placementsRef.current.get(dragging.part); if (!part || !p) return; const next = structuredClone(dragging.transform); const imageBounds = host.parentElement?.getBoundingClientRect() ?? host.getBoundingClientRect(); if (modeRef.current === "translate") { next.position.x += (x - dragging.startX) / imageBounds.width; next.position.y += (y - dragging.startY) / imageBounds.height; } else if (modeRef.current === "rotate") next.rotation.z += Math.atan2(y - p.cy, x - p.cx) - dragging.startAngle; else { const factor = Math.max(.15, 1 + (x - dragging.startX + y - dragging.startY) / 260); next.scale.x = dragging.transform.scale.x * factor; next.scale.y = dragging.transform.scale.y * factor; } useConfiguratorStore.getState().setAssetTransform(keyFor(part), next); };
    const onUp = (event: PointerEvent) => { dragging = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
    const onCapture = (event: Event) => { controlsHidden.current = Boolean((event as CustomEvent<boolean>).detail); };
    canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp); window.addEventListener("asis:quote-capture", onCapture); render();
    return () => { cancelAnimationFrame(frame); canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp); window.removeEventListener("asis:quote-capture", onCapture); };
  }, [layerOrder, polygon, ready]);

  const selectedKind = selectedPart === "hook" || selectedPart === "wand" ? selectedPart : selectedPart === "curtain" ? "curtain" : selectedPart === "tube" ? "rod" : selectedPart.startsWith("bracket") ? "bracket" : "finial";
  const deleteSelected = { hook: onDeleteHook, wand: onDeleteWand, curtain: onDeleteCurtain, rod: onDeleteRod, bracket: onDeleteBracket, finial: onDeleteFinial }[selectedKind];
  const controls = <><div className="gizmoToolbar" aria-label="Controladores de imagen"><select aria-label="Componente" value={selectedPart} onChange={(event) => { const part = event.target.value as PartId; selectedRef.current = part; setSelectedPart(part); }}>{availableParts.map((part) => <option key={part} value={part}>{labels[part]}</option>)}</select><button className={mode === "translate" ? "active" : ""} onClick={() => setMode("translate")}>Mover</button><button className={mode === "rotate" ? "active" : ""} onClick={() => setMode("rotate")}>Rotar</button><button className={mode === "scale" ? "active" : ""} onClick={() => setMode("scale")}>Escala</button><button className="danger" onClick={deleteSelected}><img src="/assets/delete.svg" alt="" />Eliminar</button></div><span className="gizmoHint">Editando imagen: {labels[selectedPart]} · arrastra sobre el asset para ajustar</span></>;
  return <div className="imageAssetEditor"><canvas ref={canvasRef} className="asset2dCanvas" aria-label="Editor de imágenes de productos" />{canUsePortal && createPortal(controls, document.body)}</div>;
}
