import { LANDING_CONTENT } from "../../content/landing";
import { AlertCircle } from "lucide-react";

export function ProblemAgitation() {
  const { problemAgitation } = LANDING_CONTENT;

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            The Friction
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
            {problemAgitation.title}
          </h2>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {problemAgitation.description}
          </p>
        </div>

        <div className="space-y-4">
          {problemAgitation.painPoints.map((point) => (
            <div 
              key={point.title} 
              className="p-6 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            >
              <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
                {point.title}
              </h3>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {point.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
