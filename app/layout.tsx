import type { ReactNode } from "react";
import "./globals.css";
import ThemeProvider from "@/app/components/ThemeProvider";
import ServiceWorkerRegistration from "@/app/components/ServiceWorkerRegistration";
import MobileNavGuard from "@/app/components/MobileNavGuard";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport = {
  themeColor: "#1e40af",
};

export const metadata = {
  title: "Barangay Pagatpatan",
  description: "The official digital platform for Barangay Pagatpatan residents",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BrgyPGT",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-slate-200 dark:bg-slate-900 text-slate-900 antialiased dark:text-slate-100">
        <ServiceWorkerRegistration />
        <MobileNavGuard />
        <ThemeProvider />
        
        {/* We rely on route group layouts to construct the max-width wrappers because admin panel requires full width */}
        <div className="w-full min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}


