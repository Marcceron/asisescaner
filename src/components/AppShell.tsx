"use client";

import { useEffect, useMemo, useState } from "react";
import { categoryLabels, products as defaultProducts } from "@/data/catalog";
import type { Product } from "@/domain/types";
import type { MeasurementEdge } from "@/domain/types";
import { formatMoney } from "@/lib/money";
import { calculateMeasurement, distance } from "@/services/measurement/geometry";
import { inferWindowHeightFromReference, referencePresets, StandardReferenceDetector, type ReferenceKind, type StandardReferencePrediction } from "@/services/measurement/standard-reference-detector";
import { AssistedWindowDetector } from "@/services/vision/window-detector";
import { useConfiguratorStore } from "@/store/configurator-store";
import { CameraCapture } from "./CameraCapture";
import { MeasurementOverlay } from "./MeasurementOverlay";
import { ImagePlane } from "./ImagePlane";
import { InteractiveDotField } from "./InteractiveDotField";
import { PerspectiveAssetLayer } from "./PerspectiveAssetLayer";
import { ProductPanel } from "./ProductPanel";
import { QuoteDialog } from "./QuoteDialog";
import { captureConfiguredSceneJpeg } from "@/services/quotation/capture-scene";
import { ReferenceOverlay } from "./ReferenceOverlay";

