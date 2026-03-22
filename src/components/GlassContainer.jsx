import React from 'react';

const GlassContainer = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel w-full max-w-4xl mx-auto ${className}`}>
      {children}
    </div>
  );
};

export default GlassContainer;
