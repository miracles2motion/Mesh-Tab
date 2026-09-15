import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MeshTab | Smart Settlement",
  description: "Gasless micro-expense tracking and multilateral debt netting on Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable} h-full dark`}>
      <body className="min-h-full flex flex-col antialiased selection:bg-indigo-500/30">
        <main className="flex-1 flex flex-col mx-auto w-full max-w-md bg-black/20 min-h-screen relative shadow-2xl overflow-x-hidden border-x border-white/5">
          {children}
        </main>
      </body>
    </html>
  );
}
