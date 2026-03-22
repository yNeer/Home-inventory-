import React from 'react';

interface MascotProps extends React.SVGProps<SVGSVGElement> {}

export const CamelMascot: React.FC<MascotProps> = (props) => (
  <svg
    viewBox="0 0 500 500"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="camel-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d97706" /> {/* Amber 600 */}
        <stop offset="100%" stopColor="#b45309" /> {/* Amber 700 */}
      </linearGradient>
      <linearGradient id="camel-hump" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" /> {/* Amber 500 */}
        <stop offset="100%" stopColor="#d97706" /> {/* Amber 600 */}
      </linearGradient>
      <linearGradient id="camel-accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fbbf24" /> {/* Amber 400 */}
        <stop offset="100%" stopColor="#f59e0b" /> {/* Amber 500 */}
      </linearGradient>
      <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="15" floodOpacity="0.2" />
      </filter>
    </defs>

    {/* Background Halo */}
    <circle cx="250" cy="250" r="220" fill="#fef3c7" /> {/* Amber 50 */}
    <circle cx="250" cy="250" r="180" fill="#fde68a" opacity="0.5" /> {/* Amber 200 */}

    <g filter="url(#soft-shadow)">
      {/* Back Legs */}
      <path d="M190 350 v70 q0 10 10 10 h15 q10 0 10 -10 v-70 z" fill="#92400e" />
      <path d="M300 350 v60 q0 10 10 10 h15 q10 0 10 -10 v-60 z" fill="#92400e" />

      {/* Tail */}
      <path d="M160 250 q-20 20 -25 50 q5 -10 10 -5 z" fill="#78350f" />

      {/* Body Core */}
      <path
        d="M170 230
           C 160 300, 200 360, 270 350
           C 340 340, 360 280, 350 220
           C 340 160, 200 160, 170 230 Z"
        fill="url(#camel-body)"
      />

      {/* Front Legs */}
      <path d="M220 340 v85 q0 10 10 10 h15 q10 0 10 -10 v-85 z" fill="url(#camel-body)" />
      <path d="M330 330 v95 q0 10 10 10 h15 q10 0 10 -10 v-95 z" fill="url(#camel-body)" />

      {/* The Hump (Single Hump Dromedary) */}
      <path
        d="M200 220
           C 200 120, 300 120, 310 220
           Z"
        fill="url(#camel-hump)"
      />
      {/* Saddle / Medical Cross on Hump */}
      <path d="M230 180 h50 v20 h-50 z" fill="#10b981" /> {/* Emerald cross base */}
      <path d="M245 165 h20 v50 h-20 z" fill="#10b981" />

      {/* Neck */}
      <path
        d="M340 240
           C 380 230, 420 180, 400 120
           C 380 140, 360 170, 330 200 Z"
        fill="url(#camel-body)"
      />

      {/* Head */}
      <path
        d="M380 130
           C 370 100, 420 80, 450 100
           C 460 110, 460 130, 440 140
           C 420 150, 390 150, 380 130 Z"
        fill="url(#camel-body)"
      />

      {/* Snout Accent */}
      <ellipse cx="435" cy="120" rx="15" ry="12" fill="url(#camel-accent)" />

      {/* Ear */}
      <path d="M390 100 q-5 -15 10 -20 q5 10 -10 20 z" fill="url(#camel-accent)" />

      {/* Eye */}
      <circle cx="410" cy="115" r="5" fill="#1e293b" />
      <circle cx="412" cy="113" r="1.5" fill="white" /> {/* Cute eye sparkle */}

      {/* Smile */}
      <path d="M430 130 q10 5 15 -2" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);
