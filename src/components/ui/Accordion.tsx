import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { FAQItem } from '../../types/landing';

interface AccordionProps {
  items: FAQItem[];
}

export const Accordion: React.FC<AccordionProps> = ({ items }) => {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `${item.id}-panel`;
        const buttonId = `${item.id}-button`;

        return (
          <div
            key={item.id}
            className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] transition-colors duration-150 hover:border-[#D1D5DB]"
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 sm:px-6 text-left cursor-pointer"
            >
              <span className="text-[15px] sm:text-base font-semibold text-[#1F2937] leading-snug">
                {item.question}
              </span>
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isOpen
                    ? 'border-[#5B21B6] bg-[#5B21B6] text-white'
                    : 'border-[#E5E7EB] bg-white text-[#4B5563]'
                }`}
                aria-hidden="true"
              >
                {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 text-sm sm:text-[15px] leading-relaxed text-[#4B5563]"
              >
                <div className="border-t border-[#E5E7EB] pt-4">{item.answer}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