export function AppShell() {
  const store = useConfiguratorStore();
  const { imageData, imageSize, polygon, setMeasurement, undoSelection, redoSelection } = store;
  const [cameraOpen, setCameraOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [knownWidthCm, setKnownWidthCm] = useState<number | "">("");
  const [knownEdge, setKnownEdge] = useState<MeasurementEdge>("width");
  const [isDetecting, setIsDetecting] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"measurement" | "editing">("measurement");
  const [viewZoom, setViewZoom] = useState(1);
  const [panEnabled, setPanEnabled] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [referencePrediction, setReferencePrediction] = useState<StandardReferencePrediction | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(defaultProducts);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [catalogCategories, setCatalogCategories] = useState(Object.entries(categoryLabels).map(([id, label], order) => ({ id, label, order })));

  useEffect(() => {
    void fetch("/api/catalog").then((response) => response.ok ? response.json() : null).then((catalog) => {
      if (!catalog) return;
      setCatalogProducts(catalog.products);
      setCatalogCategories(catalog.categories);
      const currentStore = useConfiguratorStore.getState();
      if (!catalog.categories.some((category: { id: string }) => category.id === currentStore.activeCategory)) {
        currentStore.setActiveCategory(catalog.categories[0]?.id ?? "cortinas");
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redoSelection(); else undoSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redoSelection, undoSelection]);

  const selectedProducts = useMemo(
    () => store.selectedItems.flatMap((item) => {
      const product = catalogProducts.find((candidate) => candidate.id === item.productId);
      return product ? [{ ...product, quantity: item.quantity }] : [];
    }),
    [catalogProducts, store.selectedItems],
  );
  const totalCents = selectedProducts.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const selectedCurtain = selectedProducts.find((product) => product.category === "cortinas");
  const selectedRod = selectedProducts.find((product) => product.category === "cortinero");
  const selectedBracket = selectedProducts.find((product) => product.category === "soportes");
  const selectedHook = selectedProducts.find((product) => product.category === "ganchos");
  const selectedWand = selectedProducts.find((product) => product.category === "varillas");
  const selectedCord = selectedProducts.find((product) => product.category === "cordones");
  const windowCenter = useMemo(() => ({
    x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
    y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
  }), [polygon]);
  const referenceWindowHeightCm = useMemo(() => {
    if (!referencePrediction || !imageData) return null;
    const windowHeightPx = Math.sqrt(
      distance(polygon[0], polygon[3], imageSize.width, imageSize.height)
      * distance(polygon[1], polygon[2], imageSize.width, imageSize.height),
    );
    return inferWindowHeightFromReference(windowHeightPx, referencePrediction.referenceBox.height * imageSize.height, referencePrediction.referenceHeightCm, referencePrediction.calibrationOffsetCm);
  }, [imageData, imageSize.height, imageSize.width, polygon, referencePrediction]);

  useEffect(() => {
    if (!imageData) return;
    const calibrationValue = referencePrediction ? referenceWindowHeightCm : knownWidthCm;
    setMeasurement(
      calculateMeasurement(polygon, imageSize.width, imageSize.height, calibrationValue === "" || calibrationValue === null ? null : { value: calibrationValue, unit: "centimeters", edge: referencePrediction ? "height" : knownEdge, source: referencePrediction ? "standard-object" : "user", confidence: referencePrediction?.confidence }),
    );
  }, [knownEdge, knownWidthCm, imageData, imageSize.height, imageSize.width, polygon, referencePrediction, referenceWindowHeightCm, setMeasurement]);

  function addManualReference() {
    const maxX = Math.max(...polygon.map((point) => point.x));
    const centerY = polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length;
    setReferencePrediction({
      object: "switch-plate", label: referencePresets["switch-plate"].label,
      referenceHeightCm: referencePresets["switch-plate"].heightCm,
      calibrationOffsetCm: 3,
      confidence: .7, detected: false, windowHeightCm: 0,
      referenceBox: { x: Math.min(.92, maxX + .04), y: Math.max(.02, centerY - .055), width: .045, height: .11 },
    });
    setWorkspaceMode("measurement");
  }

  function handleCapture(dataUrl: string, size: { width: number; height: number }, demo = false) {
    setKnownWidthCm(demo ? 130 : "");
    setKnownEdge("width");
    setReferencePrediction(null);
    setWorkspaceMode("measurement");
    setViewZoom(1);
    setPanEnabled(false);
    setPanOffset({ x: 0, y: 0 });
    store.setImage(dataUrl, size);
    setIsDetecting(true);
    const image = new Image();
    image.onload = async () => {
      try {
        const [detection] = await new AssistedWindowDetector().detect(image);
        if (demo) {
          // Ground-truth for the bundled Figma room keeps the demo focused on
          // the real window while uploaded photos use the detector above.
          store.setPolygon([
            { x: 0.407, y: 0.285 }, { x: 0.597, y: 0.278 },
            { x: 0.598, y: 0.54 }, { x: 0.41, y: 0.537 },
          ]);
        } else if (detection) {
          store.setPolygon(detection.polygon);
          const prediction = await new StandardReferenceDetector().detect(image, detection.polygon);
          if (prediction) {
            setReferencePrediction(prediction);
            setKnownEdge("height");
            setKnownWidthCm(prediction.windowHeightCm);
          }
        }
      } finally {
        setIsDetecting(false);
      }
    };
    image.onerror = () => setIsDetecting(false);
    image.src = dataUrl;
  }

  async function captureQuoteScene() {
    setPanEnabled(false);
    if (workspaceMode !== "editing") {
      setWorkspaceMode("editing");
    }
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const renderer = document.querySelector<HTMLCanvasElement>(".asset2dCanvas, .rod3dCanvas");
      if (renderer && renderer.width > 1 && renderer.height > 1 && renderer.dataset.ready !== "false") break;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return captureConfiguredSceneJpeg();
  }

  return (
    <main className={`appShell ${store.imageData ? "hasImage" : "empty"}`}>
      <aside className={`sidePanel ${mobilePanelOpen ? "mobileOpen" : ""}`}>
        <header className="brand">
          <img src="/assets/logo.svg" alt="" width="70" height="44" />
          <div><span>Asis Escáner</span><strong>Diseña tu propia cortina</strong></div>
          <button className="mobileClose" onClick={() => setMobilePanelOpen(false)} aria-label="Cerrar catálogo">×</button>
        </header>

        <section className="dimensions" aria-labelledby="dimensions-title">
          <div className="dimensionRow"><span id="dimensions-title">Dimensiones</span>
            <label>L <input aria-label="Ancho en centímetros" inputMode="decimal" value={store.measurement.widthCm || ""} placeholder="0" onChange={(e) => store.patchMeasurement({ widthCm: Number(e.target.value) || 0 })} /> CM</label>
            <label>A <input aria-label="Alto en centímetros" inputMode="decimal" value={store.measurement.heightCm || ""} placeholder="0" onChange={(e) => store.patchMeasurement({ heightCm: Number(e.target.value) || 0 })} /> CM</label>
          </div>
          {store.imageData && !referencePrediction && <div className="dimensionRow referenceRow"><span>Medida conocida</span><select aria-label="Segmento de referencia" value={knownEdge} onChange={(event) => setKnownEdge(event.target.value as MeasurementEdge)}><option value="width">Ancho (L)</option><option value="height">Alto (A)</option></select><label>{knownEdge === "width" ? "L" : "A"} <input aria-label="Medida real de referencia" inputMode="decimal" value={knownWidthCm} placeholder="—" onChange={(e) => setKnownWidthCm(e.target.value === "" ? "" : Number(e.target.value))} /> CM</label></div>}
          {store.imageData && !referencePrediction && <button className="addReferenceButton" onClick={addManualReference}>Calibrar con un objeto</button>}
          {referencePrediction && <div className="referenceEditor"><div><strong>{referencePrediction.detected ? "Referencia detectada" : "Referencia manual"}</strong><button onClick={() => { setReferencePrediction(null); setKnownWidthCm(""); }}>Quitar</button></div><label>Objeto<select aria-label="Tipo de referencia" value={referencePrediction.object} onChange={(event) => { const object = event.target.value as ReferenceKind; const preset = referencePresets[object]; setReferencePrediction((current) => current && ({ ...current, object, label: preset.label, referenceHeightCm: preset.heightCm, detected: false, confidence: .85 })); }}><option value="switch-plate">Apagador / contacto</option><option value="cup">Taza</option><option value="bottle">Botella</option><option value="custom">Otro objeto</option></select></label><label>Alto real<input aria-label="Altura real del objeto" type="number" min="1" max="200" step="0.1" value={referencePrediction.referenceHeightCm} onChange={(event) => setReferencePrediction((current) => current && ({ ...current, referenceHeightCm: Number(event.target.value) || 1, detected: false, confidence: .95 }))} /> CM</label><small>Arrastra el recuadro y sus nodos hasta cubrir exactamente el objeto.</small></div>}
          {store.imageData && <small>{store.measurement.calibrated ? `${store.measurement.perspectiveCorrected ? "Perspectiva corregida" : "Proporción frontal"} · diagonal ${store.measurement.diagonalCm} cm · margen aproximado ±${store.measurement.errorMarginPercent}%` : "Ingresa una medida real para calcular la dimensión faltante"}</small>}
        </section>

        {store.imageData ? (
          <>
            <ProductPanel
              activeCategory={store.activeCategory}
              selectedItems={store.selectedItems}
              onCategoryChange={store.setActiveCategory}
              onToggle={(productId, category) => { store.toggleProduct(productId, category); setWorkspaceMode("editing"); }}
              products={catalogProducts}
              categories={catalogCategories}
            />
          </>
        ) : (
          <section className="emptyPrompt">
            <img src="/assets/camera.svg" alt="" width="32" height="32" />
            <p>Toma una foto a una ventana para empezar a personalizar tu cortina</p>
          </section>
        )}

        <div className="sideAction">
          <button className="primaryButton" onClick={() => { if (store.imageData) { setMobilePanelOpen(false); setWorkspaceMode("editing"); } else setCameraOpen(true); }}>
            {store.imageData ? "Agregar a la ventana" : "Tomar una foto"}
          </button>
        </div>
      </aside>

      <section className="visualStage" aria-label="Vista de la habitación y la ventana">
        {store.imageData ? (
          <>
            <ImagePlane imageData={store.imageData} imageSize={store.imageSize} focusPoint={windowCenter} viewZoom={viewZoom} panEnabled={panEnabled} panOffset={panOffset} onPan={(delta) => setPanOffset((current) => ({ x: current.x + delta.x, y: current.y + delta.y }))}>
              {workspaceMode === "editing" && <PerspectiveAssetLayer layerOrder={selectedProducts.map((product) => product.id)} imageData={store.imageData} hook={selectedHook} wand={selectedWand} cord={selectedCord} onDeleteHook={() => { if (selectedHook) store.removeProduct(selectedHook.id); }} onDeleteWand={() => { if (selectedWand) store.removeProduct(selectedWand.id); }} onDeleteCord={() => { if (selectedCord) store.removeProduct(selectedCord.id); }} polygon={store.polygon} curtain={selectedCurtain} rod={selectedRod} bracket={selectedBracket} onDeleteRod={() => { if (selectedRod) store.removeProduct(selectedRod.id); }} onDeleteCurtain={() => { if (selectedCurtain) store.removeProduct(selectedCurtain.id); }} onDeleteBracket={() => { if (selectedBracket) store.removeProduct(selectedBracket.id); }} onDeleteFinial={() => {}} />}
              {workspaceMode === "measurement" && referencePrediction && <ReferenceOverlay reference={referencePrediction} onChange={(referenceBox) => setReferencePrediction((current) => current && ({ ...current, referenceBox, detected: false }))} />}
              {workspaceMode === "measurement" && <MeasurementOverlay polygon={store.polygon} widthCm={store.measurement.widthCm} heightCm={store.measurement.heightCm} aspectRatio={store.imageSize.width / store.imageSize.height} onPointChange={store.setPolygonPoint} />}
            </ImagePlane>
            <div className="modePill" aria-live="polite">
              <span>{isDetecting ? "Detectando ventana…" : workspaceMode === "measurement" ? "Modo Medición" : "Modo Edición"}</span>
              <button className={workspaceMode === "measurement" ? "active" : ""} onClick={() => { setPanEnabled(false); setWorkspaceMode("measurement"); }} aria-label="Modo Medición" aria-pressed={workspaceMode === "measurement"} title="Ajustar las cuatro esquinas y calcular medidas."><img src="/assets/resize.svg" alt="" width="24" height="24" /></button>
              <button className={workspaceMode === "editing" ? "active" : ""} onClick={() => { setPanEnabled(false); setWorkspaceMode("editing"); }} aria-label="Modo Edición" aria-pressed={workspaceMode === "editing"} title="Colocar los assets sobre la ventana."><img src="/assets/edit.svg" alt="" width="18" height="18" /></button>
            </div>
            <div className="floatingTools" aria-label="Herramientas">
              <button onClick={() => setCameraOpen(true)} aria-label="Tomar otra fotografía"><img src="/assets/camera.svg" alt="" width="28" height="28" /></button>
              <button onClick={() => { setPanEnabled(false); setWorkspaceMode("measurement"); }} aria-label="Ajustar medición" aria-pressed={!panEnabled && workspaceMode === "measurement"}><img src="/assets/cursor.svg" alt="" width="28" height="28" /></button>
              <button onClick={() => setPanEnabled((value) => !value)} aria-label="Herramienta de mano para paneo" aria-pressed={panEnabled} title="Mover la mesa de trabajo"><img src="/assets/hand.svg" alt="" width="28" height="28" /></button>
              <button className="historyButton" onClick={undoSelection} disabled={!store.selectionPast.length} aria-label="Deshacer" title="Deshacer (⌘/Ctrl+Z)"><span aria-hidden="true">↶</span></button>
              <button className="historyButton" onClick={redoSelection} disabled={!store.selectionFuture.length} aria-label="Rehacer" title="Rehacer (⌘/Ctrl+Shift+Z)"><span aria-hidden="true">↷</span></button>
              <button className="zoomTool" onClick={() => setViewZoom((value) => Math.max(.15, Math.round(value / 1.25 * 100) / 100))} aria-label="Alejar imagen" disabled={viewZoom <= .15} title="Alejar imagen"><span aria-hidden="true">−</span></button>
              <button className="zoomTool" onClick={() => setViewZoom((value) => Math.min(6, Math.round(value * 1.25 * 100) / 100))} aria-label="Acercar imagen" disabled={viewZoom >= 6} title="Acercar imagen"><span aria-hidden="true">+</span></button>
              <button onClick={store.resetProject} aria-label="Eliminar fotografía"><img src="/assets/delete.svg" alt="" width="28" height="28" /></button>
            </div>
            <output className="zoomStatus" aria-live="polite">{Math.round(viewZoom * 100)}%</output>
          </>
        ) : (
          <div className="stageEmpty">
            <InteractiveDotField />
            <button className="stageCameraButton" onClick={() => setCameraOpen(true)} aria-label="Capturar una ventana">
              <img src="/assets/camera.svg" alt="" width="32" height="32" />
              <span>Capturar una ventana</span>
            </button>
          </div>
        )}
      </section>

      <footer className="summaryBar">
        <button className="mobileCatalogButton" onClick={() => setMobilePanelOpen(true)}>Personalizar</button>
        <div className="selectionSummary">
          <span>Capas:<small> izquierda = frente</small></span>
          <div className="selectionItems" role="list" aria-label="Orden de capas de assets">
            {selectedProducts.length ? selectedProducts.map((product, index) => (
              <div className={`selectionThumbnail ${draggedProductId === product.id ? "dragging" : ""}`} key={product.id} draggable
                role="listitem" tabIndex={0} aria-label={`${product.name}, capa ${index + 1} de ${selectedProducts.length}`}
                title={`${product.name} · arrastra para ordenar · izquierda = frente`}
                onDragStart={(event) => { setDraggedProductId(product.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", product.id); }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData("text/plain") || draggedProductId; if (source) store.reorderSelectedItem(source, product.id); setDraggedProductId(null); }}
                onDragEnd={() => setDraggedProductId(null)}
                onKeyDown={(event) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); const target = selectedProducts[index + (event.key === "ArrowLeft" ? -1 : 1)]; if (target) store.reorderSelectedItem(product.id, target.id); }}>
                <img src={product.image} alt={product.name} />
                <span className="layerControls">
                  <button type="button" disabled={index === 0} onClick={() => store.reorderSelectedItem(product.id, selectedProducts[0].id)} aria-label={`Traer ${product.name} al frente`} title="Traer al frente">←</button>
                  <button type="button" disabled={index === selectedProducts.length - 1} onClick={() => store.reorderSelectedItem(product.id, selectedProducts.at(-1)!.id)} aria-label={`Enviar ${product.name} atrás`} title="Enviar atrás">→</button>
                </span>
                <button onClick={() => store.removeProduct(product.id)} aria-label={`Quitar ${product.name}`}>×</button>
              </div>
            )) : <small>Sin piezas</small>}
          </div>
        </div>
        <div className="total"><span>Total</span><strong>{formatMoney(totalCents)}</strong></div>
        <button className="primaryButton quoteButton" onClick={() => setQuoteOpen(true)} disabled={!store.imageData}>Cotizar</button>
      </footer>

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCapture} />
      <QuoteDialog open={quoteOpen} onClose={() => setQuoteOpen(false)} imageData={store.imageData} captureScene={captureQuoteScene} measurement={store.measurement} selectedItems={store.selectedItems} products={catalogProducts} />
    </main>
  );
}
