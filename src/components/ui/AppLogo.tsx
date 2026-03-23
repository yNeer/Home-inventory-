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

      {/* Shadows and Blurs */}
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" floodOpacity="0.2" floodColor="#4f46e5" />
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

    {/* Mascot Image */}
    <image
      href="/mascot.png"
      x="81"
      y="81"
      width="350"
      height="350"
      preserveAspectRatio="xMidYMid meet"
    />
  </svg>
);
