import React from 'react';
import {
  ChartNoAxesCombined,
  Filter,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Container } from '../components/ui/Container';

const WHY_BENEFITS = [
  {
    title: 'Built with Filtering Logic',
    description:
      'Evaluate creators using configurable niche, geography, follower and engagement criteria.',
    icon: Filter,
  },
  {
    title: 'Transparent Data Quality',
    description:
      'Keep source references, verification states and missing information visible.',
    icon: ShieldCheck,
  },
  {
    title: 'Human Approval First',
    description:
      'Review and approve personalized email messages before sending.',
    icon: UserCheck,
  },
  {
    title: 'Respectful Platform Workflows',
    description:
      'Use permitted data access and manual Instagram DM workflows where automation is not supported.',
    icon: ChartNoAxesCombined,
  },
];

export const WhyMicroReachSection: React.FC = () => {
  return (
    <section id="why-microreach" className="bg-[#F9FAFB] py-20 md:py-24 border-b border-[#E5E7EB]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Heading Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <h2 className="text-[30px] sm:text-[36px] font-bold tracking-[-0.02em] leading-[1.2] text-[#1F2937]">
              Why choose MicroReach AI?
            </h2>
            <p className="mt-4 text-[16px] leading-[1.65] text-[#4B5563]">
              Better creator outreach starts with relevant data, meaningful qualification and
              personalized communication.
            </p>
          </div>

          {/* Right Vertically Stacked Benefit Items */}
          <div className="lg:col-span-7 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
            {WHY_BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4 py-6">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1F2937]">{item.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#4B5563]">
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
