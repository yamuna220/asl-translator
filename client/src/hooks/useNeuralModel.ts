import * as tf from '@tensorflow/tfjs';
import { useCallback, useEffect, useState } from 'react';

export function useNeuralModel() {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        // We'll place the model files in public/model
        const m = await tf.loadLayersModel('/model/model.json');
        const res = await fetch('/model/metadata.json');
        const meta = await res.json();
        
        setModel(m);
        setLabels(meta.labels);
        console.log('Neural Model Loaded');
      } catch (err) {
        console.error('Neural model failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const predict = useCallback((landmarks: any) => {
    if (!model || !landmarks) return null;

    return tf.tidy(() => {
      // 1. Data Processing (Mirror Python logic)
      const coords = landmarks.map((l: any) => [l.x, l.y, l.z]);
      const wrist = coords[0];
      
      // Center at wrist
      const centered = coords.map((c: any) => [c[0] - wrist[0], c[1] - wrist[1], c[2] - wrist[2]]);
      
      // Scale by max distance
      const distances = centered.map((c: any) => Math.sqrt(c[0]**2 + c[1]**2 + c[2]**2));
      const maxDist = Math.max(...distances);
      
      const normalized = centered.flatMap((c: any) => 
        maxDist > 0 ? [c[0] / maxDist, c[1] / maxDist, c[2] / maxDist] : [0, 0, 0]
      );

      // 2. Inference
      const input = tf.tensor2d([normalized]);
      const output = model.predict(input) as tf.Tensor;
      const scores = output.dataSync();
      const maxIdx = scores.indexOf(Math.max(...scores));
      
      return {
        word: labels[maxIdx] || '?',
        confidence: scores[maxIdx],
      };
    });
  }, [model, labels]);

  return { predict, loading };
}
