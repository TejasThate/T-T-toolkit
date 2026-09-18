"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Brain, CandlestickChart, Database, Network } from "lucide-react";

// Professional, non-generic trading/AI callouts
const PERKS = [
  {
    id: "sentiment",
    title: "Algorithmic Sentiment Scoring",
    icon: Brain,
    position: { top: "15%", left: "10%" },
    delay: 0,
  },
  {
    id: "alpha",
    title: "Predictive Alpha Generation",
    icon: Activity,
    position: { top: "25%", right: "12%" },
    delay: 1.5,
  },
  {
    id: "nlp",
    title: "Unstructured News NLP",
    icon: Database,
    position: { bottom: "20%", left: "15%" },
    delay: 0.8,
  },
  {
    id: "volatility",
    title: "Real-Time Volatility Mapping",
    icon: CandlestickChart,
    position: { bottom: "30%", right: "8%" },
    delay: 2.2,
  },
  {
    id: "sync",
    title: "Zero-Touch Portfolio Sync",
    icon: Network,
    position: { top: "45%", left: "5%" },
    delay: 3.0,
  }
];

export function FloatingPerks() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only render animations on the client to avoid hydration mismatch
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {PERKS.map((perk) => {
        const Icon = perk.icon;
        return (
          <motion.div
            key={perk.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 1, 1],
              y: [20, 0, -10, 0],
            }}
            transition={{
              opacity: { duration: 1.5, delay: perk.delay, ease: "easeOut" },
              y: {
                duration: 12,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: perk.delay,
              },
            }}
            className="absolute hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#141824]/40 border border-white/5 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            style={{
              top: perk.position.top,
              left: perk.position.left,
              right: perk.position.right,
              bottom: perk.position.bottom,
            }}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#6C5CE7]/10 border border-[#6C5CE7]/20">
              <Icon size={14} className="text-[#A29BFE]" />
            </div>
            <span className="text-sm font-medium text-slate-300 tracking-wide">
              {perk.title}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
