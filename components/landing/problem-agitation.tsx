import { LANDING_CONTENT } from "../../content/landing";
import { AlertTriangle } from "lucide-react";

export function ProblemAgitation() {
  const { problemAgitation } = LANDING_CONTENT;

  return (
    <section className="py-24 bg-[#f5f5f7] dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-sm font-medium border border-rose-100 dark:border-rose-500/20">
              <AlertTriangle className="w-4 h-4" /> The Problem
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              {problemAgitation.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              {problemAgitation.description}
            </p>
          </div>

          <div className="space-y-6">
            {problemAgitation.painPoints.map((point) => (
              <div key={point.title} className="p-6 rounded-2xl bg-white dark:bg-[#111] border border-gray-200/70 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{point.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{point.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
