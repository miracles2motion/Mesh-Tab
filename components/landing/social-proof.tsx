import { LANDING_CONTENT } from "../../content/landing";
import { PartnerLogo } from "../ui/partner-logo";

export function SocialProof() {
  const { socialProof } = LANDING_CONTENT;

  return (
    <section className="py-12 border-y border-slate-200/80 dark:border-white/10 bg-[#f5f5f7] dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-white/50 mb-8 uppercase tracking-widest">
          {socialProof.text}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
          {socialProof.partners.map((partner) => (
            <div 
              key={partner.name} 
              className="h-10 md:h-12 px-4 py-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center shadow-xs hover:shadow-sm hover:scale-105 transition-all duration-300 text-slate-800 dark:text-white"
              title={`${partner.name} Ecosystem Partner`}
            >
              <PartnerLogo name={partner.name} className="h-6 md:h-7 w-auto max-w-[130px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
