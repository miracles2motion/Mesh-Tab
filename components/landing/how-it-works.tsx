import { LANDING_CONTENT } from "../../content/landing";

export function HowItWorks() {
  const { howItWorks } = LANDING_CONTENT;

  return (
    <section className="py-32 bg-gray-50 dark:bg-[#111] border-b border-gray-100 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">{howItWorks.title}</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {howItWorks.steps.map((step) => (
            <div key={step.step} className="relative">
              <div className="text-6xl font-black text-gray-200 dark:text-gray-800 mb-6 tracking-tighter">
                {step.step}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
