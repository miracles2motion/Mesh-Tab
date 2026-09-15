import { LANDING_CONTENT } from "../content/landing";
import { StructuredData } from "../components/landing/structured-data";
import { Hero } from "../components/landing/hero";
import { SocialProof } from "../components/landing/social-proof";
import { ProblemAgitation } from "../components/landing/problem-agitation";
import { SolutionReveal } from "../components/landing/solution-reveal";
import { HowItWorks } from "../components/landing/how-it-works";
import { NettingVisualizer } from "../components/landing/netting-visualizer";
import { FeatureGrid } from "../components/landing/feature-grid";
import { ComparisonTable } from "../components/landing/comparison-table";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { ThemeToggle } from "../components/theme-toggle";
import { Network } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: LANDING_CONTENT.metadata.title,
  description: LANDING_CONTENT.metadata.description,
  keywords: [...LANDING_CONTENT.metadata.keywords],
};

export default function LandingPage() {
  const { finalCta } = LANDING_CONTENT;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white selection:bg-indigo-500/30 font-sans">
      <StructuredData />

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md z-50 border-b border-gray-100 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">MeshTab</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/tab/new" className="btn-primary py-2 text-sm px-6">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <SocialProof />
        <ProblemAgitation />
        <SolutionReveal />
        <HowItWorks />
        <FeatureGrid />
        <NettingVisualizer />
        <ComparisonTable />
        <FAQAccordion />

        {/* Final CTA Section */}
        <section className="py-32 bg-indigo-600 dark:bg-indigo-900 text-white text-center px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">{finalCta.title}</h2>
            <p className="text-indigo-100 text-lg mb-10">{finalCta.description}</p>
            <Link href="/tab/new" className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl inline-block">
              {finalCta.cta}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-gray-900 dark:text-white" />
            <span className="font-bold tracking-tight">MeshTab</span>
          </div>
          <p className="text-sm text-gray-500">Built for the Monad Metropolis 2026 Hackathon.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
