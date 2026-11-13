import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Compass,
  Filter,
  FolderKanban,
  LayoutGrid,
  Mail,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { DEMO_CREATOR_ROWS } from '../../data/landingContent';
import { DemoCreatorRow, OutreachStatus } from '../../types/landing';
import { QualificationBadge } from '../ui/Badge';

const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'campaigns', label: 'Campaigns', icon: FolderKanban },
  { id: 'discovery', label: 'Discovery', icon: Compass },
  { id: 'influencers', label: 'Influencers', icon: Users },
  { id: 'messages', label: 'Messages', icon: Mail },
  { id: 'outreach', label: 'Outreach', icon: Send },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

const outreachBadgeStyle: Record<OutreachStatus, string> = {
  Draft: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]',
  'Pending Approval': 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]',
  Approved: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
  Sent: 'bg-[#EDE9FE] text-[#5B21B6] border-[#C4B5FD]',
  Failed: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  Skipped: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
  'Manual DM': 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
};

export const CreatorDashboardPreview: React.FC = () => {
  const [activeSidebar, setActiveSidebar] = useState<string>('discovery');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qualificationFilter, setQualificationFilter] = useState<string>('All');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(DEMO_CREATOR_ROWS[0].id);

  const filteredRows = useMemo(() => {
    return DEMO_CREATOR_ROWS.filter((row) => {
      const matchesStatus =
        qualificationFilter === 'All' || row.qualification === qualificationFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        q === '' ||
        row.name.toLowerCase().includes(q) ||
        row.handle.toLowerCase().includes(q) ||
        row.outreachStatus.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [qualificationFilter, searchQuery]);

  const selectedCreator: DemoCreatorRow =
    DEMO_CREATOR_ROWS.find((c) => c.id === selectedCreatorId) ?? DEMO_CREATOR_ROWS[0];

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset =
    circumference - (selectedCreator.fitScoreDemo / 100) * circumference;

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      {/* Top Preview Disclaimer Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-[#4B5563]">
        <div className="flex items-center gap-2 font-medium text-[#1F2937]">
          <span>Illustrative Product Preview</span>
          <span aria-hidden="true" className="text-[#9CA3AF]">
            ·
          </span>
          <span className="text-[#5B21B6]">Campaign: GlowCare — India Skincare (Fictional Demo)</span>
        </div>
        <span className="font-medium text-[#6B7280]">
          Illustrative Demo Data — Not Actual Creator Records
        </span>
      </div>

      {/* Main Dashboard Mockup Frame */}
      <div
        className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
        style={{ boxShadow: 'var(--mr-shadow-mockup)' }}
      >
        <div className="flex flex-col lg:flex-row">
          {/* Deep Violet Sidebar */}
          <aside
            aria-label="Preview workspace navigation"
            className="flex lg:w-[196px] shrink-0 flex-row lg:flex-col justify-between bg-[#1E0B36] p-3 lg:p-4 text-white overflow-x-auto mr-scrollbar-hide"
          >
            <div>
              <div className="hidden lg:flex items-center gap-2 px-2.5 pb-4 mb-3 border-b border-white/10">
                <div className="h-6 w-6 rounded-md bg-[#5B21B6] flex items-center justify-center text-xs font-bold">
                  M
                </div>
                <span className="text-sm font-semibold tracking-tight text-white whitespace-nowrap">
                  MicroReach AI
                </span>
              </div>

              <nav className="flex lg:flex-col gap-1">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSidebar === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSidebar(item.id)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#5B21B6] text-white'
                          : 'text-[#DDD6FE]/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="hidden lg:block mt-6 rounded-xl bg-white/8 p-3 border border-white/10">
              <p className="text-[11px] font-semibold text-[#DDD6FE]">Active Brief</p>
              <p className="mt-1 text-xs font-medium text-white">GlowCare — India</p>
              <p className="mt-0.5 text-[11px] text-[#DDD6FE]/75">Demo Workspace</p>
            </div>
          </aside>

          {/* Main Workspace Area */}
          <div className="flex-1 bg-white p-4 sm:p-6 text-left">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1F2937] tracking-tight">
                  AI Creator Discover &amp; Tracker
                </h3>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  GlowCare — India Skincare · Illustrative Demo Data
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-[#F5F3FF] px-2.5 py-1 font-medium text-[#5B21B6] border border-[#DDD6FE]">
                  Category: Beauty &amp; Skincare
                </span>
                <span className="rounded-md bg-[#F9FAFB] px-2.5 py-1 font-medium text-[#4B5563] border border-[#E5E7EB]">
                  Geography: India
                </span>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-xl bg-[#F9FAFB] p-2.5 border border-[#E5E7EB]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5563]">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 border border-[#E5E7EB] font-medium">
                  <Filter className="h-3 w-3 text-[#5B21B6]" aria-hidden="true" />
                  <span>Followers: 5K–100K</span>
                </span>
                <span className="rounded-lg bg-white px-2.5 py-1.5 border border-[#E5E7EB] font-medium">
                  Engagement: 2% minimum (est.)
                </span>
                <select
                  aria-label="Filter illustrative creators by qualification status"
                  value={qualificationFilter}
                  onChange={(e) => setQualificationFilter(e.target.value)}
                  className="rounded-lg bg-white px-2.5 py-1.5 border border-[#E5E7EB] text-xs font-medium text-[#1F2937] cursor-pointer"
                >
                  <option value="All">Status: All</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Review">Review</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-44">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter demo rows..."
                    aria-label="Search illustrative creator rows"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white py-1.5 pl-8 pr-2.5 text-xs text-[#1F2937] placeholder:text-[#9CA3AF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setQualificationFilter('All');
                  }}
                  className="rounded-lg bg-[#5B21B6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Table + Right Compact Qualification Summary */}
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* Creator Table */}
              <div className="xl:col-span-8 overflow-x-auto rounded-xl border border-[#E5E7EB]">
                <table className="w-full min-w-[580px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="py-2.5 px-3">Creator</th>
                      <th className="py-2.5 px-2.5">Platform</th>
                      <th className="py-2.5 px-2.5">Followers</th>
                      <th className="py-2.5 px-2.5">Engagement</th>
                      <th className="py-2.5 px-2.5">Contact</th>
                      <th className="py-2.5 px-2.5">Qualification</th>
                      <th className="py-2.5 px-3">Outreach Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-xs text-[#6B7280]">
                          No illustrative rows match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const isSelected = row.id === selectedCreator.id;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedCreatorId(row.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#F5F3FF]/80' : 'hover:bg-[#F9FAFB]'
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-semibold text-[#1F2937]">{row.name}</div>
                              <div className="text-[11px] text-[#6B7280]">{row.handle}</div>
                            </td>
                            <td className="py-3 px-2.5 text-[#4B5563]">{row.platform}</td>
                            <td className="py-3 px-2.5 font-medium text-[#1F2937]">{row.followers}</td>
                            <td className="py-3 px-2.5 text-[#4B5563]">{row.engagementEstimate}</td>
                            <td className="py-3 px-2.5">
                              {row.contactEmail === 'Not Found' ? (
                                <span className="text-[#9CA3AF] font-medium">Not Found</span>
                              ) : (
                                <span className="text-[#1F2937] truncate max-w-[110px] inline-block align-bottom">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2.5">
                              <QualificationBadge status={row.qualification} />
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                                  outreachBadgeStyle[row.outreachStatus]
                                }`}
                              >
                                {row.outreachStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Compact Qualification Summary Panel */}
              <div className="xl:col-span-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
                  <div>
                    <p className="text-xs font-semibold text-[#1F2937]">
                      Qualification Summary
                    </p>
                    <p className="text-[11px] text-[#6B7280]">
                      {selectedCreator.name} · Illustrative Demo
                    </p>
                  </div>
                  <QualificationBadge status={selectedCreator.qualification} />
                </div>

                {/* Illustrative Circular Fit Visualization */}
                <div className="my-3.5 flex items-center gap-3.5 rounded-lg bg-white p-3 border border-[#E5E7EB]">
                  <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="#EDE9FE"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="#5B21B6"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        fill="none"
                      />
                    </svg>
                    <span className="absolute text-sm font-bold text-[#1F2937] mr-tabular">
                      {selectedCreator.fitScoreDemo}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1F2937]">Illustrative Demo Fit</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">
                      Demo visualization only — not a verified live platform score.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-[#4B5563]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="text-[#1F2937]">Niche match:</strong>{' '}
                      {selectedCreator.summaryChecks.nicheMatch}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="text-[#1F2937]">Follower range:</strong>{' '}
                      {selectedCreator.summaryChecks.followerRange}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="text-[#1F2937]">Engagement:</strong>{' '}
                      {selectedCreator.summaryChecks.engagement}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="text-[#1F2937]">Content relevance:</strong>{' '}
                      {selectedCreator.summaryChecks.contentRelevance}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="text-[#1F2937]">Contact availability:</strong>{' '}
                      {selectedCreator.summaryChecks.contactAvailability}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
