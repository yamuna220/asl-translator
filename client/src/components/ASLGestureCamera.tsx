import { useGestureDetection } from '../hooks/useGestureDetection';
import { useMediaPipe, type HandsFrameResult } from '../hooks/useMediaPipe';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Props = {
  signingActive: boolean;
  onSigningChange: (v: boolean) => void;
  onSentenceChange?: (sentence: string) => void;
};

export function ASLGestureCamera({ signingActive, onSigningChange, onSentenceChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gateRef = useRef(false);
  const { chips, sentence, processLandmarks, clearOutput, setSentence } = useGestureDetection();

  useEffect(() => {
    onSentenceChange?.(sentence);
  }, [sentence, onSentenceChange]);

  const onFrame = useCallback(
    (res: HandsFrameResult) => {
      if (gateRef.current) processLandmarks(res.landmarks);
    },
    [processLandmarks]
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
