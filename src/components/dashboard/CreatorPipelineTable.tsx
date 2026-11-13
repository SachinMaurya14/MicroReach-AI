import React from 'react';
import { DashboardCreatorRow } from '../../types/dashboard';
import { CreatorTableRow } from './CreatorTableRow';

interface CreatorPipelineTableProps {
  creators: DashboardCreatorRow[];
  selectedRowIds: string[];
  activeCreatorId: string | null;
  isShowingDemoFallback?: boolean;
  onToggleSelectRow: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreviewPitch: (id: string) => void;
  onEditCreator: (creator: DashboardCreatorRow) => void;
  onDeleteCreator: (creator: DashboardCreatorRow) => void;
}

export const CreatorPipelineTable: React.FC<CreatorPipelineTableProps> = ({
  creators,
  selectedRowIds,
  activeCreatorId,
  isShowingDemoFallback = true,
  onToggleSelectRow,
  onToggleSelectAll,
  onPreviewPitch,
  onEditCreator,
  onDeleteCreator,
}) => {
  const allSelected =
    creators.length > 0 && creators.every((c) => selectedRowIds.includes(c.id));

  return (
    <section aria-label="Creator pipeline and verification" className="mr-dashboard-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="text-[17px] font-semibold text-[#111827]">
          Creator Pipeline &amp; Verification
        </h2>
        <span className="text-xs text-[#6B7280] mr-tabular">
          {creators.length}{' '}
          {isShowingDemoFallback ? 'illustrative demo' : 'verified workspace'}{' '}
          {creators.length === 1 ? 'row' : 'rows'}
        </span>
      </div>

      <div className="overflow-x-auto mr-scroll-thin">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold text-[#4B5563]">
              <th className="py-3 pl-4 pr-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all visible creators"
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#5B21B6] cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">Creator</th>
              <th className="py-3 px-3">Platform</th>
              <th className="py-3 px-3">Followers</th>
              <th className="py-3 px-3">Engagement</th>
              <th className="py-3 px-3">Qual. Status</th>
              <th className="py-3 px-3">Email/Contact</th>
              <th className="py-3 pl-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {creators.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-[#6B7280]">
                  No creator rows match your search filter.
                </td>
              </tr>
            ) : (
              creators.map((creator) => (
                <CreatorTableRow
                  key={creator.id}
                  creator={creator}
                  isSelected={selectedRowIds.includes(creator.id)}
                  isActiveInStudio={activeCreatorId === creator.id}
                  onToggleSelect={onToggleSelectRow}
                  onPreviewPitch={onPreviewPitch}
                  onEdit={onEditCreator}
                  onDelete={onDeleteCreator}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
