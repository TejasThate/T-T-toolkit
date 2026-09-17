"use client";

import React from "react";
import { motion } from "framer-motion";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | number;
  className?: string;
}

export function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80,
  };
  
  const s = typeof size === 'number' ? size : sizeMap[size];

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: s, height: s }}>
      <motion.svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <defs>
          <linearGradient id="primaryGradient" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6C5CE7" />
            <stop offset="1" stopColor="#A29BFE" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow pulse */}
        <motion.circle
          cx="50"
          cy="50"
          r="35"
          fill="#6C5CE7"
          filter="url(#glow)"
          animate={{ opacity: [0.05, 0.2, 0.05], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Candlestick 1 */}
        <motion.rect 
          x="22" y="45" width="8" height="25" rx="3" fill="#6C5CE7" opacity="0.7"
          initial={{ scaleY: 0, originY: 1 }} 
          animate={{ scaleY: 1 }} 
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }} 
        />
        <motion.rect 
          x="25" y="35" width="2" height="45" rx="1" fill="#6C5CE7" opacity="0.5"
          initial={{ scaleY: 0, originY: 0.5 }} 
          animate={{ scaleY: 1 }} 
          transition={{ delay: 0.3, duration: 0.6 }} 
        />

        {/* Candlestick 2 (Middle) */}
        <motion.rect 
          x="46" y="35" width="8" height="30" rx="3" fill="url(#primaryGradient)"
          initial={{ scaleY: 0, originY: 1 }} 
          animate={{ scaleY: 1 }} 
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }} 
        />
        <motion.rect 
          x="49" y="25" width="2" height="50" rx="1" fill="url(#primaryGradient)"
          initial={{ scaleY: 0, originY: 0.5 }} 
          animate={{ scaleY: 1 }} 
          transition={{ delay: 0.5, duration: 0.6 }} 
        />

        {/* Candlestick 3 (Right) */}
        <motion.rect 
          x="70" y="20" width="8" height="20" rx="3" fill="#A29BFE" opacity="0.9"
          initial={{ scaleY: 0, originY: 1 }} 
          animate={{ scaleY: 1 }} 
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }} 
        />
        <motion.rect 
          x="73" y="10" width="2" height="40" rx="1" fill="#A29BFE" opacity="0.7"
          initial={{ scaleY: 0, originY: 0.5 }} 
          animate={{ scaleY: 1 }} 
          transition={{ delay: 0.7, duration: 0.6 }} 
        />

        {/* Connecting signal wave */}
        <motion.path
          d="M 26 57 L 50 45 L 74 25"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.8 }}
        />
        
        {/* Pulse dot at the peak */}
        <motion.circle
          cx="74"
          cy="25"
          r="4"
          fill="#ffffff"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 1.8, duration: 0.5 }}
        />
        <motion.circle
          cx="74"
          cy="25"
          r="8"
          fill="#ffffff"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 2], opacity: [0.5, 0] }}
          transition={{ delay: 2, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        />

      </motion.svg>
    </div>
  );
}
