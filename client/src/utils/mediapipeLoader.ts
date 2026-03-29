/**
 * MediaPipe browser bundles are IIFE scripts that register globals.
 *
 * The app vendors the required runtime scripts + wasm/tflite assets into
 * `client/public/mediapipe/**` so this loads without relying on external CDNs.
 */
const SCRIPTS = [
  '/mediapipe/hands/hands.js',
  '/mediapipe/camera_utils/camera_utils.js',
  '/mediapipe/drawing_utils/drawing_utils.js',
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export type MediapipeGlobals = {
  Hands: new (opts: { locateFile?: (file: string) => string }) => {
    setOptions: (o: Record<string, unknown>) => void;
    onResults: (cb: (r: import('@mediapipe/hands').Results) => void) => void;
    send: (input: { image: HTMLVideoElement }) => Promise<void>;
    close: () => void;
  };
  HAND_CONNECTIONS: [number, number][];
  Camera: new (
    video: HTMLVideoElement,
    opts: { onFrame: () => Promise<void>; width?: number; height?: number; facingMode?: string }
  ) => { start: () => Promise<void>; stop: () => Promise<void> };
  drawConnectors: (
    ctx: CanvasRenderingContext2D,
    landmarks: unknown,
    connections: [number, number][],
    opts: { color?: string; lineWidth?: number }
  ) => void;
  drawLandmarks: (
    ctx: CanvasRenderingContext2D,
    landmarks: unknown,
    opts: { color?: string; lineWidth?: number; radius?: number }
  ) => void;
};

let loadPromise: Promise<MediapipeGlobals> | null = null;

export function loadMediapipe(): Promise<MediapipeGlobals> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    for (const src of SCRIPTS) {
      await loadScript(src);
    }
    const w = window as unknown as MediapipeGlobals;
    if (!w.Hands || !w.Camera || !w.drawConnectors || !w.drawLandmarks) {
      throw new Error('MediaPipe globals missing after script load');
    }
    return w;
  })();

  return loadPromise;
}
