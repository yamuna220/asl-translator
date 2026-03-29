import { useGestureDetection } from '../hooks/useGestureDetection';
import { useMediaPipe, type HandsFrameResult } from '../hooks/useMediaPipe';
import { useNeuralModel } from '../hooks/useNeuralModel';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { matchGestureFromLandmarks } from '../utils/gestureMapper';

type Props = {
  signingActive: boolean;
  onSigningChange: (v: boolean) => void;
  onSentenceChange?: (sentence: string) => void;
};

export function ASLGestureCamera({ signingActive, onSigningChange, onSentenceChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gateRef = useRef(false);
  const lastTimeRef = useRef(0);
  const [lastPrediction, setLastPrediction] = useState<string>('');
  const [confidence, setConfidence] = useState(0);
  
  const { predict } = useNeuralModel();
  const windowRef = useRef<string[]>([]);
  const WINDOW_SIZE = 12;
  const MIN_CONSENSUS = 8;


  const { chips, sentence, processLandmarks, clearOutput, setSentence } = useGestureDetection();

  useEffect(() => {
    onSentenceChange?.(sentence);
  }, [sentence, onSentenceChange]);

  const onFrame = useCallback(
    (res: HandsFrameResult) => {
      if (!gateRef.current || !res.landmarks) {
        setConfidence(0);
        return;
      }

      const landmarks = res.landmarks;
      const prediction = predict(res.landmarks);
      let detectedWord = '';
      let detectedConf = 0;
      
      if (prediction) {
        detectedWord = prediction.word;
        detectedConf = prediction.confidence;
      } else {
        // FALLBACK: Use heuristic matching with optimized threshold
        const heuristic = matchGestureFromLandmarks(landmarks);
        if (heuristic && heuristic.confidence > 0.78) {
          detectedWord = heuristic.word;
          detectedConf = heuristic.confidence;
        }
      }

      if (detectedWord && detectedConf > 0.78) {
        setConfidence(Math.round(detectedConf * 100));
        
        // Add valid word to window history
        windowRef.current.push(detectedWord);
      } else {
        setConfidence(0);
        // Force decay: add empty frame so old signs get flushed out
        windowRef.current.push(''); 
      }
      
      // Enforce sliding window size
      if (windowRef.current.length > WINDOW_SIZE) windowRef.current.shift();
      
      // Majority Voting (count only actual words, not empty frames)
      const counts = windowRef.current.reduce((acc: Record<string, number>, w) => {
        if (w) acc[w] = (acc[w] || 0) + 1;
        return acc;
      }, {});
      
      const sorted = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
      const top = sorted.length > 0 ? sorted[0] : null;

      if (top && top[1] >= MIN_CONSENSUS) {
        setLastPrediction(top[0]);
        const now = Date.now();
        // Send to detection hook if enough time has passed
        if (now - lastTimeRef.current > 1200) {
          processLandmarks(landmarks);
          lastTimeRef.current = now;
        }
      } else {
        // Not enough consensus yet, keep trying
        if (windowRef.current.every((w) => w === '')) {
            setLastPrediction('');
        }
      }
    },
    [predict, processLandmarks]
  );

  const { start, stop, running } = useMediaPipe(onFrame, videoRef, canvasRef);

  const toggleSigning = async () => {
    if (!signingActive) {
      gateRef.current = true;
      try {
        await start();
        onSigningChange(true);
        toast.success('Camera started — show clear hand signs');
      } catch {
        gateRef.current = false;
        toast.error('Could not access camera');
      }
    } else {
      gateRef.current = false;
      stop();
      onSigningChange(false);
    }
  };

  const copyText = () => {
    void navigator.clipboard.writeText(sentence);
    toast.success('Copied to clipboard');
  };

  const speak = () => {
    if (!sentence) return;
    const u = new SpeechSynthesisUtterance(sentence);
    u.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <video ref={videoRef} className="h-auto w-full max-h-[420px] object-cover opacity-90" playsInline muted />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full object-cover"
        />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-[#8B8BA7]">
            Start signing to enable the camera
          </div>
        )}
        {running && (
          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            {confidence > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-[#6C63FF]/30 px-3 py-1 text-xs font-bold text-white backdrop-blur border border-[#6C63FF]/50">
                <span className="h-2 w-2 animate-ping rounded-full bg-[#00D4FF]" />
                Tracking: {lastPrediction} ({confidence}%)
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void toggleSigning()}
          className={clsx(
            'relative rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
            signingActive
              ? 'recording-pulse bg-red-600/90 text-white'
              : 'bg-gradient-to-r from-[#6C63FF] to-[#5a52e0] text-white shadow-lg shadow-[#6C63FF]/25'
          )}
        >
          {signingActive && <span className="ripple-ring" aria-hidden />}
          {signingActive ? 'Stop Signing' : 'Start Signing'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearOutput();
            setSentence('');
          }}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-[#8B8BA7] transition hover:bg-white/10"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={copyText}
          className="rounded-xl border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-4 py-2.5 text-sm text-[#00D4FF] transition hover:bg-[#00D4FF]/20"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={speak}
          className="rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/15 px-4 py-2.5 text-sm text-white transition hover:bg-[#6C63FF]/25"
        >
          Speak
        </button>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">Detected</div>
        <div className="flex min-h-[44px] flex-wrap gap-2">
          <AnimatePresence>
            {chips.slice(-12).map((c) => (
              <motion.span
                key={c.id}
                initial={{ scale: 0.6, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/35 bg-[#1A1A28] px-3 py-1 text-sm text-white"
              >
                {c.word}
                <span className="rounded bg-black/30 px-1.5 text-[10px] text-[#00FF94]">{c.confidence}%</span>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">Translated output</div>
        <div className="glass min-h-[100px] rounded-xl p-4 text-left text-lg leading-relaxed text-white">
          {sentence || <span className="text-[#8B8BA7]">Signed words will appear here…</span>}
        </div>
      </div>
    </div>
  );
}
