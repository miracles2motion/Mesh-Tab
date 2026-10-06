import { LANDING_CONTENT } from "../../content/landing";
import { Check, X, Scale } from "lucide-react";

export function ComparisonTable() {
  const { comparison } = LANDING_CONTENT;

  return (
    <section id="comparison" className="py-24 px-6 max-w-5xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-4 border border-slate-200 dark:border-white/10">
          <Scale className="w-3.5 h-3.5" />
          The Differentiator
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
          {comparison.title}
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300">
          Why calculating net debts is only half the battle.
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-lg bg-white dark:bg-[#111113]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200/80 dark:border-white/10 bg-slate-50 dark:bg-black/40">
              <th className="p-6 font-bold text-slate-900 dark:text-white text-sm md:text-base">
                {comparison.headers[0]}
              </th>
              <th className="p-6 font-bold text-indigo-600 dark:text-indigo-400 text-base md:text-lg bg-indigo-50/50 dark:bg-indigo-950/20">
                {comparison.headers[1]}
              </th>
              <th className="p-6 font-semibold text-slate-500 dark:text-slate-400 text-sm md:text-base">
                {comparison.headers[2]}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm md:text-base">
            {comparison.rows.map((row) => (
              <tr key={row.feature} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                <td className="p-6 font-medium text-slate-900 dark:text-white">
                  {row.feature}
                </td>
                <td className="p-6 font-bold text-emerald-600 dark:text-emerald-400 bg-indigo-50/30 dark:bg-indigo-950/10">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{row.us}</span>
                  </div>
                </td>
                <td className="p-6 text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>{row.them}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
