import { Suspense } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { DataSourceNote, DataSourceNoteFallback } from "@/components/layout/DataSourceNote";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thai Stock VI Dashboard",
  description: "แดชบอร์ดวิเคราะห์หุ้นไทยสไตล์ VI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell
          sidebarFooter={
            <Suspense fallback={<DataSourceNoteFallback />}>
              <DataSourceNote />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
