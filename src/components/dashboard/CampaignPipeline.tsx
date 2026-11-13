import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PipelineStage {
  label: string;
  state: 'completed' | 'active' | 'pending';
}

interface CampaignPipelineProps {
  discoveredCount?: number;
  qualifiedCount?: number;
  enrichedCount?: number;
  hasAiPitches?: boolean;
  outreachCount?: number;
  isShowingDemoFallback?: boolean;
}

export const CampaignPipeline: React.FC<CampaignPipelineProps> = ({
  discoveredCount = 0,
  qualifiedCount = 0,
  enrichedCount = 0,
  hasAiPitches = false,
  outreachCount = 0,
  isShowingDemoFallback = true,
}) => {
  const stages: PipelineStage[] = isShowingDemoFallback
    ? [
        { label: 'Discovery', state: 'completed' },
        { label: 'Filtering', state: 'completed' },
        { label: 'Enrichment', state: 'active' },
        { label: 'AI Pitches', state: 'pending' },
        { label: 'Outreach Log', state: 'pending' },
      ]
    : [
        { label: 'Discovery', state: discoveredCount > 0 ? 'completed' : 'active' },
        {
          label: 'Filtering',
          state:
            qualifiedCount > 0
              ? 'completed'
              : discoveredCount > 0
                ? 'active'
                : 'pending',
        },
        {
          label: 'Enrichment',
          state:
            enrichedCount > 0
              ? 'completed'
              : qualifiedCount > 0
                ? 'active'
                : 'pending',
        },
        {
          label: 'AI Pitches',
          state: hasAiPitches
            ? 'completed'
            : discoveredCount > 0
              ? 'active'
              : 'pending',
        },
        {
          label: 'Outreach Log',
          state: outreachCount > 0 ? 'completed' : hasAiPitches ? 'active' : 'pending',
        },
      ];

  return (
    <section aria-label="Current campaign pipeline status" className="mr-dashboard-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-[17px] font-semibold text-[#111827]">
          Current Campaign Pipeline Status
        </h2>
        <span className="text-[11px] font-medium text-[#6B7280]">
          {isShowingDemoFallback ? 'Visual Workflow Preview' : 'Live Campaign Progress'}
        </span>
      </div>

      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;

          let pillClasses =
            'bg-[#F9FAFB] border border-[#D1D5DB] text-[#6B7280]';
          if (stage.state === 'completed') {
            pillClasses =
              'bg-[#EDE9FE] border border-[#5B21B6] text-[#5B21B6] font-semibold';
          } else if (stage.state === 'active') {
            pillClasses =
              'bg-[#F5F3FF] border-2 border-dashed border-[#5B21B6] text-[#5B21B6] font-semibold';
          }

          return (
            <React.Fragment key={stage.label}>
              <div
                className={`flex h-9 min-w-[112px] flex-1 items-center justify-center rounded-full px-4 text-[13px] whitespace-nowrap ${pillClasses}`}
              >
                {stage.label}
              </div>

              {!isLast && (
                <div
                  className="hidden md:flex items-center shrink-0"
                  aria-hidden="true"
                >
                  <div
                    className={`w-6 lg:w-8 ${
                      stage.state === 'completed'
                        ? 'border-t-2 border-solid border-[#5B21B6]'
                        : stage.state === 'active'
                          ? 'border-t-2 border-dashed border-[#5B21B6]'
                          : 'border-t-2 border-dashed border-[#D1D5DB]'
                    }`}
                  />
                  <ChevronRight
                    className={`-ml-1.5 h-3.5 w-3.5 ${
                      stage.state === 'pending' ? 'text-[#D1D5DB]' : 'text-[#5B21B6]'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};
