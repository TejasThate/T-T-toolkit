"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const VALID_GOOGLE_CLIENT_ID = "251614952431-j5o9pd2supee8hmof9n0mndupb8osvan.apps.googleusercontent.com";
const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
// Cleanly fallback if env var is missing or contains the outdated j137o7 client ID
const GOOGLE_CLIENT_ID = (envClientId && !envClientId.includes("j137o7")) ? envClientId : VALID_GOOGLE_CLIENT_ID;

export function Providers({ children }: { children: ReactNode }) {
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
