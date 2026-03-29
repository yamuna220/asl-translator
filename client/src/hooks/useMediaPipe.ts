import type { NormalizedLandmarkList } from '@mediapipe/hands';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMediapipe } from '../utils/mediapipeLoader';

const CYAN = '#00D4FF';

export type HandsFrameResult = {
  landmarks: NormalizedLandmarkList | null;
  image: HTMLCanvasElement;
};

export function useMediaPipe(
  onResults: (res: HandsFrameResult) => void,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [running, setRunning] = useState(false);
  const handsRef = useRef<{ close: () => void; send: (i: { image: HTMLVideoElement }) => Promise<void> } | null>(
    null
  );
  const cameraRef = useRef<{ start: () => Promise<void>; stop: () => Promise<void> } | null>(null);
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  const stop = useCallback(() => {
    void cameraRef.current?.stop();
    cameraRef.current = null;
    handsRef.current?.close();
    handsRef.current = null;
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setRunning(false);
  }, [videoRef]);

  const start = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    stop();

    const MP = await loadMediapipe();

    const hands = new MP.Hands({
      locateFile: (file) => `${MEDIAPIPE_HANDS_BASE}${file}`,
    });

    hands.setOptions({
      modelComplexity: 1,
      maxNumHands: 2,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const lm = results.multiHandLandmarks?.[0] ?? null;
      if (lm) {
        MP.drawConnectors(ctx, lm, MP.HAND_CONNECTIONS, { color: CYAN, lineWidth: 2 });
        MP.drawLandmarks(ctx, lm, { color: CYAN, lineWidth: 1, radius: 2 });
      }
      ctx.restore();

      onResultsRef.current({
        landmarks: lm,
        image: canvas,
      });
    });

    handsRef.current = hands;

    const syncCanvas = () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (w && h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const cam = new MP.Camera(video, {
      onFrame: async () => {
        syncCanvas();
        await hands.send({ image: video });
      },
      width: 1280,
      height: 720,
      facingMode: 'user',
    });
    cameraRef.current = cam;
    video.addEventListener('loadeddata', syncCanvas, { once: true });
    await cam.start();
    syncCanvas();
    setRunning(true);
  }, [stop, videoRef, canvasRef]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, running };
}

// Must match where we vendor assets into `client/public/mediapipe/hands/`.
const MEDIAPIPE_HANDS_BASE = '/mediapipe/hands/';
