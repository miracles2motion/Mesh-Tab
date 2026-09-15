import { LANDING_CONTENT } from "../../content/landing";
import { Network, Fingerprint, Wallet, Zap } from "lucide-react";

// Map string icon names to actual components
const IconMap: Record<string, React.FC<{className?: string}>> = {
  Network,
  Fingerprint,
  Wallet,
  Zap
};

export function FeatureGrid() {
  const { features } = LANDING_CONTENT;

  return (
    <section id="features" className="py-32 bg-gray-50 dark:bg-[#111] border-t border-gray-100 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => {
            const Icon = IconMap[feature.icon];
            
            // Assign different colors based on index for variety
            const colorClasses = [
              "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
              "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
              "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            ][idx % 3];

            return (
              <div key={feature.title} className="bg-white dark:bg-black p-8 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${colorClasses}`}>
                  {Icon && <Icon className="w-6 h-6" />}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
