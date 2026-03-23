import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export const AppLogo: React.FC<LogoProps> = (props) => (
  <svg
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      {/* Dynamic Gradients for Glassmorphism & Depth */}
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" /> {/* Indigo 500 */}
        <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet 500 */}
      </linearGradient>
      <linearGradient id="roof-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" /> {/* Indigo 400 */}
        <stop offset="100%" stopColor="#a78bfa" /> {/* Violet 400 */}
      </linearGradient>
      <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" /> {/* Emerald 500 */}
        <stop offset="100%" stopColor="#34d399" /> {/* Emerald 400 */}
      </linearGradient>
      <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </linearGradient>

      {/* Shadows and Blurs */}
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" floodOpacity="0.2" floodColor="#4f46e5" />
      </filter>
      <filter id="glass-blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Base App Icon Shape (Squircle) */}
    <rect
      x="40"
      y="40"
      width="432"
      height="432"
      rx="100"
      fill="url(#bg-grad)"
      filter="url(#soft-shadow)"
    />

    {/* Background Decorative Circles */}
    <circle cx="120" cy="120" r="160" fill="#ffffff" opacity="0.1" />
    <circle cx="400" cy="400" r="120" fill="#ffffff" opacity="0.05" />

    {/* Home / Inventory Box Composite (Glassmorphism) */}
    {/* Base House Body */}
    <path
      d="M136 240 L376 240 L376 400 A 24 24 0 0 1 352 424 L160 424 A 24 24 0 0 1 136 400 Z"
      fill="url(#glass-grad)"
      style={{ backdropFilter: 'blur(20px)' }}
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="4"
    />

    {/* Roof (Box Lid / House Roof) */}
    <path
      d="M256 112 L96 256 L136 256 L136 240 L376 240 L376 256 L416 256 Z"
      fill="url(#roof-grad)"
      filter="drop-shadow(0px 8px 12px rgba(0,0,0,0.15))"
    />

    {/* Inner Inventory Elements (Medical Cross & Grocery Dot) */}
    <g transform="translate(196, 276)">
      {/* Plus symbol (Medicines) */}
      <path
        d="M50 0 h20 v30 h30 v20 h-30 v30 h-20 v-30 h-30 v-20 h30 z"
        fill="#ffffff"
        opacity="0.9"
        filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.1))"
      />
    </g>

    {/* Grocery / Growth Leaf Element overlapping */}
    <circle cx="316" cy="336" r="32" fill="url(#accent-grad)" filter="drop-shadow(0px 4px 8px rgba(16,185,129,0.3))" />
    <path d="M306 336 Q316 316 326 336 Q316 356 306 336" fill="#ffffff" opacity="0.8" />

    {/* Glass Highlights */}
    <path
      d="M140 244 L256 244 L256 420 L160 420 A 20 20 0 0 1 140 400 Z"
      fill="url(#glass-grad)"
      opacity="0.4"
    />
  </svg>
);
