import React, { useMemo } from 'react';

/**
 * Timer – animated circular countdown
 * Props: { seconds, totalSeconds }
 * Color: green → yellow → red
 */
export default function Timer({ seconds, totalSeconds }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalSeconds > 0 ? seconds / totalSeconds : 0;
  const offset = circumference * (1 - fraction);

  const color = useMemo(() => {
    if (fraction > 0.5) return '#22c55e';   // green
    if (fraction > 0.25) return '#eab308';  // yellow
    return '#ef4444';                        // red
  }, [fraction]);

  const urgent = seconds <= 5;

  return (
    <div className={`relative inline-flex items-center justify-center ${urgent ? 'animate-pulse' : ''}`}>
      <svg width="104" height="104" className="rotate-[-90deg]">
        {/* Background ring */}
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      {/* Number in center */}
      <span
        className="absolute text-2xl font-extrabold tabular-nums"
        style={{ color, transition: 'color 0.5s ease' }}
      >
        {Math.max(0, seconds)}
      </span>
    </div>
  );
}
