import { LANDING_CONTENT } from "../../content/landing";
import { Check, X } from "lucide-react";

export function ComparisonTable() {
  const { comparison } = LANDING_CONTENT;

  return (
    <section className="py-32 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{comparison.title}</h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl bg-gray-50 dark:bg-[#111]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/50">
                {comparison.headers.map((header, idx) => (
                  <th key={header} className={`p-6 font-bold text-gray-900 dark:text-white ${idx === 1 ? "text-indigo-600 dark:text-indigo-400 text-lg" : ""}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {comparison.rows.map((row) => (
                <tr key={row.feature} className="hover:bg-white dark:hover:bg-white/5 transition-colors">
                  <td className="p-6 font-medium text-gray-900 dark:text-white">
                    {row.feature}
                  </td>
                  <td className="p-6 font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="w-5 h-5" /> {row.us}
                  </td>
                  <td className="p-6 text-gray-500">
                    {row.them}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
