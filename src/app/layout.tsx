import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getRequestMealWindows } from "@/lib/request-meal-windows";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Food Tracker",
  description: "Track meals, calories, and macros day by day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mealWindows = await getRequestMealWindows();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell mealWindows={mealWindows}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
