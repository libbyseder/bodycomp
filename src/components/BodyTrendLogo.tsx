interface BodyTrendLogoProps {
  className?: string
  showGlow?: boolean
}

export default function BodyTrendLogo({
  className = 'h-10 w-10',
  showGlow = true,
}: BodyTrendLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="BodyTrend logo"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="bodytrend-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        fill="none"
        stroke="#22d3ee"
        strokeWidth="4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={showGlow ? 'url(#bodytrend-glow)' : undefined}
      >
        <path d="M13 11 v42" />
        <path d="M13 11 h15 c8.5 0 13.5 4.5 13.5 10.5 c0 5.5 -4 9.5 -9.5 10.5 c7.5 1 12.5 5.5 12.5 12.5 c0 8.5 -6.5 14.5 -16.5 14.5 H13" />
        <path d="M34 37 L49 22" />
        <path d="M49 22 H41.5" />
        <path d="M49 22 V29.5" />
        <path d="M27 43 L36.5 33.5 L45.5 37.5" strokeWidth="3.25" />
      </g>
    </svg>
  )
}