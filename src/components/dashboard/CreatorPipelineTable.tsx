import React from 'react';
import { Download } from 'lucide-react';
import { DashboardCreatorRow, DashboardQualFilter } from '../../types/dashboard';
import { CreatorTableRow } from './CreatorTableRow';

interface CreatorPipelineTableProps {
  creators: DashboardCreatorRow[];
  totalCreatorCount: number;
  selectedRowIds: string[];
  activeCreatorId: string | null;
  qualFilter: DashboardQualFilter;
  onQualFilterChange: (next: DashboardQualFilter) => void;
  onExportCreatorsCsv: () => void;
  onExportOutreachCsv: () => void;
  onToggleSelectRow: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreviewPitch: (id: string) => void;
  onEditCreator: (creator: DashboardCreatorRow) => void;
  onDeleteCreator: (creator: DashboardCreatorRow) => void;
}

export const CreatorPipelineTable: React.FC<CreatorPipelineTableProps> = ({
  creators,
  totalCreatorCount,
  selectedRowIds,
  activeCreatorId,
  qualFilter,
  onQualFilterChange,
  onExportCreatorsCsv,
  onExportOutreachCsv,
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <h2 className="text-[17px] font-semibold text-[#111827]">
            Creator Pipeline &amp; Verification
          </h2>
          <span className="text-xs text-[#6B7280] mr-tabular">
            {creators.length} {creators.length === 1 ? 'row' : 'rows'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by qualification status"
            value={qualFilter}
            onChange={(e) => onQualFilterChange(e.target.value as DashboardQualFilter)}
            className="h-8 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs font-medium text-[#111827] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="qualified">Qualified</option>
            <option value="needs_review">Needs Review</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="button"
            onClick={onExportCreatorsCsv}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
            <span>Creators CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportOutreachCsv}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
            <span>Outreach CSV</span>
          </button>
        </div>
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
                <td colSpan={8} className="py-10 px-4 text-center text-sm text-[#6B7280]">
                  {totalCreatorCount === 0
                    ? 'No creators linked to this campaign yet. Open Influencers to run live YouTube discovery.'
                    : 'No creator rows match your current search or qualification status filter.'}
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
