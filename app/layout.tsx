import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/providers/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";
import { MobileAppHeader } from "@/components/ui/mobile/mobile-app-header";
import { MobileBottomNav } from "@/components/ui/mobile/mobile-bottom-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Analytics Dashboard",
  description: "Labor market insights and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Wrap the entire interactive area in the NuqsAdapter */}
          <NuqsAdapter>
            <SidebarProvider>
              <AppSidebar />
              <main className="flex min-h-svh w-full flex-1 flex-col overflow-hidden">
                <MobileAppHeader />
                {/* The children (pages) will now be able to use
                    useQueryStates and useQueryState hooks.
                */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6">
                    {children}
                  </div>
                </div>
                <MobileBottomNav />
              </main>
            </SidebarProvider>
          </NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
