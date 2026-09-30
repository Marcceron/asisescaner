import { afterEach, describe, expect, it, vi } from "vitest";
import { captureConfiguredSceneJpeg } from "./capture-scene";

describe("captureConfiguredSceneJpeg", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("combines the room photo and every asset canvas in one JPEG", async () => {
    document.body.innerHTML = `
      <div class="imagePlane">
        <img class="roomImage" />
        <canvas class="asset2dCanvas"></canvas>
        <canvas class="rod3dCanvas"></canvas>
      </div>
    `;
    const plane = document.querySelector<HTMLElement>(".imagePlane")!;
    const image = document.querySelector<HTMLImageElement>(".roomImage")!;
    const renderers = [...document.querySelectorAll<HTMLCanvasElement>("canvas")];
    const rect = { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}) };
    vi.spyOn(plane, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(image, "getBoundingClientRect").mockReturnValue(rect);
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 1600 }, naturalHeight: { value: 1200 } });
    for (const renderer of renderers) {
      renderer.width = 800;
      renderer.height = 600;
      vi.spyOn(renderer, "getBoundingClientRect").mockReturnValue(rect);
    }

    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,composed");
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });

    await expect(captureConfiguredSceneJpeg()).resolves.toBe("data:image/jpeg;base64,composed");
    expect(drawImage).toHaveBeenCalledTimes(3);
    expect(drawImage.mock.calls.map(([source]) => source)).toEqual([image, ...renderers]);
  });
});
