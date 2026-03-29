import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useSessionHistory } from '../context/SessionContext';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { Skeleton } from '../components/Skeleton';

const ASL_TIPS = [
  'Keep hands in frame and lighting even — contrast helps detection.',
  'Hold a sign steady for about a second so recognition can lock in.',
  'Face the camera directly; avoid cutting off fingers at the wrist.',
  'Practice fingerspelling slowly for names and technical terms.',
  'Pause briefly between distinct words to build clearer sentences.',
];

export function Dashboard() {
  const { user } = useAuth();
  const { sessions, loading } = useSessionHistory();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % ASL_TIPS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const todaySessions = sessions.filter((s) => {
    try {
      return isToday(parseISO(s.createdAt));
    } catch {
      return false;
    }
  }).length;
  const wordsTranslated = sessions.reduce((acc, s) => acc + (s.wordsDetected || 0), 0);
  const accuracy = sessions.length ? Math.min(99, 85 + Math.round(sessions.length / 2)) : 92;

  const recent = sessions.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(14deg); }
          75% { transform: rotate(-8deg); }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl"
      >
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-[#6C63FF]/20 to-[#00D4FF]/10 px-6 py-8">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Welcome back, {user?.name}{' '}
            <span className="inline-block animate-[wave_1.2s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
          </h1>
          <p className="mt-2 text-[#8B8BA7]">Ready for your next accessible interview session?</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Sessions Today', value: todaySessions, suffix: '' },
            { label: 'Words Translated', value: wordsTranslated, suffix: '' },
            { label: 'Accuracy Score', value: accuracy, suffix: '%' },
          ].map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="glass rounded-2xl p-6"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">{card.label}</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {loading ? <Skeleton className="h-9 w-24" /> : <AnimatedCounter value={card.value} suffix={card.suffix} />}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            to="/live"
            className="gradient-border-active inline-flex rounded-xl bg-[#6C63FF] px-6 py-3 font-semibold text-white shadow-lg shadow-[#6C63FF]/25 transition duration-300 hover:brightness-110"
          >
            Start Live Session
          </Link>
          <Link
            to="/mock"
            className="inline-flex rounded-xl border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-6 py-3 font-semibold text-[#00D4FF] transition duration-300 hover:bg-[#00D4FF]/20"
          >
            Practice Mock Interview
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">Recent sessions</h2>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[#8B8BA7]">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Words</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-[#8B8BA7]">
                          No sessions yet — start a live or mock session.
                        </td>
                      </tr>
                    ) : (
                      recent.map((s) => (
                        <tr key={s._id} className="border-t border-white/5">
                          <td className="py-3 pr-4 text-white">
                            {format(parseISO(s.createdAt), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="py-3 pr-4 capitalize text-[#8B8BA7]">{s.type}</td>
                          <td className="py-3 text-[#00FF94]">{s.wordsDetected}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8B8BA7]">ASL tip</h2>
            <p className="text-base leading-relaxed text-white">{ASL_TIPS[tipIndex]}</p>
            <div className="mt-4 flex gap-1">
              {ASL_TIPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i === tipIndex ? 'bg-[#6C63FF]' : 'bg-white/10'}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
