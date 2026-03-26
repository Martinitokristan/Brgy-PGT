import type { ReactNode } from "react";
import "./globals.css";
import ThemeProvider from "@/app/components/ThemeProvider";

export const metadata = {
  title: "BarangayPGT",
  description: "The official digital platform for Barangay Pagatpatan residents",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}


