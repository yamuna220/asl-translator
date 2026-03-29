import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ASLGestureCamera } from '../components/ASLGestureCamera';
import { useSessionHistory } from '../context/SessionContext';
import { AiService } from '../services/aiService';
import { getOfflineQuestions, shuffle, type RoleKey } from '../utils/offlineQuestions';

const ROLES: RoleKey[] = [
  'Software Engineer',
  'Data Analyst',
  'Product Manager',
  'Marketing',
  'HR',
  'General',
];

const DIFFICULTIES = ['Entry Level', 'Mid Level', 'Senior Level'] as const;

export function MockInterview() {
  const { saveSession } = useSessionHistory();
  const [online, setOnline] = useState(true);
  const [role, setRole] = useState<RoleKey>('Software Engineer');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Mid Level');
  const [isStarted, setIsStarted] = useState(false);
  const compact = localStorage.getItem('sb_compact') === 'true';
  const [queue, setQueue] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState('');
  const [simplified, setSimplified] = useState('');
  const [signing, setSigning] = useState(false);
  const [response, setResponse] = useState('');
  const [timer, setTimer] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; bullets: string[] } | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [loadingQ, setLoadingQ] = useState(false);

  const queuePreview = useMemo(() => queue.slice(0, 5), [queue]);

  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    const id = window.setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timer]);

  const timerColor =
    timer > 45 ? 'text-[#00FF94]' : timer > 15 ? 'text-yellow-400' : 'text-red-500';

  const refillQueue = useCallback(() => {
    const bank = getOfflineQuestions(role);
    setQueue(shuffle(bank));
  }, [role]);

  useEffect(() => {
    refillQueue();
  }, [refillQueue]);

  const generateQuestion = async () => {
    setLoadingQ(true);
    setFeedback(null);
    console.log('[DEBUG] Generating question for:', role, difficulty);
    try {
      if (online) {
        const q = await AiService.generateQuestion(role, difficulty);
        console.log('[DEBUG] AI Question Received:', q);
        setCurrentQ(q);
        try {
          const simp = await AiService.simplify(q);
          setSimplified(simp);
        } catch (err) {
          console.warn('[DEBUG] Simplify failed, using raw:', err);
          setSimplified(q);
        }
      } else {
        const bank = getOfflineQuestions(role);
        setQueue((prev) => {
          const src = prev.length ? [...prev] : shuffle(bank);
          const nextQ = src[0] ?? bank[0];
          const rest = src.slice(1);
          const newQ = rest.length ? rest : shuffle(bank);
          setCurrentQ(nextQ);
          setSimplified(nextQ);
          return newQ;
        });
      }
      setTimer(90);
      setTimerActive(true);
      toast.success('New question ready');
    } catch (err) {
      console.error('[DEBUG] Generate Question Error:', err);
      toast.error('Could not generate question');
    } finally {
      setLoadingQ(false);
    }
  };

  const submitAnswer = async () => {
    const words = response.split(/\s+/).filter(Boolean);
    setTimerActive(false);
    let fbPayload: { score: number; bullets: string[] } | null = null;
    if (online && words.length) {
      try {
        const fb = await AiService.feedback(words, role);
        fbPayload = { score: fb.score, bullets: fb.bullets };
        setFeedback(fbPayload);
        setSessionScore((s) => s + fb.score);
        setRounds((r) => r + 1);
        toast.success('Feedback ready');
      } catch {
        toast.error('Feedback failed');
      }
    } else {
      fbPayload = {
        score: 7,
        bullets: ['Offline mode: practice clarity and eye contact.', 'Try adding one more concrete example next time.'],
      };
      setFeedback(fbPayload);
      setSessionScore((s) => s + 7);
      setRounds((r) => r + 1);
    }
    await saveSession({
      type: 'mock',
      durationSeconds: 90 - timer,
      wordsDetected: words.length,
      role,
      transcript: response,
      simplifiedText: simplified,
      metadata: { difficulty, feedback: fbPayload },
    });
  };

  const shuffleQueue = () => setQueue(shuffle([...queue]));

  return (
    <div className={`mx-auto max-w-6xl pb-28 ${compact ? 'px-4' : ''}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Mock Interview</h1>
        <div className="flex items-center gap-3">
          {online ? (
            <span className="rounded-full bg-[#00FF94]/15 px-3 py-1 text-xs font-semibold text-[#00FF94]">
              Online
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
              Offline
            </span>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#8B8BA7]">
            <span>Online mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={online}
              onClick={() => setOnline(!online)}
              className={`relative h-7 w-12 rounded-full transition ${online ? 'bg-[#6C63FF]' : 'bg-[#2a2a38]'}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${online ? 'left-6' : 'left-1'}`}
              />
            </button>
          </label>
        </div>
      </div>

      {!online && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Offline mode active — using local question bank. AI calls and speech input are disabled.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="glass flex flex-col items-center rounded-2xl p-8">
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#6C63FF]/30" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] shadow-lg shadow-[#6C63FF]/40">
                <svg viewBox="0 0 24 24" className="h-12 w-12 text-white" fill="currentColor" aria-hidden>
                  <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h2v3h-2v1a7 7 0 01-7 7H9a7 7 0 01-7-7v-1H0v-3h2a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13zm9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-[#8B8BA7]">AI interviewer assistant</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-[#8B8BA7]">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleKey)}
                  className="w-full rounded-xl border border-white/10 bg-[#12121A] px-3 py-2 text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-[#8B8BA7]">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}
                  className="w-full rounded-xl border border-white/10 bg-[#12121A] px-3 py-2 text-white"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={loadingQ}
              onClick={() => void generateQuestion()}
              className="mb-4 w-full rounded-xl bg-[#6C63FF] py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loadingQ ? 'Generating…' : 'Generate Question'}
            </button>
            <div className="mb-2 text-xs uppercase text-[#8B8BA7]">Question</div>
            <p className="min-h-[72px] text-lg font-medium leading-relaxed text-white">
              {currentQ || 'Generate a question to begin.'}
            </p>
            {simplified && (
              <p className="mt-3 border-t border-white/10 pt-3 text-base text-[#00D4FF]">{simplified}</p>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase text-[#8B8BA7]">Upcoming (5)</span>
              <button type="button" onClick={shuffleQueue} className="text-xs text-[#00D4FF] hover:underline">
                Shuffle queue
              </button>
            </div>
            <ul className="space-y-2 text-sm text-[#8B8BA7]">
              {queuePreview.map((q, i) => (
                <li key={i} className="truncate border-l-2 border-[#6C63FF]/40 pl-2">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-[#8B8BA7]">Response timer</span>
              <span className={`font-mono text-3xl font-bold ${timerColor}`}>{timer}s</span>
            </div>
            <ASLGestureCamera
              signingActive={signing}
              onSigningChange={setSigning}
              onSentenceChange={setResponse}
            />
            <button
              type="button"
              onClick={() => void submitAnswer()}
              className="mt-4 w-full rounded-xl border border-[#00FF94]/40 bg-[#00FF94]/10 py-3 font-semibold text-[#00FF94] transition hover:bg-[#00FF94]/20"
            >
              Submit answer & get feedback
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass rounded-2xl p-6"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div
                    className="relative h-20 w-20 rounded-full border-4 border-[#6C63FF]"
                    style={{
                      background: `conic-gradient(#6C63FF ${feedback.score * 10}%, #2a2a38 0)`,
                    }}
                  >
                    <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[#1A1A28] text-xl font-bold text-white">
                      {feedback.score}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#8B8BA7]">Session avg (running)</div>
                    <div className="text-2xl font-semibold text-white">
                      {rounds > 0 ? (sessionScore / rounds).toFixed(1) : '—'}
                    </div>
                  </div>
                </div>
                <ul className="list-inside list-disc space-y-2 text-[#8B8BA7]">
                  {feedback.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="fixed bottom-0 left-64 right-0 z-30 flex items-center justify-between border-t border-white/10 bg-[#12121A]/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-[#8B8BA7]">Rounds</span>
            <span className="font-mono text-lg text-white">{rounds}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-[#8B8BA7]">Avg Score</span>
            <span className="font-mono text-lg text-[#00FF94]">
              {rounds > 0 ? (sessionScore / rounds).toFixed(1) : '—'}
            </span>
          </div>
          {!isStarted ? (
            <button
              type="button"
              onClick={() => setIsStarted(true)}
              className="ml-4 rounded-xl bg-[#6C63FF] px-8 py-2 font-semibold text-white transition hover:brightness-110 active:scale-95 shadow-lg shadow-[#6C63FF]/20"
            >
              Start Interview
            </button>
          ) : (
            <div className="ml-4 flex items-center gap-2 text-xs text-[#00FF94]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#00FF94]" />
              Session Live
            </div>
          )}
        </div>
        
        {isStarted && (
          <button
            type="button"
            onClick={() => {
              setTimerActive(false);
              setIsStarted(false);
              toast.success('Interview session ended');
            }}
            className="rounded-xl bg-red-600/90 px-6 py-2 font-semibold text-white transition hover:bg-red-500 active:scale-95"
          >
            End Interview
          </button>
        )}
      </div>
    </div>
  );
}
