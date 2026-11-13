import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Filter,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { WORKFLOW_STEPS } from '../data/landingContent';
import { WorkflowStep } from '../types/landing';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

const STEP_ICONS: Record<
  WorkflowStep['iconName'],
  React.ComponentType<{ className?: string }>
> = {
  search: Search,
  database: Database,
  filter: Filter,
  'user-plus': UserPlus,
  sparkles: Sparkles,
  'check-circle': CheckCircle2,
};

export const WorkflowSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-24 bg-white">
      <Container>
        <SectionHeading
          title="From discovery to outreach, all in one workflow"
          subtitle="A clear process for finding the right creators and managing collaboration outreach."
        />

        {/* Desktop & Tablet Horizontal Pipeline / Mobile Vertical Timeline */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-4">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[step.iconName];
            const isLast = index === WORKFLOW_STEPS.length - 1;

            return (
              <div
                key={step.stepNumber}
                className="relative flex md:flex-col items-start md:items-center md:text-center gap-4 md:gap-0"
              >
                {/* Connecting Arrow on Desktop */}
                {!isLast && (
                  <div
                    className="hidden lg:flex absolute top-6 -right-3 z-10 items-center justify-center text-[#A78BFA]"
                    aria-hidden="true"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}

                {/* Vertical Connector on Mobile */}
                {!isLast && (
                  <div
                    className="md:hidden absolute left-6 top-12 bottom-[-24px] w-px bg-[#DDD6FE]"
                    aria-hidden="true"
                  />
                )}

                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#5B21B6]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="md:mt-4">
                  <p className="text-xs font-semibold text-[#5B21B6] mr-tabular">
                    Step {step.stepNumber}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-[#1F2937]">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4B5563]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
