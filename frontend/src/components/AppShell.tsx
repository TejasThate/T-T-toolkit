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
      } catch (e: any) {
        toast.error(`Login Error: ${e.message}`);
      } finally {
        setIsLoginLoading(false);
      }
    },
    onError: error => {
      toast.error("Google Login Failed");
    }
  });

  if (!started) {
    return (
      <div className="min-h-screen bg-[#0e0f12] flex flex-col justify-center items-center text-slate-100 p-8 relative overflow-hidden">
        <div className="z-10 max-w-md text-center space-y-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">T&T Toolkit</span>
          </h1>
          <p className="text-slate-400 text-lg">Adaptive Trading Intelligence</p>
          <button 
            onClick={() => login()}
            disabled={isLoginLoading}
            className="w-full h-14 rounded-xl bg-[#6C5CE7] hover:bg-[#5a4cd1] text-white font-bold text-lg shadow-[0_0_20px_rgba(108,92,231,0.3)] transition-all flex items-center justify-center disabled:opacity-50"
          >
            {isLoginLoading ? "Logging in..." : "Log In with Google"}
          </button>
        </div>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
