import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function Settings() {
  const { user, logout } = useAuth();

  // Load standard settings from localStorage
  const [confidence, setConfidence] = useState(() => Number(localStorage.getItem('sb_confidence')) || 0.65);
  const [speechRate, setSpeechRate] = useState(() => Number(localStorage.getItem('sb_speech_rate')) || 0.95);
  const [compact, setCompact] = useState(() => localStorage.getItem('sb_compact') === 'true');

  const saveConfidence = (v: number) => {
    setConfidence(v);
    localStorage.setItem('sb_confidence', String(v));
    toast.success('Confidence updated');
  };

  const saveSpeechRate = (v: number) => {
    setSpeechRate(v);
    localStorage.setItem('sb_speech_rate', String(v));
    toast.success('Speech rate updated');
  };

  const saveCompact = (v: boolean) => {
    setCompact(v);
    localStorage.setItem('sb_compact', String(v));
    toast.success(v ? 'Compact mode enabled' : 'Normal mode enabled');
  };

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="mb-6 text-2xl font-semibold text-white">Settings</h1>
      
      <div className="space-y-6">
        {/* Account Section */}
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#8B8BA7]">Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8B8BA7]">Signed in as</p>
              <p className="text-lg font-medium text-white">{user?.email || 'Guest User'}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                toast.success('Signed out');
              }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* Brain Settings */}
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#8B8BA7]">Sign Brain</h2>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-white font-medium">Detection Confidence</label>
                <span className="font-mono text-[#00D4FF]">{Math.round(confidence * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={confidence}
                onChange={(e) => saveConfidence(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#1A1A28] accent-[#6C63FF]"
              />
              <p className="mt-2 text-xs text-[#8B8BA7]">
                Higher values reduce false detections but require more precise signing.
              </p>
            </div>
          </div>
        </section>

        {/* Voice Feedback */}
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#8B8BA7]">Voice Feedback</h2>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-white font-medium">Speech Rate</label>
                <span className="font-mono text-[#00FF94]">{speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={speechRate}
                onChange={(e) => saveSpeechRate(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#1A1A28] accent-[#00FF94]"
              />
              <p className="mt-2 text-xs text-[#8B8BA7]">
                Adjust the speed at which the AI reads questions and feedback aloud.
              </p>
            </div>
          </div>
        </section>

        {/* Interface preferences */}
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#8B8BA7]">Interface</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Compact Mode</p>
              <p className="text-xs text-[#8B8BA7]">Optimizes screens for smaller viewports.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={compact}
              onClick={() => saveCompact(!compact)}
              className={`relative h-6 w-11 rounded-full transition ${compact ? 'bg-[#6C63FF]' : 'bg-[#1A1A28]'}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${compact ? 'left-6' : 'left-1'}`}
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
