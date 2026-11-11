import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Fotoğraflı İade Sistemi — Kanıt Zorunlu Hasar, Garanti & İade Portalı",
  description:
    "Sipariş ve seri numarası doğrulamalı, zorunlu fotoğraf/video kanıtlı, kargosuz yedek parça & kısmi iade karar motorlu B2B/B2C iade yönetim sistemi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
