import { LANDING_CONTENT } from "../../content/landing";
import { Sparkles } from "lucide-react";

export function SolutionReveal() {
  const { solutionReveal } = LANDING_CONTENT;

  return (
    <section className="py-32 bg-indigo-600 dark:bg-indigo-900 text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium mb-8 backdrop-blur-sm border border-white/20">
          <Sparkles className="w-4 h-4" /> The Solution
        </div>
        
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
          {solutionReveal.title}
        </h2>
        
        <p className="text-xl md:text-2xl text-indigo-100 leading-relaxed font-medium">
          {solutionReveal.description}
        </p>
      </div>
    </section>
  );
}
