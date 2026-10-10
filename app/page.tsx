import { LANDING_CONTENT } from "../content/landing";
import { StructuredData } from "../components/landing/structured-data";
import { Hero } from "../components/landing/hero";
import { SocialProof } from "../components/landing/social-proof";
import { ProblemAgitation } from "../components/landing/problem-agitation";
import { HowItWorks } from "../components/landing/how-it-works";
import { NettingVisualizer } from "../components/landing/netting-visualizer";
import { SettlementShowcase } from "../components/landing/settlement-showcase";
import { FeatureGrid } from "../components/landing/feature-grid";
import { MaturityMatrix } from "../components/landing/maturity-matrix";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { ThemeToggle } from "../components/theme-toggle";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";
import { TestnetLoginButton } from "../components/landing/testnet-login-button";
import { LogoutHistoryTrap } from "../components/landing/logout-history-trap";

export const metadata: Metadata = {
  title: LANDING_CONTENT.metadata.title,
  description: LANDING_CONTENT.metadata.description,
  keywords: [...LANDING_CONTENT.metadata.keywords],
  openGraph: { images: [{ url: '/og-image.svg' }] },
  twitter: { images: ['/twitter-card.svg'] }
};

export default function LandingPage() {
  const { finalCta } = LANDING_CONTENT;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-gray-900 dark:text-white selection:bg-indigo-500/30 font-sans">
      <LogoutHistoryTrap />
      <StructuredData />

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 border-b border-gray-100 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/mesh-logo-light.svg" alt="MeshTab Logo" width={140} height={40} className="dark:hidden" priority />
            <Image src="/mesh-logo-dark.svg" alt="MeshTab Logo" width={140} height={40} className="hidden dark:block" priority />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/demo?from=/" className="btn-primary py-2 text-sm px-5 flex items-center gap-1.5 shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" /> {finalCta.cta}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <SocialProof />
        <NettingVisualizer />
        <SettlementShowcase />
        <ProblemAgitation />
        <HowItWorks />
        <FeatureGrid />
        <MaturityMatrix />
        <FAQAccordion />

        {/* Final CTA Section */}
        <section className="py-28 bg-indigo-600 dark:bg-indigo-900 text-white text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{finalCta.title}</h2>
            <p className="text-indigo-100 text-base md:text-lg mb-8 max-w-xl mx-auto">{finalCta.description}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo?from=/" className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl inline-block">
                {finalCta.cta}
              </Link>
              <TestnetLoginButton />
            </div>
          </div>
        </section>
      </main>

      {/* Footer (Clean & Privacy-Preserving) */}
      <footer className="py-12 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="flex items-center">
            <Image src="/mesh-logo-light.svg" alt="MeshTab Logo" width={120} height={34} className="dark:hidden" />
            <Image src="/mesh-logo-dark.svg" alt="MeshTab Logo" width={120} height={34} className="hidden dark:block" />
          </Link>
          <p className="text-sm text-gray-500">
            Built for the Monad Metropolis 2026 Hackathon.
          </p>
        </div>
      </footer>
    </div>
  );
}
