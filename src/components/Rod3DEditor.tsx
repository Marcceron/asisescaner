"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Object3D } from "three";
import type { Point, Product } from "@/domain/types";
import { projectIntoQuadrilateral } from "@/services/visualization/perspective";
import { createSurfaceMaterial, disposeSurfaceMaterial } from "@/services/visualization/surface-material";
import { calculateCurtainDrape } from "@/services/visualization/curtain-drape";
import { estimateSceneLighting } from "@/services/visualization/scene-lighting";

type TransformMode = "translate" | "rotate" | "scale";
type PartId = "hook" | "wand" | "curtain" | "tube" | "bracket-left" | "bracket-right" | "finial-left" | "finial-right";
export type RodEditorProps = { imageData: string; layerOrder: string[]; polygon: [Point, Point, Point, Point]; hook?: Product; wand?: Product; rod?: Product; curtain?: Product; bracket?: Product; finial?: Product; onDeleteHook: () => void; onDeleteWand: () => void; onDeleteRod: () => void; onDeleteCurtain: () => void; onDeleteBracket: () => void; onDeleteFinial: () => void };

const labels: Record<PartId, string> = {
  hook: "Gancho", wand: "Varilla",
  curtain: "Cortina", tube: "Tubo", "bracket-left": "Soporte izquierdo",
  "bracket-right": "Soporte derecho", "finial-left": "Remate izquierdo", "finial-right": "Remate derecho",
};

