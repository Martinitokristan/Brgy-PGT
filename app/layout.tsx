import type { ReactNode } from "react";
import "./globals.css";
import ThemeProvider from "@/app/components/ThemeProvider";
import ServiceWorkerRegistration from "@/app/components/ServiceWorkerRegistration";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-152.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ServiceWorkerRegistration />
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}


