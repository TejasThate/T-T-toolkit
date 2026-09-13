'use client';
import { useEffect, useRef, useState } from 'react';

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // The glowing market lines
    const lines = [
      { y: height * 0.3, speed: 0.2, color: 'rgba(34, 197, 94, 0.05)', offset: 0, amplitude: 30, frequency: 0.002 }, // Green
      { y: height * 0.5, speed: 0.15, color: 'rgba(108, 92, 231, 0.06)', offset: 100, amplitude: 50, frequency: 0.0015 }, // Violet
      { y: height * 0.7, speed: 0.25, color: 'rgba(239, 68, 68, 0.04)', offset: 50, amplitude: 40, frequency: 0.003 } // Red
    ];

    let t = 0;
    
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw faint dot grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let x = 0; x < width; x += 30) {
        for (let y = 0; y < height; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw lines
      lines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(0, line.y);
        for (let x = 0; x < width; x += 10) {
          const y = line.y + Math.sin(x * line.frequency + (t + line.offset) * line.speed) * line.amplitude;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      if (isPlaying) {
        t += 0.1;
        animationFrameId = requestAnimationFrame(render);
      }
    };
    
    render(); // Initial render

    return () => {
      window.removeEventListener('resize', setSize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{ width: '100vw', height: '100vh' }}
      />
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="fixed top-4 right-24 z-50 text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors border border-white/5 rounded-full px-3 py-1 bg-black/20 backdrop-blur-sm"
        title={isPlaying ? "Pause animation" : "Resume animation"}
      >
        {isPlaying ? "Pause Anim" : "Resume Anim"}
      </button>
    </>
  );
}
