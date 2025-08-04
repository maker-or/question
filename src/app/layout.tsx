import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "../utils/theme-provider";
import { PostHogProvider } from "../app/_analytics/providers";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "sphereai",
  description:
    "The AI chat app for students. which helps students to get the answer of their queries.",
  icons: "/favicon.ico",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PostHogProvider data-oid="re_jer5">
      <html lang="en" suppressHydrationWarning data-oid="ifgx1s1">
        <head data-oid="0_uef:x">
          <Script
            src="https://google.github.io/typograms/typograms.js"
            strategy="beforeInteractive"
            data-oid=":1b-1zn"
          />
        </head>
        <body
          className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
          data-oid="aw3th1i"
        >
          <GoogleAnalytics gaId="G-72TLZ694N7" data-oid="sfxj69." />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            data-oid="qwpthsd"
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </PostHogProvider>
  );
}
