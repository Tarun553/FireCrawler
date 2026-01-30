import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Navigation } from "@/components/navigation";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firecrawl AI Chatbot",
  description: "AI-powered chatbot for your website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
       
        <ClerkProvider>
          <Navigation />
          {children}
          <Toaster position="top-right" richColors />
        </ClerkProvider>
        <Script
  src="/chatbot-widget.js"
  strategy="afterInteractive"
  data-public-key="pk_8c56890990c0ad9af25c9e80540b12a3"
/>
      </body>
    </html>
  );
}
