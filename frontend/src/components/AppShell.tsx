"use client";

import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { useAuthStore } from "../store/useAuthStore";
import DashboardLayout from "./DashboardLayout";
import { BrandLogo } from "./BrandLogo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { started, setToken, setStarted } = useAuthStore();
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: async codeResponse => {
      try {
        setIsLoginLoading(true);
        const res = await fetch(`${API_BASE}/auth/google/code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.detail || "Authentication failed");
        }
        
        setToken(data.access_token);
        setStarted(true);
        toast.success("Successfully logged in");
      } catch (e: unknown) {
        toast.error(`Login Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
        setIsLoginLoading(false);
      }
    },
    onError: () => {
      toast.error("Google Login Failed");
    }
  });

  if (!started) {
    return (
      <div className="min-h-screen bg-[#090a0d] flex w-full font-sans">
        
        {/* Left Side: Login Area */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 md:px-24 relative z-10">
          <div className="max-w-md mx-auto w-full space-y-12">
            
            <div className="flex items-center gap-3">
              <BrandLogo size="md" />
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                Institutional-Grade <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE]">Trading Intelligence</span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                Advanced sentiment scoring, predictive alpha generation, and zero-touch portfolio sync.
              </p>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => login()}
                disabled={isLoginLoading}
                className="w-full h-14 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-lg shadow-[0_4px_14px_0_rgba(255,255,255,0.15)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoginLoading ? (
                  "Authenticating..."
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>
            
          </div>
        </div>

        {/* Right Side: Atmospheric Graphic */}
        <div className="hidden lg:flex w-[55%] bg-[#0e0f12] relative items-center justify-center overflow-hidden border-l border-white/5">
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
          
          {/* Glowing Orbs */}
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#6C5CE7]/15 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[5%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#A29BFE]/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          
          {/* Decorative Candlestick/Data Elements */}
          <div className="relative z-10 w-full max-w-xl">
             <div className="h-72 w-full flex items-end justify-between gap-3 px-12 opacity-30">
                {[40, 70, 45, 90, 65, 80, 55, 100, 75, 85].map((h, i) => (
                  <div key={i} className="w-full relative flex justify-center items-end" style={{ height: `${h}%` }}>
                    {/* Wick */}
                    <div className="absolute top-[-30px] bottom-[-20px] w-[2px] bg-white/30" />
                    {/* Body */}
                    <div className={`w-full rounded-sm z-10 ${i % 2 === 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: `${(i * 17) % 60 + 20}%` }} />
                  </div>
                ))}
             </div>
             
             {/* Glass panel overlaid on the chart */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] bg-[#141824]/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col justify-center p-10 space-y-8">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-xl bg-[#6C5CE7]/20 flex items-center justify-center border border-[#6C5CE7]/30 shadow-[0_0_15px_rgba(108,92,231,0.2)]">
                     <svg className="w-6 h-6 text-[#A29BFE]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   </div>
                   <div>
                     <div className="text-white font-semibold text-lg">Predictive Alpha</div>
                     <div className="text-slate-400">Real-time LLM sentiment scoring</div>
                   </div>
                </div>
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-xl bg-[#6C5CE7]/20 flex items-center justify-center border border-[#6C5CE7]/30 shadow-[0_0_15px_rgba(108,92,231,0.2)]">
                     <svg className="w-6 h-6 text-[#A29BFE]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                   </div>
                   <div>
                     <div className="text-white font-semibold text-lg">Bank-grade Sync</div>
                     <div className="text-slate-400">Zero-touch portfolio integration via CDSL</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
