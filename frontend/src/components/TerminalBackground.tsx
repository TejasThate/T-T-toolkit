"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function TerminalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check performance constraints to determine fallback triggers
    // 1. Check for reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    
    // 2. Remove strict hardware check, only fallback on extreme low-end mobile
    const isMobile = window.innerWidth < 768;
    if (isMobile && (navigator.hardwareConcurrency || 4) <= 2) {
      setIsLowEnd(true);
    }
  }, []);

  useEffect(() => {
    // Do not mount WebGL/Canvas if fallback conditions are met or canvas isn't ready
    if (isLowEnd || reducedMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    const resize = () => {
      // Use offset sizes to handle DPI scaling nicely
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // Very slow drifting velocity
        this.vx = (Math.random() - 0.5) * 0.8; // Faster drift
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 2.5 + 1.0; // Larger dots
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Gentle bounce off walls
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(108, 92, 231, 0.8)'; // Much brighter #6C5CE7
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      // Dynamic particle density capped at 200
      const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 9000), 200); 
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const drawNetwork = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Only connect close particles
          if (distance < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Opacity scales with distance seamlessly
            const opacity = 1 - (distance / 140);
            ctx.strokeStyle = `rgba(162, 155, 254, ${opacity * 0.35})`; // Much brighter lines
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      // Pause rendering if tab is hidden (Page Visibility API)
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (const p of particles) {
        p.update();
        p.draw();
      }
      drawNetwork();
      
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLowEnd, reducedMotion]);

  if (isLowEnd || reducedMotion) {
    // Fallback static gradient for weak hardware or reduced motion
    return (
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#6C5CE7]/10 via-[#0e0f12]/0 to-[#0e0f12]/0" />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 w-full h-full pointer-events-none opacity-40 transition-opacity duration-1000"
    />
  );
}
