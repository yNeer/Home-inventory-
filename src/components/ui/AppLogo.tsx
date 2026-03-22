import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export const AppLogo: React.FC<LogoProps> = (props) => (
  <svg
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Base Gradient Definition */}
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" /> {/* Violet 500 */}
        <stop offset="100%" stopColor="#3b82f6" /> {/* Blue 500 */}
      </linearGradient>
      <linearGradient id="logo-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
      </filter>
    </defs>

    {/* Shield / Capsule Background */}
    <rect
      x="56"
      y="56"
      width="400"
      height="400"
      rx="120"
      fill="url(#logo-gradient)"
      filter="url(#shadow)"
    />

    {/* Inner Capsule Shape representing medicine/health */}
    <rect
      x="136"
      y="186"
      width="240"
      height="140"
      rx="70"
      fill="white"
      opacity="0.9"
      transform="rotate(-45 256 256)"
    />

    {/* Top left highlight */}
    <path
      d="M190 200 Q256 180 322 200 L256 256 Z"
      fill="url(#logo-gradient-light)"
      transform="rotate(-45 256 256)"
    />

    {/* Plus/Cross symbol representing health/medical in center */}
    <path
      d="M236 216 h40 v30 h30 v40 h-30 v30 h-40 v-30 h-30 v-40 h30 z"
      fill="url(#logo-gradient)"
    />

    {/* Dot or leaf representing growth/grocery */}
    <circle cx="340" cy="180" r="24" fill="#10b981" /> {/* Emerald 500 */}
  </svg>
);
