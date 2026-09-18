"use client";

import React, { useEffect, useState } from 'react';

export default function TerminalBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#0e0f12]">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
      
      {/* Ambient glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#6C5CE7]/10 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A29BFE]/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-indigo-500/5 blur-[80px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0e0f12_80%)]" />
    </div>
  );
}
