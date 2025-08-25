import React from 'react';

/**
 * A component that renders a grid background with dots pattern using pure CSS
 */
const GridBackground = () => {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px),
          radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px, 40px 40px, 10px 10px',
        backgroundPosition: '0 0, 0 0, 0 0',
        maskImage: 'linear-gradient(180deg, white, rgba(255,255,255,0))'
      }}
    />
  );
};

export default GridBackground; 