export function Rod3DEditor({ imageData, layerOrder, polygon, rod, curtain, bracket, finial, hook, wand, onDeleteHook, onDeleteWand, onDeleteRod, onDeleteCurtain, onDeleteBracket, onDeleteFinial }: RodEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<TransformMode>("translate");
  const selectPartRef = useRef<(part: PartId) => void>(() => {});
  const [mode, setMode] = useState<TransformMode>("translate");
  const canUsePortal = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [selectedPart, setSelectedPart] = useState<PartId>(rod ? "tube" : bracket ? "bracket-left" : finial ? "finial-left" : hook ? "hook" : wand ? "wand" : "curtain");
  const selectedPartRef = useRef<PartId>(selectedPart);
  const rodId = rod?.id;
  const bracketId = bracket?.id;
  const finialId = finial?.id;
  const curtainId = curtain?.id;
  const curtainStyle = curtain?.renderStyle;
  const layerOrderKey = layerOrder.join("|");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedPartRef.current = selectedPart; }, [selectedPart]);

  const availableParts: PartId[] = [
    ...(hook ? ["hook" as const] : []),
    ...(wand ? ["wand" as const] : []),
    ...(curtain ? ["curtain" as const] : []),
    ...(rod ? ["tube" as const] : []),
    ...(bracket ? ["bracket-left", "bracket-right"] as const : []),
    ...(finial ? ["finial-left", "finial-right"] as const : []),
  ];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const target = host; let disposed = false; let cleanup = () => {};
    const orderedLayers = layerOrderKey ? layerOrderKey.split("|") : [];
    void Promise.all([import("three"), import("three/examples/jsm/controls/TransformControls.js"), import("three/examples/jsm/environments/RoomEnvironment.js"), estimateSceneLighting(imageData)]).then(([THREE, { TransformControls }, { RoomEnvironment }, lighting]) => {
      if (disposed) return;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -20, 20); camera.position.set(0, 0, 8);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .86;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.domElement.className = "rod3dCanvas"; renderer.domElement.setAttribute("aria-label", "Editor de componentes 3D"); target.appendChild(renderer.domElement);
      const environmentScene = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
      const environmentMap = pmrem.fromScene(environmentScene, .035).texture; scene.environment = environmentMap;
      scene.add(new THREE.HemisphereLight(lighting.ambientColor, 0x302a25, lighting.ambientIntensity));
      const light = new THREE.DirectionalLight(lighting.keyColor, lighting.keyIntensity);
      const keyX = Math.abs(lighting.directionX) < .28 ? (lighting.directionX < 0 ? -.28 : .28) : lighting.directionX;
      light.position.set(keyX * 5, lighting.directionY * 3.5, 3); light.castShadow = true;
      light.shadow.mapSize.set(window.devicePixelRatio > 1 ? 1024 : 768, window.devicePixelRatio > 1 ? 1024 : 768);
      light.shadow.bias = -.00035; light.shadow.normalBias = .025; light.shadow.radius = 3;
      light.shadow.camera.near = .1; light.shadow.camera.far = 14;
      light.shadow.camera.left = -4; light.shadow.camera.right = 4; light.shadow.camera.top = 3; light.shadow.camera.bottom = -3;
      scene.add(light);
      const fill = new THREE.DirectionalLight(lighting.ambientColor, .12);
      fill.position.set(-lighting.directionX * 3, -lighting.directionY * 2, 3); scene.add(fill);
      const shadowMaterial = new THREE.ShadowMaterial({ color: 0x17120e, opacity: .24, transparent: true, depthWrite: false });
      const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shadowMaterial);
      shadowCatcher.position.z = -.025; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);
      const rodMaterial = createSurfaceMaterial(rod);
      const hookMaterial = createSurfaceMaterial(hook);
      const wandMaterial = createSurfaceMaterial(wand);
      const finialMaterial = createSurfaceMaterial(finial);
      const bracketMaterial = createSurfaceMaterial(bracket);
      const curtainMaterial = createSurfaceMaterial(curtain, true);
      const parts = new Map<PartId, Object3D>();
      const layerDepth = (product?: Product) => product ? Math.max(0, orderedLayers.length - 1 - orderedLayers.indexOf(product.id)) * .018 : 0;
      const register = (id: PartId, object: Object3D, product?: Product) => {
        object.userData.partId = id; object.userData.layerDepth = layerDepth(product);
        object.userData.layerRenderOrder = product ? orderedLayers.length - orderedLayers.indexOf(product.id) : 0;
        parts.set(id, object); scene.add(object); return object;
      };
      if (hook) {
        const group = register("hook", new THREE.Group(), hook);
        if (hook.material === "walnut") group.scale.x = -1;
        group.add(new THREE.Mesh(new THREE.TorusGeometry(.052, .01, 8, 24), hookMaterial));
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, -.05, 0), new THREE.Vector3(0, -.10, 0),
          new THREE.Vector3(.026, -.12, 0), new THREE.Vector3(.04, -.085, 0),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, .007, 8, false), hookMaterial));
      }
      if (wand) {
        const group = register("wand", new THREE.Group(), wand);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .75, 12), wandMaterial);
        shaft.position.y = -.405; group.add(shaft);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(.022, .018, .14, 12), wandMaterial);
        grip.position.y = -.8; group.add(grip);
        group.add(new THREE.Mesh(new THREE.TorusGeometry(.025, .007, 8, 16, Math.PI * 1.7), wandMaterial));
      }

      if (curtainId) {
        const group = register("curtain", new THREE.Group(), curtain);
        const panels = curtainStyle === "roller" ? 1 : 2;
        for (let index = 0; index < panels; index += 1) {
          const geometry = new THREE.PlaneGeometry(1, 1, curtainStyle === "roller" ? 24 : 48, curtainStyle === "roller" ? 18 : 30);
          const panel = new THREE.Mesh(geometry, curtainMaterial);
          panel.castShadow = curtainStyle !== "sheer";
          const gap = panels === 2 ? (curtain?.pattern ? .012 : .006) : 0;
          panel.userData.uStart = index / panels + (index === 1 ? gap : 0);
          panel.userData.uEnd = (index + 1) / panels - (index === 0 ? gap : 0);
          panel.name = "curtain-panel"; group.add(panel);
        }
        if (curtainStyle === "roller") {
          const cassette = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 20), curtainMaterial); cassette.name = "roller-cassette"; group.add(cassette);
        }
      }
      if (rodId) {
        const tube = register("tube", new THREE.Group(), rod); tube.rotation.z = Math.PI / 2;
        const hollow = rod?.material === "brass";
        tube.add(new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, 1, 24, 1, hollow), rodMaterial));
        if (hollow) {
          const inner = new THREE.CylinderGeometry(.026, .026, 1, 24, 1, true);
          // Reverse the inner shell so the hollow tube is visible through its ends.
          inner.scale(-1, 1, 1);
          tube.add(new THREE.Mesh(inner, rodMaterial));
          for (const sign of [-1, 1]) {
            const rim = new THREE.Mesh(new THREE.RingGeometry(.026, .032, 24), rodMaterial);
            rim.rotation.x = -sign * Math.PI / 2; rim.position.y = sign * .5; tube.add(rim);
          }
        }
      }
      if (finialId) {
        for (const side of ["left", "right"] as const) {
          if (finial?.material === "brass") {
            const group = register(`finial-${side}`, new THREE.Group(), finial);
            group.add(new THREE.Mesh(new THREE.SphereGeometry(.07, 22, 14), finialMaterial));
            const collar = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .035, 20), finialMaterial);
            collar.rotation.z = Math.PI / 2; collar.position.x = side === "left" ? .072 : -.072;
            group.add(collar);
            continue;
          }
          const geometry = finialId === "finial-cap" ? new THREE.CylinderGeometry(.06, .06, .055, 22) : new THREE.SphereGeometry(.07, 22, 14);
          const object = register(`finial-${side}`, new THREE.Mesh(geometry, finialMaterial), finial);
          if (finialId === "finial-cap") object.rotation.z = Math.PI / 2;
        }
      }
      if (bracketId) {
        for (const side of ["left", "right"] as const) {
          const support = register(`bracket-${side}`, new THREE.Group(), bracket);
          const depth = bracketId === "bracket-wall-deep" ? .26 : .18;
          if (bracket?.material === "brass" || bracket?.material === "walnut") {
            const stemShape = new THREE.Shape();
            stemShape.moveTo(-.022, -.045); stemShape.lineTo(.022, -.045);
            stemShape.lineTo(.022, -depth); stemShape.lineTo(-.022, -depth); stemShape.closePath();
            if (bracket.material === "brass") {
              for (const y of [-.085, -.145]) {
                const hole = new THREE.Path(); hole.absarc(0, y, .007, 0, Math.PI * 2, true); stemShape.holes.push(hole);
              }
            }
            const cradle = new THREE.Shape();
            cradle.absarc(0, .005, .06, Math.PI, Math.PI * 2, false);
            cradle.lineTo(.042, .005);
            cradle.absarc(0, .005, .042, 0, -Math.PI, true); cradle.closePath();
            for (const shape of [stemShape, cradle]) {
              support.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .028, bevelEnabled: false, curveSegments: 16 }), bracketMaterial));
            }
            continue;
          }
          const stem = new THREE.Mesh(new THREE.BoxGeometry(.035, depth, .05), bracketMaterial); stem.position.y = -depth * .45; support.add(stem);
          const cup = new THREE.Mesh(new THREE.TorusGeometry(.047, .012, 10, 18, Math.PI), bracketMaterial); cup.rotation.z = Math.PI; cup.position.y = .02; support.add(cup);
        }
      }

      const controls = new TransformControls(camera, renderer.domElement); controls.setMode(modeRef.current); controls.setSpace("local"); controls.setSize(.7); scene.add(controls.getHelper());
      const initialPart = parts.has(selectedPartRef.current) ? selectedPartRef.current : (parts.keys().next().value as PartId); controls.attach(parts.get(initialPart)!);
      selectPartRef.current = (part) => { const object = parts.get(part); if (object) controls.attach(object); };
      let controlsDragging = false; controls.addEventListener("dragging-changed", (event) => { controlsDragging = Boolean(event.value); });

      const topLeft = polygon[0]; const topRight = polygon[1];
      function layout() {
        const width = Math.max(1, target.clientWidth); const height = Math.max(1, target.clientHeight); const aspect = width / height;
        renderer.setSize(width, height, false); camera.left = -aspect; camera.right = aspect; camera.top = 1; camera.bottom = -1; camera.updateProjectionMatrix();
        shadowCatcher.scale.set(aspect, 1, 1);
        const point = (value: Point) => new THREE.Vector3((value.x - .5) * 2 * aspect, (.5 - value.y) * 2, .08);
        const tl = point(topLeft); const tr = point(topRight);
        const topCenter = tl.clone().add(tr).multiplyScalar(.5);
        const windowWidth = tl.distanceTo(tr); const angle = Math.atan2(tr.y - tl.y, tr.x - tl.x);
        for (const [id, u] of [["hook", .22], ["wand", .93]] as const) {
          const part = parts.get(id);
          if (part) {
            part.position.copy(point(projectIntoQuadrilateral(polygon, u, 0)));
            part.position.y += .055; part.position.z += .08 + Number(part.userData.layerDepth);
            part.rotation.z = angle;
          }
        }
        const curtainPart = parts.get("curtain");
        if (curtainPart) { curtainPart.position.z = Number(curtainPart.userData.layerDepth); curtainPart.children.forEach((child) => {
          if (child.name === "curtain-panel" && child instanceof THREE.Mesh) {
            const geometry = child.geometry as InstanceType<typeof THREE.PlaneGeometry>;
            const position = geometry.getAttribute("position"); const uv = geometry.getAttribute("uv");
            const uStart = Number(child.userData.uStart); const uEnd = Number(child.userData.uEnd);
            for (let vertex = 0; vertex < position.count; vertex += 1) {
              const u = uStart + uv.getX(vertex) * (uEnd - uStart); const v = 1 - uv.getY(vertex);
              const drape = calculateCurtainDrape({ u, v, uStart, uEnd, windowWidth, style: curtainStyle });
              const projected = projectIntoQuadrilateral(polygon, drape.u, drape.v);
              const scenePoint = point(projected);
              position.setXYZ(vertex, scenePoint.x, scenePoint.y, scenePoint.z + drape.depth);
            }
            position.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
          } else if (child.name === "roller-cassette") {
            child.position.copy(topCenter); child.rotation.z = Math.PI / 2 + angle; child.scale.set(1, windowWidth, 1);
          }
        }); }
        const tube = parts.get("tube"); if (tube) { tube.position.copy(topCenter).add(new THREE.Vector3(0, .055, .02 + Number(tube.userData.layerDepth))); tube.rotation.z = Math.PI / 2 + angle; tube.scale.set(1, windowWidth * 1.1, 1); }
        for (const side of ["left", "right"] as const) {
          const sign = side === "left" ? -1 : 1; const anchor = topCenter.clone().add(new THREE.Vector3(Math.cos(angle) * windowWidth * .55 * sign, Math.sin(angle) * windowWidth * .55 * sign + .055, .02));
          const positionedFinial = parts.get(`finial-${side}`); positionedFinial?.position.copy(anchor); if (positionedFinial) positionedFinial.position.z += Number(positionedFinial.userData.layerDepth);
          const finialPart = parts.get(`finial-${side}`);
          if (finialPart && finial?.material === "brass") finialPart.rotation.z = angle;
          const bracket = parts.get(`bracket-${side}`); if (bracket) { bracket.position.copy(topCenter).add(new THREE.Vector3(Math.cos(angle) * windowWidth * .38 * sign, Math.sin(angle) * windowWidth * .38 * sign + .03, Number(bracket.userData.layerDepth))); bracket.rotation.z = angle; }
        }
      }
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object !== shadowCatcher && object.name !== "curtain-panel") object.castShadow = true;
      });
      for (const part of parts.values()) part.traverse((object) => { object.renderOrder = Number(part.userData.layerRenderOrder); });
      layout(); const resize = new ResizeObserver(layout); resize.observe(target);

      const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
      const onDown = (event: PointerEvent) => {
        if (controlsDragging) return; const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects([...parts.values()], true)[0]?.object; let object: Object3D | null = hit ?? null;
        while (object && !object.userData.partId) object = object.parent;
        const part = object?.userData.partId as PartId | undefined; if (part) { controls.attach(parts.get(part)!); setSelectedPart(part); }
      };
      renderer.domElement.addEventListener("pointerdown", onDown);
      let frame = 0; const render = () => { frame = requestAnimationFrame(render); controls.setMode(modeRef.current); renderer.render(scene, camera); }; render();
      cleanup = () => { cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); renderer.domElement.removeEventListener("pointerdown", onDown); scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); }); [rodMaterial, hookMaterial, wandMaterial, finialMaterial, bracketMaterial, curtainMaterial].forEach(disposeSurfaceMaterial); shadowMaterial.dispose(); environmentMap.dispose(); environmentScene.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    });
    return () => { disposed = true; cleanup(); };
  }, [bracketId, curtainId, curtainStyle, finialId, imageData, layerOrderKey, polygon, rodId, hook, wand, finial, rod, bracket, curtain]);

  const selectedKind = selectedPart === "hook" || selectedPart === "wand" ? selectedPart : selectedPart === "curtain" ? "curtain" : selectedPart === "tube" ? "rod" : selectedPart.startsWith("bracket") ? "bracket" : "finial";
  const deleteSelected = { hook: onDeleteHook, wand: onDeleteWand, curtain: onDeleteCurtain, rod: onDeleteRod, bracket: onDeleteBracket, finial: onDeleteFinial }[selectedKind];
  const selectedProductName = { hook, wand, curtain, rod, bracket, finial }[selectedKind]?.name;
  const controlsOverlay = <>
    <div className="gizmoToolbar" aria-label="Controladores 3D">
      <select aria-label="Componente 3D" value={selectedPart} onChange={(event) => { const part = event.target.value as PartId; setSelectedPart(part); selectPartRef.current(part); }}>{availableParts.map((part) => <option key={part} value={part}>{labels[part]}</option>)}</select>
      <button className={mode === "translate" ? "active" : ""} onClick={() => setMode("translate")} aria-label={`Mover ${labels[selectedPart]}`}>Mover</button>
      <button className={mode === "rotate" ? "active" : ""} onClick={() => setMode("rotate")} aria-label={`Rotar ${labels[selectedPart]}`}>Rotar</button>
      <button className={mode === "scale" ? "active" : ""} onClick={() => setMode("scale")} aria-label={`Escalar ${labels[selectedPart]}`}>Escala</button>
      <button className="danger" onClick={deleteSelected} aria-label={`Eliminar ${selectedProductName}`}><img src="/assets/delete.svg" alt="" />Eliminar</button>
    </div>
    <span className="gizmoHint">Editando: {labels[selectedPart]} · selecciona otra pieza en la imagen o en el menú</span>
  </>;

  return <div ref={hostRef} className="rod3dEditor">
    {canUsePortal && createPortal(controlsOverlay, document.body)}
  </div>;
}
