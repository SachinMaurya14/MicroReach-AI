import React from 'react';
import { Filter, Send, UserCheck, Users } from 'lucide-react';

interface DashboardKPIGridProps {
  discoveredCount: number;
  qualifiedCount: number;
  enrichedCount: number;
  outreachQueuedCount: number;
  isBackendConnected: boolean;
  gmailStatusLabel: string;
}

export const DashboardKPIGrid: React.FC<DashboardKPIGridProps> = ({
  discoveredCount,
  qualifiedCount,
  enrichedCount,
  outreachQueuedCount,
  isBackendConnected,
  gmailStatusLabel,
}) => {
  const cards = [
    { label: 'Discovered', value: discoveredCount, icon: Users },
    { label: 'Qualified', value: qualifiedCount, icon: Filter },
    { label: 'Emails Enriched', value: enrichedCount, icon: UserCheck },
    { label: 'Outreach Logged', value: outreachQueuedCount, icon: Send },
  ];

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#6B7280]">
          {isBackendConnected
            ? 'Live Workspace Metrics — backed by Supabase PostgreSQL'
            : 'Workspace Backend Disconnected — configure Supabase to view metrics'}
        </span>
        <span className="text-xs font-medium text-[#5B21B6]">
          {gmailStatusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="mr-dashboard-card flex items-start justify-between p-4 sm:p-5 min-h-[100px]"
            >
              <div>
                <p className="text-[13px] font-medium text-[#6B7280]">{card.label}</p>
                <p className="mt-1.5 text-[28px] sm:text-[32px] font-bold leading-none text-[#111827] mr-tabular">
                  {card.value}
                </p>
              </div>
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#5B21B6]"
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
