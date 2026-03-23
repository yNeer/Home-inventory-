import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({ className = '' }) => (
  <motion.div
    className={`w-full h-full ${className}`}
    animate={{
      y: [0, -10, 0],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <img
      src="/mascot.png"
      alt="App Mascot"
      className="w-full h-full object-contain drop-shadow-lg"
    />
  </motion.div>
);
