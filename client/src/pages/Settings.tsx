import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-white">Settings</h1>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8">
        <p className="mb-2 text-sm text-[#8B8BA7]">Signed in as</p>
        <p className="text-lg font-medium text-white">{user?.email}</p>
        <p className="mt-4 text-sm leading-relaxed text-[#8B8BA7]">
          SignBridge uses a dark, high-contrast theme for readability. Notifications appear as toasts in the top-right
          corner.
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            toast.success('Signed out');
          }}
          className="mt-8 w-full rounded-xl bg-red-600/80 py-3 font-semibold text-white transition hover:bg-red-500"
        >
          Log out
        </button>
      </motion.div>
    </div>
  );
}
