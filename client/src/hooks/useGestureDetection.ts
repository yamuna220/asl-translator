import type { NormalizedLandmarkList } from '@mediapipe/hands';
import { useCallback, useRef, useState } from 'react';
import { matchGestureFromLandmarks } from '../utils/gestureMapper';

const HOLD_MS = 400;
const MIN_CONFIDENCE = 0.65;

export type DetectedChip = { word: string; confidence: number; id: string; at: number };

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useGestureDetection() {
  const [chips, setChips] = useState<DetectedChip[]>([]);
  const [sentence, setSentence] = useState<string>('');

  const holdStartRef = useRef<number | null>(null);
  const stableWordRef = useRef<string | null>(null);
  const lastAcceptedRef = useRef<number>(0);
  const lastWordRef = useRef<string | null>(null);

  const pushWord = useCallback((word: string, confidence: number) => {
    const now = Date.now();
    if (word === lastWordRef.current && now - lastAcceptedRef.current < 1500) {
      return;
    }
    lastWordRef.current = word;
    lastAcceptedRef.current = now;
    const chip: DetectedChip = { word, confidence, id: uid(), at: now };
    setChips((c) => [...c.slice(-19), chip]);
    setSentence((s) => (s ? `${s} ${word}` : word));
  }, []);

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmarkList | null) => {
      if (!landmarks) {
        holdStartRef.current = null;
        stableWordRef.current = null;
        return;
      }
      const match = matchGestureFromLandmarks(landmarks);
      if (!match || match.confidence < MIN_CONFIDENCE) {
        holdStartRef.current = null;
        stableWordRef.current = null;
        return;
      }
      const now = Date.now();
      if (stableWordRef.current !== match.word) {
        stableWordRef.current = match.word;
        holdStartRef.current = now;
        return;
      }
      if (holdStartRef.current != null && now - holdStartRef.current >= HOLD_MS) {
        pushWord(match.word, Math.round(match.confidence * 100));
        holdStartRef.current = null;
        stableWordRef.current = null;
      }
    },
    [pushWord]
  );

  const clearOutput = useCallback(() => {
    setChips([]);
    setSentence('');
    lastWordRef.current = null;
  }, []);

  return { chips, sentence, setSentence, processLandmarks, clearOutput };
}
