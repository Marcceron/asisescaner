"use client";

import { useEffect, useRef, useState } from "react";
import { detectDepthCapability, type DepthCapability } from "@/services/vision/depth-capabilities";

type ZoomRange = { min: number; max: number; step: number };
type ZoomTrack = MediaStreamTrack & {
  getCapabilities: () => MediaTrackCapabilities & { zoom?: ZoomRange };
  getSettings: () => MediaTrackSettings & { zoom?: number };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, size: { width: number; height: number }, demo?: boolean) => void;
};

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "El navegador bloqueó la cámara. Permite el acceso en la configuración del sitio e inténtalo de nuevo.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No encontramos una cámara disponible en este dispositivo. Puedes cargar una fotografía.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Otra aplicación está usando la cámara. Ciérrala e inténtalo de nuevo.";
  }
  return "No pudimos abrir la cámara. Revisa el permiso o carga una fotografía.";
}

export function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "processing" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoom, setZoom] = useState(1);
  const [depthCapability, setDepthCapability] = useState<DepthCapability>("unavailable");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!open) {
      stopCamera();
    } else {
      void detectDepthCapability().then(setDepthCapability);
    }
  }, [open]);

  function close() {
    stopCamera();
    setStatus("idle");
    setMessage("");
    setZoomRange(null);
    onClose();
  }

  async function startCamera() {
    if (!window.isSecureContext) {
      setStatus("error");
      setMessage("La cámara requiere una conexión segura HTTPS. Puedes cargar una fotografía.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Este navegador no ofrece acceso a cámara. Puedes cargar una fotografía.");
      return;
    }
    try {
      setStatus("requesting");
      setMessage("");
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name !== "OverconstrainedError" && name !== "ConstraintNotSatisfiedError") throw error;
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] as ZoomTrack;
      const capabilities = typeof track.getCapabilities === "function"
        ? track.getCapabilities() as MediaTrackCapabilities & { zoom?: ZoomRange }
        : undefined;
      const range = capabilities?.zoom;
      if (range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.max > range.min) {
        setZoomRange(range);
        setZoom(track.getSettings?.().zoom ?? range.min);
      } else setZoomRange(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch (error) {
      stopCamera();
      setStatus("error");
      setMessage(cameraErrorMessage(error));
    }
  }

  async function applyZoom(value: number) {
    const track = streamRef.current?.getVideoTracks()[0] as ZoomTrack | undefined;
    if (!track || !zoomRange) return;
    const next = Math.max(zoomRange.min, Math.min(zoomRange.max, value));
    try {
      await track.applyConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] });
      setZoom(track.getSettings?.().zoom ?? next);
    } catch { setMessage("La cámara no pudo aplicar ese nivel de zoom."); }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.84), { width: canvas.width, height: canvas.height });
    stopCamera();
    close();
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("error"); setMessage("Selecciona un archivo de imagen válido."); return;
    }
    if (file.size > 30_000_000) {
      setStatus("error"); setMessage("La fotografía supera el límite de 30 MB."); return;
    }
    setStatus("processing");
    setMessage("Procesando y optimizando la fotografía…");
    try {
      let source: CanvasImageSource;
      let sourceWidth: number;
      let sourceHeight: number;
      let cleanup = () => {};
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        source = bitmap; sourceWidth = bitmap.width; sourceHeight = bitmap.height; cleanup = () => bitmap.close();
      } catch {
        const url = URL.createObjectURL(file);
        const image = new Image();
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Formato no compatible")); image.src = url; });
        source = image; sourceWidth = image.naturalWidth; sourceHeight = image.naturalHeight; cleanup = () => URL.revokeObjectURL(url);
      }
      const maxDimension = 1800;
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No fue posible procesar la fotografía");
      context.drawImage(source, 0, 0, width, height); cleanup();
      const dataUrl = canvas.toDataURL("image/jpeg", .86);
      onCapture(dataUrl, { width, height });
      close();
    } catch {
      setStatus("error");
      setMessage("No pudimos leer esta fotografía. Intenta con JPG, PNG o WebP; las fotos HEIC deben convertirse primero.");
    }
  }

  if (!open) return null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <section className="cameraDialog">
        <header className="dialogHeader">
          <div>
            <p className="eyebrow">Captura</p>
            <h2 id="camera-title">Fotografía de la ventana</h2>
          </div>
          <button className="iconTextButton" onClick={close} aria-label="Cerrar cámara">Cerrar</button>
        </header>

        <div className="cameraViewport">
          <video ref={videoRef} playsInline muted aria-label="Vista previa de la cámara" />
          {status !== "ready" && (
            <div className="cameraEmpty">
              <img src="/assets/camera.svg" alt="" width="36" height="36" />
              <p>Coloca la ventana completa dentro del encuadre y evita reflejos fuertes.</p>
            </div>
          )}
        </div>

        {status === "ready" && zoomRange && <div className="cameraZoom">
          <div><span>Zoom de cámara</span><output>{zoom.toFixed(1)}×</output></div>
          <input aria-label="Zoom de cámara" type="range" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step || .1} value={zoom} onChange={(event) => void applyZoom(Number(event.target.value))} />
          <button className="ghostButton" onClick={() => void applyZoom(zoomRange.min)} disabled={zoom <= zoomRange.min}>Alejar al máximo</button>
        </div>}

        <div className={`depthCapability depth-${depthCapability}`}>
          <strong>Medición de profundidad</strong>
          {depthCapability === "webxr" ? <span>Este dispositivo ofrece WebXR AR. La captura de profundidad se habilitará cuando el navegador exponga Depth Sensing.</span>
            : depthCapability === "ios-native-required" ? <span>Safari puede usar la cámara del iPhone, pero no entrega datos LiDAR a sitios web. La precisión LiDAR requiere una integración nativa con ARKit.</span>
            : <span>Este navegador no expone un sensor de profundidad; se usará la estimación visual y el ancho de referencia.</span>}
        </div>

        <p className="privacyNote">La imagen se procesa y guarda localmente en este dispositivo.</p>
        {message && <p className="errorMessage" role="alert">{message}</p>}

        <div className="dialogActions">
          {status !== "ready" ? (
            <button className="primaryButton" onClick={startCamera} disabled={status === "requesting" || status === "processing"}>
              {status === "requesting" ? "Solicitando permiso…" : status === "processing" ? "Procesando fotografía…" : "Abrir cámara"}
            </button>
          ) : (
            <button className="primaryButton" onClick={captureFrame}>Capturar imagen</button>
          )}
          <label className="secondaryButton">
            Cargar fotografía
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { void loadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} disabled={status === "processing"} hidden />
          </label>
          <button
            className="ghostButton"
            onClick={() => {
              onCapture("/assets/room.png", { width: 1512, height: 982 }, true);
              close();
            }}
          >
            Usar imagen de demostración
          </button>
        </div>
      </section>
    </div>
  );
}
