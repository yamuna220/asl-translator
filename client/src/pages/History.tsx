import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Fragment, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSessionHistory } from '../context/SessionContext';
import { Skeleton } from '../components/Skeleton';
import type { SessionDTO } from '../services/api';

export function History() {
  const { sessions, loading } = useSessionHistory();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'live' | 'mock'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      try {
        const d = parseISO(s.createdAt);
        if (from) {
          const fd = startOfDay(parseISO(from));
          if (isBefore(d, fd)) return false;
        }
        if (to) {
          const td = endOfDay(parseISO(to));
          if (isAfter(d, td)) return false;
        }
      } catch {
        return true;
      }
      return true;
    });
  }, [sessions, typeFilter, from, to]);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SignBridge — Session History', 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Type', 'Duration (s)', 'Words', 'Role']],
      body: filtered.map((s) => [
        format(parseISO(s.createdAt), 'yyyy-MM-dd HH:mm'),
        s.type,
        String(s.durationSeconds ?? 0),
        String(s.wordsDetected ?? 0),
        s.role || '—',
      ]),
    });
    doc.save('signbridge-history.pdf');
    toast.success('PDF exported');
  };

  const copyOne = (s: SessionDTO) => {
    const text = [
      `Type: ${s.type}`,
      `Date: ${format(parseISO(s.createdAt), 'PPpp')}`,
      `Transcript: ${s.transcript || '—'}`,
      `Interviewer: ${s.interviewerText || '—'}`,
      `Simplified: ${s.simplifiedText || '—'}`,
    ].join('\n');
    void navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-semibold text-white">History</h1>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-[#12121A]/80 p-4">
        <div>
          <label className="mb-1 block text-xs uppercase text-[#8B8BA7]">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="rounded-xl border border-white/10 bg-[#0A0A0F] px-3 py-2 text-white"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="mock">Mock</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#8B8BA7]">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0A0A0F] px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#8B8BA7]">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0A0A0F] px-3 py-2 text-white"
          />
        </div>
        <button
          type="button"
          onClick={exportPdf}
          className="rounded-xl bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white"
        >
          Export PDF
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {loading ? (
          <div className="space-y-2 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#12121A] text-[#8B8BA7]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Words</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <Fragment key={s._id}>
                  <tr
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                    onClick={() => setExpanded((e) => (e === s._id ? null : s._id))}
                  >
                    <td className="px-4 py-3 text-white">
                      {format(parseISO(s.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 capitalize text-[#8B8BA7]">{s.type}</td>
                    <td className="px-4 py-3 font-mono text-[#00D4FF]">
                      {Math.floor((s.durationSeconds || 0) / 60)}:
                      {String((s.durationSeconds || 0) % 60).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 text-[#00FF94]">{s.wordsDetected}</td>
                    <td className="px-4 py-3 text-[#8B8BA7]">{s.role || '—'}</td>
                    <td className="px-4 py-3 text-right text-[#8B8BA7]">{expanded === s._id ? '▼' : '▶'}</td>
                  </tr>
                  <AnimatePresence>
                    {expanded === s._id && (
                      <tr key={`${s._id}-detail`} className="bg-[#0A0A0F]/80">
                        <td colSpan={6} className="px-4 pb-6 pt-2">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-3 text-[#8B8BA7]"
                          >
                            <p>
                              <span className="text-white">Transcript: </span>
                              {s.transcript || '—'}
                            </p>
                            {s.interviewerText && (
                              <p>
                                <span className="text-white">Interviewer: </span>
                                {s.interviewerText}
                              </p>
                            )}
                            {s.simplifiedText && (
                              <p>
                                <span className="text-white">Simplified: </span>
                                {s.simplifiedText}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyOne(s);
                                }}
                                className="rounded-lg border border-[#00D4FF]/40 px-3 py-1 text-xs text-[#00D4FF]"
                              >
                                Copy transcript
                              </button>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-8 text-center text-[#8B8BA7]">No sessions match your filters.</p>
        )}
      </div>
    </div>
  );
}
