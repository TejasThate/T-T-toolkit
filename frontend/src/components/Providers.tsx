"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Using Web Client 1 which was created Sept 9th
const GOOGLE_CLIENT_ID = "251614952431-j137o7u8qeu3b7n93846bi4e1h5auop3.apps.googleusercontent.com";

export function Providers({ children }: { children: ReactNode }) {
  // Use state to ensure a unique QueryClient per request/session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000, // 10 seconds
            refetchOnWindowFocus: true,
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
