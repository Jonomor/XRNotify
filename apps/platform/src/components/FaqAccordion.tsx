'use client';

import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-white/10">
      {faqs.map((faq, i) => (
        <div key={i} className="py-6">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold text-white pr-4">{faq.question}</h3>
            <svg
              className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${
                openIndex === i ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === i ? 'mt-4 max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="text-zinc-400 leading-relaxed">{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
