import React from 'react';
import {
  Cpu,
  Dumbbell,
  Gamepad2,
  Shirt,
  Sparkles,
  Sun,
} from 'lucide-react';
import { USE_CASES } from '../data/landingContent';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'beauty-skincare': Sparkles,
  fashion: Shirt,
  fitness: Dumbbell,
  technology: Cpu,
  lifestyle: Sun,
  gaming: Gamepad2,
};

export const UseCasesSection: React.FC = () => {
  const primaryUseCase = USE_CASES.find((item) => item.isPrimary) ?? USE_CASES[0];
  const secondaryUseCases = USE_CASES.filter((item) => !item.isPrimary);

  return (
    <section id="use-cases" className="py-20 md:py-24 bg-white">
      <Container>
        <SectionHeading
          title="Built for focused creator campaigns"
          subtitle="Initially tailored for Beauty & Skincare creator discovery, with a modular workflow structured to expand cleanly across additional niches."
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Primary Highlighted Card: Beauty & Skincare */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF]/70 p-7 sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B21B6] text-white">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-[#5B21B6]">
                  {primaryUseCase.statusLabel}
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-bold text-[#1F2937] tracking-tight">
                {primaryUseCase.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">
                {primaryUseCase.description}
              </p>
            </div>

            {primaryUseCase.campaignExample && (
              <div className="mt-8 rounded-xl border border-[#DDD6FE] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B21B6]">
                  Demonstration Campaign
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1F2937]">
                  {primaryUseCase.campaignExample}
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Target: 5K–100K followers · India preferred · &ge; 2% est. engagement
                </p>
              </div>
            )}
          </div>

          {/* Expandable Niche Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {secondaryUseCases.map((item) => {
              const Icon = CATEGORY_ICONS[item.id] ?? Sparkles;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 hover:border-[#DDD6FE] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#5B21B6]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-medium text-[#6B7280]">
                        {item.statusLabel}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[#1F2937]">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4B5563]">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
};
