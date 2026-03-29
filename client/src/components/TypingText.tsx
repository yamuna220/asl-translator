import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function TypingText({ text, className = '' }: { text: string; className?: string }) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    setShown('');
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);

  return (
    <motion.p
      key={text}
      initial={{ opacity: 0.3 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {shown}
      {shown.length < text.length && <span className="animate-pulse opacity-50">▍</span>}
    </motion.p>
  );
}
