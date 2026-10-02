"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export function Providers({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0e0f12] text-white">
        <div className="text-center space-y-4 p-8 border border-red-500/30 bg-red-500/10 rounded-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-400">Missing Configuration</h2>
          <p className="text-slate-300">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is missing. 
            Please configure it to enable Google Login.
          </p>
        </div>
      </div>
    );
  }

  // Use state to ensure a unique QueryClient per request/session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
            retry: 1,
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
