import { LANDING_CONTENT } from "../../content/landing";

export function HowItWorks() {
  const { howItWorks } = LANDING_CONTENT;

  return (
    <section className="py-32 bg-[#f5f5f7] dark:bg-[#0a0a0a] border-b border-slate-200/80 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">{howItWorks.title}</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {howItWorks.steps.map((step) => (
            <div key={step.step} className="relative p-6 rounded-3xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 shadow-xs">
              <div className="text-6xl font-black text-slate-300 dark:text-white/15 mb-6 tracking-tighter">
                {step.step}
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-slate-600 dark:text-white/60 leading-relaxed text-sm md:text-base">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
