"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANDING_CONTENT } from "../../content/landing";
import { ChevronDown } from "lucide-react";

export function FAQAccordion() {
  const { faq } = LANDING_CONTENT;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 px-6 max-w-3xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">Frequently Asked Questions</h2>
        <p className="text-lg text-slate-600 dark:text-white/60">Everything you need to know about how MeshTab works under the hood.</p>
      </div>

      <div className="space-y-4">
        {faq.map((item, index) => {
          const isOpen = openIndex === index;
          
          return (
            <div key={index} className="border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-[#161618] overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-white/20 shadow-xs">
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between font-semibold text-base md:text-lg text-slate-900 dark:text-white"
              >
                <span>{item.question}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 dark:text-white/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-white/5 pt-4">
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
