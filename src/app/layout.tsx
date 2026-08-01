import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { auth } from "@/lib/auth";
import { resolveThemeForRequest } from "@/lib/theme-preference";
import { THEME_COOKIE_NAME, parseThemeCookie } from "@/lib/theme-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TripDiary",
  description: "旅の記録を共有するSNS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const cookieTheme = parseThemeCookie(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const userId = session?.user?.id;
  const resolvedTheme = await resolveThemeForRequest({ userId, cookieValue: cookieTheme });
  const dataThemeAttr = resolvedTheme === "system" ? undefined : resolvedTheme;

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      {...(dataThemeAttr ? { "data-theme": dataThemeAttr } : {})}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initial={resolvedTheme} persist={userId ? "api" : "cookie"}>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
