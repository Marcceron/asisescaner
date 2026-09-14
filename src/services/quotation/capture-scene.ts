const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export async function captureConfiguredSceneJpeg() {
  const plane = document.querySelector<HTMLElement>(".imagePlane");
  const image = plane?.querySelector<HTMLImageElement>(".roomImage");
  const renderer = plane?.querySelector<HTMLCanvasElement>(".rod3dCanvas");
  if (!plane || !image || !image.complete) return null;

  const imageRect = image.getBoundingClientRect();
  const maxWidth = 2400;
  const naturalWidth = image.naturalWidth || Math.round(imageRect.width);
  const naturalHeight = image.naturalHeight || Math.round(imageRect.height);
  const outputScale = Math.min(1, maxWidth / Math.max(1, naturalWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(naturalWidth * outputScale));
  canvas.height = Math.max(1, Math.round(naturalHeight * outputScale));
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (renderer) {
    window.dispatchEvent(new CustomEvent("asis:quote-capture", { detail: true }));
    await nextPaint();
    try {
      const rendererRect = renderer.getBoundingClientRect();
      const scaleX = renderer.width / Math.max(1, rendererRect.width);
      const scaleY = renderer.height / Math.max(1, rendererRect.height);
      context.drawImage(
        renderer,
        (imageRect.left - rendererRect.left) * scaleX,
        (imageRect.top - rendererRect.top) * scaleY,
        imageRect.width * scaleX,
        imageRect.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    } finally {
      window.dispatchEvent(new CustomEvent("asis:quote-capture", { detail: false }));
    }
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}
