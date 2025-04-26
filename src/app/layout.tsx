import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "../utils/theme-provider"
import { PostHogProvider } from "../app/_analytics/providers";
import { GoogleAnalytics } from '@next/third-parties/google'
import Script from 'next/script';

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
  description: "The AI chat app for students. which helps students to get the answer of their queries.",
  icons:"/favicon.ico",
  
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PostHogProvider>
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://google.github.io/typograms/typograms.js" strategy="beforeInteractive" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <GoogleAnalytics gaId="G-72TLZ694N7" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
    </PostHogProvider>
  );
}
