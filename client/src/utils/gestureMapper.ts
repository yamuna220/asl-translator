import type { NormalizedLandmark } from '@mediapipe/hands';
import { ASL_VOCABULARY } from './aslVocabulary';

function dist(a: NormalizedLandmark, b: NormalizedLandmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function angleBetween(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }) {
  const az = a.z ?? 0;
  const bz = b.z ?? 0;
  const dot = a.x * b.x + a.y * b.y + az * bz;
  const la = Math.sqrt(a.x * a.x + a.y * a.y + az * az);
  const lb = Math.sqrt(b.x * b.x + b.y * b.y + bz * bz);
  const denom = Math.max(1e-6, la * lb);
  const cos = Math.max(-1, Math.min(1, dot / denom));
  return Math.acos(cos); // 0..pi
}

function vecSub(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
}

function fingerExtensionScoreAngle(mcp: NormalizedLandmark, pip: NormalizedLandmark, tip: NormalizedLandmark) {
  // Angle at the PIP joint (mcp->pip vs tip->pip). When finger extends, the angle approaches pi.
  const v1 = vecSub(mcp, pip);
  const v2 = vecSub(tip, pip);
  const ang = angleBetween(v1, v2); // 0..pi
  const angNorm = ang / Math.PI; // 0..1
  // Folded fingers tend to produce lower angles; extend tends higher.
  return clamp01((angNorm - 0.35) / 0.5);
}

/** Finger extension estimates [thumb, index, middle, ring, pinky] in 0–1 */
export function extractFingerStates(landmarks: NormalizedLandmark[]): [number, number, number, number, number] {
  if (!landmarks || landmarks.length < 21) {
    return [0, 0, 0, 0, 0];
  }
  const lm = landmarks;
  const w = lm[0];

  const digitExtension = (mcpIdx: number, pipIdx: number, tipIdx: number) => {
    const ratio = dist(w, lm[tipIdx]) / Math.max(1e-6, dist(w, lm[pipIdx]));
    const distanceScore = clamp01((ratio - 1) / 0.8);
    const angleScore = fingerExtensionScoreAngle(lm[mcpIdx], lm[pipIdx], lm[tipIdx]);
    // Blend: distance gives quick response, angle stabilizes for different hand sizes.
    return clamp01(distanceScore * 0.45 + angleScore * 0.55);
  };

  const thumbExtended = () => {
    const tipToIndex = dist(lm[4], lm[5]);
    const ipToIndex = dist(lm[3], lm[5]);
    const ratio = tipToIndex / Math.max(1e-6, ipToIndex);
    return clamp01((ratio - 0.85) / 0.5);
  };

  return [
    thumbExtended(),
    digitExtension(5, 7, 8), // index
    digitExtension(9, 11, 12), // middle
    digitExtension(13, 15, 16), // ring
    digitExtension(17, 19, 20), // pinky
  ];
}

function patternSimilarity(
  observed: [number, number, number, number, number],
  target: [number, number, number, number, number]
): number {
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += 1 - Math.abs(observed[i] - target[i]);
  }
  return sum / 5;
}

export type MatchResult = { word: string; confidence: number };

export function matchGesture(observed: [number, number, number, number, number]): MatchResult | null {
  let best: MatchResult | null = null;
  for (const entry of ASL_VOCABULARY) {
    const confidence = patternSimilarity(observed, entry.pattern);
    if (!best || confidence > best.confidence) {
      best = { word: entry.word, confidence };
    }
  }
  return best;
}

function confidenceModifiers(landmarks: NormalizedLandmark[]) {
  const lm = landmarks;
  const wrist = lm[0];

  // Inter-finger spread: angle between index MCP and middle MCP relative to wrist.
  const indexMcp = lm[5];
  const middleMcp = lm[9];
  const vA = vecSub(indexMcp, wrist);
  const vB = vecSub(middleMcp, wrist);
  const spread = angleBetween(vA, vB); // 0..pi
  const spreadNorm = spread / Math.PI; // 0..1
  const interFingerMultiplier = 0.95 + 0.05 * spreadNorm; // 0.95..1.0

  // Palm orientation: a lightweight heuristic using relative depth of wrist vs index MCP.
  const palmFacing = (wrist.z ?? 0) < (indexMcp.z ?? 0);
  const palmMultiplier = palmFacing ? 1 : 0.97;

  return {
    interFingerMultiplier,
    palmMultiplier,
  };
}

export function matchGestureFromLandmarks(landmarks: NormalizedLandmark[]): MatchResult | null {
  if (!landmarks || landmarks.length < 21) return null;
  const observed = extractFingerStates(landmarks);

  const mods = confidenceModifiers(landmarks);
  let best: MatchResult | null = null;

  for (const entry of ASL_VOCABULARY) {
    const base = patternSimilarity(observed, entry.pattern);
    const confidence = clamp01(base * mods.interFingerMultiplier * mods.palmMultiplier);
    if (!best || confidence > best.confidence) {
      best = { word: entry.word, confidence };
    }
  }

  return best;
}
