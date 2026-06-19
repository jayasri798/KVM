import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ClientAppLayout from "@/components/ClientAppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KAM - Kavalasina Antha Matladuko",
  description: "Sleek, private, client-side end-to-end encrypted messaging and media sharing layout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-900 font-sans selection:bg-emerald-500/10 selection:text-emerald-700">
        <AuthProvider>
          <ClientAppLayout>{children}</ClientAppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
