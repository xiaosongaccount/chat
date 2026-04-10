import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./design-tokens.css";
import "./globals.css";
import SiteNav from "./components/SiteNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "给徐秋玲 · 信笺与对话",
  description: "两个问题与本地对话，只保存在你的浏览器里。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
