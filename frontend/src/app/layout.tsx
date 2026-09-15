import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "T&T Toolkit",
  description: "Advanced trading toolkit & portfolio management",
};

import AppShell from "@/components/AppShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#0e0f12] text-[#202124]">
        <Providers>
          <AppShell>
            {children}
          </AppShell>
          <Toaster theme="dark" position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
