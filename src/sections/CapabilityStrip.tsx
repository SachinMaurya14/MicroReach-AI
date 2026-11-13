import React from 'react';
import {
  BarChart3,
  Compass,
  Filter,
  Mail,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Container } from '../components/ui/Container';

const CAPABILITY_ITEMS = [
  { label: 'Creator Discovery', icon: Compass },
  { label: 'Smart Filtering', icon: Filter },
  { label: 'AI Personalization', icon: Sparkles },
  { label: 'Email Outreach', icon: Mail },
  { label: 'Profile Data', icon: UserCheck },
  { label: 'Outreach Tracking', icon: BarChart3 },
];

export const CapabilityStrip: React.FC = () => {
  return (
    <section
      aria-label="Platform capabilities overview"
      className="border-y border-[#E5E7EB] bg-[#F5F3FF]/65 py-10 md:py-12"
    >
      <Container>
        <p className="text-center text-sm font-semibold text-[#5B21B6] tracking-tight">
          One connected workflow for your creator campaigns
        </p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-0 sm:divide-x sm:divide-[#DDD6FE]">
          {CAPABILITY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center gap-2 rounded-xl sm:rounded-none bg-white/80 sm:bg-transparent px-3 py-4 sm:py-2 border border-[#EDE9FE] sm:border-0 text-center"
              >
                <Icon className="h-5 w-5 text-[#5B21B6]" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-[#1F2937] whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
