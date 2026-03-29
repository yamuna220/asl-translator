import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const items = [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/live', label: 'Live Translator', icon: '◎' },
  { to: '/mock', label: 'Mock Interview', icon: '◇' },
  { to: '/history', label: 'History', icon: '▤' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-[#12121A]/95 backdrop-blur-xl"
      style={{ transition: 'all 300ms ease' }}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-lg font-bold text-white shadow-lg shadow-[#6C63FF]/30">
          SB
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold tracking-wide text-white">SignBridge</div>
          <div className="text-xs text-[#8B8BA7]">Interview translator</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ease-out',
                isActive
                  ? 'bg-white/5 text-white shadow-[inset_3px_0_0_#6C63FF] shadow-[#6C63FF]/40'
                  : 'text-[#8B8BA7] hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="navGlow"
                    className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-[#6C63FF] to-[#00D4FF]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="text-base opacity-80">{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="glass m-3 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF]/40 to-[#00D4FF]/30 text-sm font-semibold">
            {user?.name?.slice(0, 1).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-medium text-white">{user?.name}</div>
            <span
              className={clsx(
                'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                user?.role === 'interviewer'
                  ? 'bg-[#6C63FF]/25 text-[#B8B3FF]'
                  : 'bg-[#00D4FF]/20 text-[#7DEBFF]'
              )}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
