"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Point, Product } from "@/domain/types";
import { useConfiguratorStore, type AssetTransform } from "@/store/configurator-store";
import type { RodEditorProps } from "./Rod3DEditor";

type EditMode = "translate" | "rotate" | "scale";
type PartId = "hook" | "wand" | "curtain" | "tube" | "bracket-left" | "bracket-right" | "finial-left" | "finial-right";
type Part = { id: PartId; product: Product; image: HTMLImageElement; crop?: [number, number, number, number] };
type Placement = { cx: number; cy: number; width: number; height: number; angle: number };

const labels: Record<PartId, string> = { hook: "Gancho", wand: "Varilla", curtain: "Cortina", tube: "Tubo", "bracket-left": "Soporte izquierdo", "bracket-right": "Soporte derecho", "finial-left": "Remate izquierdo", "finial-right": "Remate derecho" };
const blankTransform = (): AssetTransform => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } });

function overlayUrl(product: Product) {
  const style = product.renderStyle;
  if (!style || !["wave", "blackout", "sheer", "roller", "rod", "bracket", "finial", "hook", "wand"].includes(style)) return product.image;
  if (product.id.includes("curtain-grid")) return "/assets/overlays/curtain-grid.png";
  if (product.id.includes("curtain-stripes")) return "/assets/overlays/curtain-stripes.png";
  if (style === "wave" || style === "blackout" || style === "sheer" || style === "roller") return "/assets/overlays/curtain-dots.png";
  const walnut = product.material === "walnut" || product.material === "wood" || product.id.includes("wood");
  return `/assets/overlays/${style === "rod" ? "rod" : style}-${walnut ? "walnut" : "brass"}.png`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
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
    curtain && { id: "curtain" as const, product: curtain }, rod && { id: "tube" as const, product: rod, crop: [0, .3, 1, .4] as [number, number, number, number] },
    bracket && { id: "bracket-left" as const, product: bracket }, bracket && { id: "bracket-right" as const, product: bracket },
    finial && { id: "finial-left" as const, product: finial, crop: [0, 0, .5, 1] as [number, number, number, number] },
    finial && { id: "finial-right" as const, product: finial, crop: [.5, 0, .5, 1] as [number, number, number, number] },
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
        if (id === "curtain") return { cx: center.x, cy: center.y + windowHeight * .03, width: topWidth, height: windowHeight * 1.04, angle };
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
        placement.cx += transform.position.x * imageBounds.width; placement.cy += transform.position.y * imageBounds.height;
        placement.width *= transform.scale.x; placement.height *= transform.scale.y; placement.angle += transform.rotation.z;
        placementsRef.current.set(part.id, placement);
        const crop = part.crop ?? [0, 0, 1, 1];
        context.save(); context.translate(placement.cx, placement.cy); context.rotate(placement.angle);
        context.globalAlpha = part.id === "curtain" ? .94 : 1;
        context.filter = "drop-shadow(0 6px 7px rgba(0,0,0,.22))";
        context.drawImage(part.image, crop[0] * part.image.naturalWidth, crop[1] * part.image.naturalHeight, crop[2] * part.image.naturalWidth, crop[3] * part.image.naturalHeight, -placement.width / 2, -placement.height / 2, placement.width, placement.height);
        context.restore();
      }

      if (!controlsHidden.current) {
        const selected = placementsRef.current.get(selectedRef.current);
        if (selected) {
          context.save(); context.translate(selected.cx, selected.cy); context.rotate(selected.angle); context.strokeStyle = "rgba(0,145,255,.95)"; context.lineWidth = 1.5; context.setLineDash([6, 5]); context.strokeRect(-selected.width / 2, -selected.height / 2, selected.width, selected.height); context.setLineDash([]);
          context.fillStyle = modeRef.current === "rotate" ? "#ffd43b" : modeRef.current === "scale" ? "#00c853" : "#079cf1";
          for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { context.beginPath(); context.arc(x * selected.width / 2, y * selected.height / 2, 6, 0, Math.PI * 2); context.fill(); context.strokeStyle = "white"; context.lineWidth = 2; context.stroke(); }
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
