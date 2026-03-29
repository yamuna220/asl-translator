import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ASLGestureCamera } from '../components/ASLGestureCamera';
import { TypingText } from '../components/TypingText';
import { useSessionHistory } from '../context/SessionContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { simplifyQuestion } from '../services/api';

type FontSize = 'normal' | 'large' | 'xlarge';

const fontClass: Record<FontSize, string> = {
  normal: 'text-xl md:text-2xl',
  large: 'text-2xl md:text-3xl',
  xlarge: 'text-3xl md:text-4xl',
};

export function LiveTranslator() {
  const { saveSession, updateSession } = useSessionHistory();
  const speech = useSpeechRecognition();
  const [signing, setSigning] = useState(false);
  const [simplified, setSimplified] = useState('');
  const [simplifyLoading, setSimplifyLoading] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [candidateOut, setCandidateOut] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);
  const candidateOutRef = useRef('');
  const interviewerRef = useRef('');
  const simplifiedRef = useRef('');

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    candidateOutRef.current = candidateOut;
  }, [candidateOut]);

  useEffect(() => {
    interviewerRef.current = speech.transcript;
  }, [speech.transcript]);

  useEffect(() => {
    simplifiedRef.current = simplified;
  }, [simplified]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // Create the session immediately; subsequent changes are auto-saved to history.
    const init = async () => {
      const doc = await saveSession({
        type: 'live',
        durationSeconds: 0,
        wordsDetected: 0,
        transcript: '',
        interviewerText: '',
        simplifiedText: '',
      });
      if (doc?._id) setSessionId(doc._id);
    };
    void init();
    // Intentionally run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSession]);

  useEffect(() => {
    if (!sessionId) return;
    const autosaveEveryMs = 15000;
    const id = window.setInterval(async () => {
      const words = candidateOutRef.current.split(/\s+/).filter(Boolean).length;
      await updateSession(sessionId, {
        durationSeconds: secondsRef.current,
        wordsDetected: words,
        transcript: candidateOutRef.current,
        interviewerText: interviewerRef.current,
        simplifiedText: simplifiedRef.current,
      });
    }, autosaveEveryMs);
    return () => clearInterval(id);
  }, [sessionId, updateSession]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const handleSimplify = async () => {
    const q = speech.transcript.trim();
    if (!q) {
      toast.error('Capture speech first');
      return;
    }
    setSimplifyLoading(true);
    try {
      const out = await simplifyQuestion(q);
      setSimplified(out);
      toast.success('Question simplified');
    } catch {
      toast.error('Simplification failed — check API key');
    } finally {
      setSimplifyLoading(false);
    }
  };

  const speakSimplified = () => {
    if (!simplified) return;
    const u = new SpeechSynthesisUtterance(simplified);
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  const endSession = useCallback(async () => {
    const words = candidateOut.split(/\s+/).filter(Boolean).length;
    const transcript = candidateOut;
    const interviewer = speech.transcript;

    const payload = {
      durationSeconds: seconds,
      wordsDetected: words,
      transcript,
      interviewerText: interviewer,
      simplifiedText: simplified,
    };

    if (sessionId) {
      await updateSession(sessionId, payload);
    } else {
      await saveSession({
        type: 'live',
        ...payload,
      });
    }

    toast.success('Session saved to history');
    speech.stop();
    setSigning(false);
    setSessionId(null);
    setSeconds(0);
  }, [candidateOut, seconds, saveSession, simplified, speech, sessionId, updateSession]);

  return (
    <div className="mx-auto max-w-[1400px] pb-24">
      <h1 className="mb-6 text-2xl font-semibold text-white">Live Translator</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#8B8BA7]">Interviewer</h2>

          <div className="mb-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              className={`relative mb-4 flex h-28 w-28 items-center justify-center rounded-full text-4xl text-white transition duration-300 ${
                speech.listening ? 'recording-pulse bg-red-600' : 'bg-gradient-to-br from-[#6C63FF] to-[#4a42d4]'
              }`}
            >
              {speech.listening && <span className="ripple-ring" />}
              🎤
            </button>
            <p className="text-sm text-[#8B8BA7]">
              {speech.listening ? 'Listening…' : 'Start Listening'}
            </p>
            {!speech.supported && (
              <p className="mt-2 text-xs text-amber-400">Speech recognition not supported in this browser.</p>
            )}
          </div>

          <div className="mb-4">
            <div className="mb-1 text-xs uppercase text-[#8B8BA7]">Raw transcription</div>
            <div className="min-h-[80px] rounded-xl border border-white/10 bg-[#12121A] p-4 text-left text-sm text-white">
              {speech.interimFull || <span className="text-[#8B8BA7]">Speak to see text…</span>}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-1 text-xs uppercase text-[#8B8BA7]">Animated typing</div>
            <TypingText text={speech.transcript} className="min-h-[48px] text-left text-[#00D4FF]" />
          </div>

          <button
            type="button"
            disabled={simplifyLoading}
            onClick={() => void handleSimplify()}
            className="mb-4 w-full rounded-xl bg-gradient-to-r from-[#00D4FF]/20 to-[#6C63FF]/20 py-3 font-semibold text-white ring-1 ring-[#00D4FF]/40 transition hover:brightness-110 disabled:opacity-50"
          >
            {simplifyLoading ? 'Simplifying…' : 'Simplify Question'}
          </button>

          <motion.div
            key={simplified}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-[#6C63FF]/30 bg-[#1A1A28] p-6"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase text-[#8B8BA7]">Simplified</span>
              <div className="flex gap-1 rounded-lg bg-[#0A0A0F] p-1">
                {(['normal', 'large', 'xlarge'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFontSize(s)}
                    className={`rounded-md px-2 py-1 text-xs text-white transition ${
                      fontSize === s ? 'bg-[#6C63FF]' : 'bg-transparent text-[#8B8BA7]'
                    }`}
                  >
                    {s === 'normal' ? 'Normal' : s === 'large' ? 'Large' : 'XL'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={speakSimplified}
                className="ml-auto rounded-lg border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/10"
              >
                Read aloud
              </button>
            </div>
            <p className={`font-bold leading-snug text-white ${fontClass[fontSize]}`}>
              {simplified || <span className="text-[#8B8BA7]">Simplified text appears here.</span>}
            </p>
          </motion.div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#8B8BA7]">Candidate</h2>
          <ASLGestureCamera
            signingActive={signing}
            onSigningChange={setSigning}
            onSentenceChange={setCandidateOut}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 z-30 flex items-center justify-between border-t border-white/10 bg-[#12121A]/95 px-8 py-4 backdrop-blur">
        <div className="font-mono text-lg text-[#00D4FF]">{mmss}</div>
        <button
          type="button"
          onClick={() => void endSession()}
          className="rounded-xl bg-red-600/90 px-6 py-2 font-semibold text-white transition hover:bg-red-500"
        >
          End Session
        </button>
      </div>
    </div>
  );
}
