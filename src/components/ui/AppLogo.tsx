import React from 'react';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const AppLogo: React.FC<LogoProps> = ({ className = '', ...props }) => (
  <img
    src="/logo2.png"
    alt="App Logo"
    className={`object-contain ${className}`}
    style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))' }}
    {...props}
  />
);
