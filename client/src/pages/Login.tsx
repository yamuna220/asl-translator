import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BridgeLogo } from '../components/BridgeLogo';
import { ParticleBackground } from '../components/ParticleBackground';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'interviewer' | 'candidate'>('candidate');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back');
      } else {
        await register({ name, email, password, role });
        toast.success('Account created');
      }
      navigate('/');
    } catch {
      toast.error(mode === 'login' ? 'Login failed' : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0F] px-4 py-12">
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <BridgeLogo className="mb-4 h-24 w-auto" />
          <h1 className="text-3xl font-semibold tracking-tight text-white">ASL-SignBridge</h1>
          <p className="mt-2 text-lg italic text-[#8B8BA7]">AI based Interview translator</p>
        </div>

        <div className="glass gradient-border-active rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="mb-6 flex rounded-xl bg-[#0A0A0F]/60 p-1">
            <button
              type="button"
              className={clsx(
                'flex-1 rounded-lg py-2 text-sm font-medium transition duration-300',
                mode === 'login' ? 'bg-[#6C63FF] text-white' : 'text-[#8B8BA7]'
              )}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={clsx(
                'flex-1 rounded-lg py-2 text-sm font-medium transition duration-300',
                mode === 'register' ? 'bg-[#6C63FF] text-white' : 'text-[#8B8BA7]'
              )}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={(e) => void submit(e)} className="space-y-4 text-left">
            {mode === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">
                  Name
                </label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#12121A] px-4 py-3 text-white outline-none transition focus:border-[#6C63FF]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-white/10 bg-[#12121A] px-4 py-3 text-white outline-none transition focus:border-[#6C63FF]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-[#12121A] px-4 py-3 text-white outline-none transition focus:border-[#6C63FF]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8B8BA7]">
                  Role
                </label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-[#12121A] px-4 py-3 text-white outline-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'interviewer' | 'candidate')}
                >
                  <option value="candidate">Candidate</option>
                  <option value="interviewer">Interviewer</option>
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#5a52e0] py-3 font-semibold text-white shadow-lg shadow-[#6C63FF]/30 transition duration-300 hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-[#8B8BA7]">
          Secure JWT auth — your token stays in local storage on this device.
        </p>
      </motion.div>
    </div>
  );
}
