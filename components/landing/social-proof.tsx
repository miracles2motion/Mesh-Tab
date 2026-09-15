import { LANDING_CONTENT } from "../../content/landing";
import Image from "next/image";

export function SocialProof() {
  const { socialProof } = LANDING_CONTENT;

  return (
    <section className="py-12 border-y border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-[#111]/50">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 uppercase tracking-widest">
          {socialProof.text}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-75 transition-all duration-500">
          {socialProof.partners.map((partner) => (
            <div key={partner.name} className="flex items-center justify-center gap-1 hover:opacity-100 transition-opacity">
              <div className="relative w-36 h-12 md:w-44 md:h-16 flex items-center justify-center">
                {partner.src.endsWith(".svg") || partner.src.endsWith(".png") ? (
                  <Image 
                    src={partner.src} 
                    alt={`${partner.name} Logo`} 
                    fill 
                    className="object-contain brightness-0 dark:invert transition-all duration-300" 
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <span className="text-xl font-bold">{partner.name}</span>
                )}
              </div>
              {"showText" in partner && partner.showText && (
                <span className="text-xl md:text-2xl font-bold lowercase tracking-wide -ml-6">{partner.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
