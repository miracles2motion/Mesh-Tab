"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANDING_CONTENT } from "../../content/landing";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FAQAccordion() {
  const { faq } = LANDING_CONTENT;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-4 border border-slate-200 dark:border-white/10">
          <HelpCircle className="w-3.5 h-3.5" />
          Answers to Objections
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-300">
          Direct, honest answers about how MeshTab works on Monad.
        </p>
      </div>

      <div className="space-y-4">
        {faq.map((item, index) => {
          const isOpen = openIndex === index;
          
          return (
            <div 
              key={item.question} 
              className="border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-[#111113] overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-white/20 shadow-xs"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between font-semibold text-base md:text-lg text-slate-900 dark:text-white cursor-pointer focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="pr-4">{item.question}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 dark:text-white/40 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-4 text-sm md:text-base">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
