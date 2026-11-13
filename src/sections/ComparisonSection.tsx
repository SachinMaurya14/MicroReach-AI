import React from 'react';
import { CheckCircle2, MinusCircle } from 'lucide-react';
import {
  MANUAL_APPROACH_ITEMS,
  MICROREACH_APPROACH_ITEMS,
} from '../data/landingContent';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

export const ComparisonSection: React.FC = () => {
  return (
    <section className="py-20 md:py-24 bg-[#F9FAFB] border-y border-[#E5E7EB]">
      <Container>
        <SectionHeading title="Replace fragmented workflows with one organized process" />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[980px] mx-auto">
          {/* Manual Approach */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 sm:p-8">
            <div className="pb-5 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Fragmented Process
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-[#1F2937]">The Manual Approach</h3>
            </div>

            <ul className="mt-6 space-y-4">
              {MANUAL_APPROACH_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-[#4B5563]">
                  <MinusCircle
                    className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With MicroReach AI */}
          <div className="rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF]/75 p-7 sm:p-8">
            <div className="pb-5 border-b border-[#DDD6FE]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5B21B6]">
                Structured Workflow
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-[#1F2937]">With MicroReach AI</h3>
            </div>

            <ul className="mt-6 space-y-4">
              {MICROREACH_APPROACH_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] font-medium text-[#1F2937]">
                  <CheckCircle2
                    className="h-5 w-5 text-[#5B21B6] mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
};
