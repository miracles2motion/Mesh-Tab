import type { Metadata, Viewport } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { PwaRegister } from "../components/pwa-register";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mesh-tab.vercel.app"),
  title: "MeshTab | Smart Settlement",
  description: "Gasless micro-expense tracking and multilateral debt netting on Monad.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable} h-full scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased selection:bg-indigo-500/30 bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                function applyTheme() {
                  const saved = localStorage.getItem('theme') || 'system';
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = saved === 'dark' || (saved === 'system' && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }
                applyTheme();
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                  if ((localStorage.getItem('theme') || 'system') === 'system') {
                    applyTheme();
                    window.dispatchEvent(new Event('theme-change'));
                  }
                });
              } catch (e) {}
            `,
          }}
        />
        <main className="flex-1 flex flex-col w-full min-h-[100dvh] relative overflow-x-hidden">
          {children}
        </main>
        <PwaRegister />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
