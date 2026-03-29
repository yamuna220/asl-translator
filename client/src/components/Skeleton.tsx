import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-gradient-to-r from-[#1A1A28] via-[#252536] to-[#1A1A28] bg-[length:200%_100%]',
        className
      )}
      style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
    />
  );
}
