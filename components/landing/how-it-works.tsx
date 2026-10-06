import { LANDING_CONTENT } from "../../content/landing";
import { Sparkles } from "lucide-react";

export function HowItWorks() {
  const { howItWorks } = LANDING_CONTENT;

  return (
    <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-4 border border-slate-200 dark:border-white/10">
          <Sparkles className="w-3.5 h-3.5" />
          Simple Workflow
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
          {howItWorks.title}
        </h2>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {howItWorks.steps.map((step) => (
          <div 
            key={step.step} 
            className="p-8 rounded-3xl bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all"
          >
            <div>
              <div className="text-5xl font-black text-indigo-600/30 dark:text-indigo-400/20 mb-6 font-mono tracking-tighter">
                {step.step}
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                {step.title}
              </h3>
            </div>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
