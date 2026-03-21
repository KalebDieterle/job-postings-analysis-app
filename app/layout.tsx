import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";
import { TerminalNav } from "@/components/ui/terminal-nav";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillMap — Job Market Intelligence",
  description: "Labor market insights and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistMono.variable} antialiased`}>
        <NuqsAdapter>
          <TerminalNav />
          <main className="min-h-svh w-full">
            <div className="px-4 py-6 md:px-6 md:py-8 mx-auto max-w-350 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8">
              {children}
            </div>
          </main>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
