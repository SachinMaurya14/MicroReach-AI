import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AUDIENCE_TABS } from '../data/landingContent';
import { AudienceTabId } from '../types/landing';
import { QualificationBadge } from '../components/ui/Badge';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

export const AudienceSection: React.FC = () => {
  const [activeAudience, setActiveAudience] = useState<AudienceTabId>('founders');

  const currentAudience =
    AUDIENCE_TABS.find((tab) => tab.id === activeAudience) ?? AUDIENCE_TABS[0];

  return (
    <section id="audience" className="bg-[#1E0B36] py-20 lg:py-24 text-white">
      <Container>
        <SectionHeading
          title="Built for teams that want smarter creator outreach"
          tone="light"
        />

        {/* Three Audience Tabs */}
        <div className="mt-9 flex justify-center">
          <div
            role="tablist"
            aria-label="Team roles"
            className="inline-flex flex-wrap justify-center gap-2 rounded-2xl bg-white/8 p-1.5 border border-white/10"
          >
            {AUDIENCE_TABS.map((tab) => {
              const isActive = tab.id === activeAudience;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActiveAudience(tab.id)}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#5B21B6] text-white shadow-sm'
                      : 'text-[#DDD6FE]/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-Column Content + Overlapping White Product Card */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Benefit Rows */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {currentAudience.headline}
            </h3>

            <ul className="space-y-5">
              {currentAudience.benefits.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-3.5">
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5B21B6] text-white border border-white/15"
                    aria-hidden="true"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">{benefit.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#DDD6FE]/85">
                      {benefit.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Overlapping White Filter-Results Card */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-white/15 bg-white p-5 sm:p-6 text-[#1F2937] shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E5E7EB]">
                <div>
                  <p className="text-sm font-bold text-[#1F2937]">
                    {currentAudience.previewTitle}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Illustrative Demo Data · Engagement rates are public estimates
                  </p>
                </div>
                <span className="rounded-md bg-[#F5F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#5B21B6] border border-[#DDD6FE]">
                  {currentAudience.label}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
                <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold text-[#6B7280]">
                      <th className="py-2.5 px-3">Creator</th>
                      <th className="py-2.5 px-2.5">Followers</th>
                      <th className="py-2.5 px-2.5">Engagement</th>
                      <th className="py-2.5 px-2.5">Qualification</th>
                      <th className="py-2.5 px-3">Rejection / Pass Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
                    {currentAudience.rows.map((row) => (
                      <tr key={row.creator} className="hover:bg-[#F9FAFB]/60">
                        <td className="py-3 px-3 font-semibold text-[#1F2937]">{row.creator}</td>
                        <td className="py-3 px-2.5 font-medium text-[#1F2937]">{row.followers}</td>
                        <td className="py-3 px-2.5 text-[#4B5563]">{row.engagement}</td>
                        <td className="py-3 px-2.5">
                          <QualificationBadge status={row.qualification} />
                        </td>
                        <td className="py-3 px-3 text-[#4B5563]">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
