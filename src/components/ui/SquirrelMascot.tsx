import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SquirrelMascot: React.FC<MascotProps> = ({ className = '', ...props }) => (
  <motion.div
    className={`relative w-full h-full flex items-center justify-center ${className}`}
    initial={{ y: 0 }}
    animate={{ y: [-5, 5, -5] }}
    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    {...props}
  >
    <img
      src="/mascot.png"
      alt="Inventory Mascot"
      className="w-full h-full object-contain drop-shadow-2xl"
      style={{ filter: 'drop-shadow(0px 15px 20px rgba(0, 0, 0, 0.2))' }}
    />
  </motion.div>
);
