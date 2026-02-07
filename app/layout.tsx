import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/providers/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";

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
              <main className="flex-1 overflow-auto w-full">
                <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                  <SidebarTrigger />
                  <h1 className="text-lg font-semibold">
                    Job Market Analytics
                  </h1>
                  <div className="absolute right-4">
                    <ModeToggle />
                  </div>
                </div>
                {/* The children (pages) will now be able to use 
                   useQueryStates and useQueryState hooks.
                */}
                <div className="p-6">{children}</div>
              </main>
            </SidebarProvider>
          </NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
