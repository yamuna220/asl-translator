export function BridgeLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={`logo-breathe ${className}`}
      aria-hidden
      width="120"
      height="100"
    >
      <defs>
        <linearGradient id="bridgeArc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Left hand */}
      <path
        d="M28 72 C22 58 20 42 26 32 C30 26 38 24 44 28 C48 42 46 56 40 70 Z"
        fill="rgba(108,99,255,0.35)"
        stroke="#6C63FF"
        strokeWidth="2"
        filter="url(#glow)"
      />
      {/* Right hand */}
      <path
        d="M92 72 C98 58 100 42 94 32 C90 26 82 24 76 28 C72 42 74 56 80 70 Z"
        fill="rgba(0,212,255,0.25)"
        stroke="#00D4FF"
        strokeWidth="2"
        filter="url(#glow)"
      />
      {/* Bridge arc */}
      <path
        d="M 38 38 Q 60 12 82 38"
        fill="none"
        stroke="url(#bridgeArc)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  );
}
