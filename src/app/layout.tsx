import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const dmSans = localFont({
  src: "./fonts/DMSans-latin-variable.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Food Tracker",
  description: "Track meals, calories, and macros day by day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1c2c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`} suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
