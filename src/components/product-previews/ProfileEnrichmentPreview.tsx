import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface EnrichedProfileDemo {
  id: string;
  label: string;
  influencerName: string;
  platform: string;
  profileUrl: string;
  followerCount: string;
  estimatedEngagementRate: string;
  category: string;
  contentThemes: string;
  contactEmail: string;
  website: string;
  audienceAge: string;
  audienceGender: string;
  audienceGeography: string;
  sourceNote: string;
  verificationStatus: string;
}

const ENRICHED_PROFILES: EnrichedProfileDemo[] = [
  {
    id: 'a',
    label: 'Creator A (Email Listed)',
    influencerName: 'Creator A',
    platform: 'YouTube',
    profileUrl: 'youtube.com/@creator_a_skincare (demo)',
    followerCount: '24,500 subscribers',
    estimatedEngagementRate: '3.4% (public estimate)',
    category: 'Beauty & Skincare',
    contentThemes: 'Morning skincare routines, sunscreen comparisons, barrier care',
    contactEmail: 'creator-a-demo@example.invalid',
    website: 'Available in channel bio',
    audienceAge: 'Not Available',
    audienceGender: 'Not Available',
    audienceGeography: 'India (channel language & bio signal)',
    sourceNote: 'YouTube Data API v3 + public channel bio',
    verificationStatus: 'Source-Verified (Illustrative Demo)',
  },
  {
    id: 'b',
    label: 'Creator B (Missing Email)',
    influencerName: 'Creator B',
    platform: 'YouTube',
    profileUrl: 'youtube.com/@creator_b_routines (demo)',
    followerCount: '58,200 subscribers',
    estimatedEngagementRate: '2.8% (public estimate)',
    category: 'Beauty & Skincare',
    contentThemes: 'Affordable cleansers, humid-weather skincare, product empties',
    contactEmail: 'Not Found',
    website: 'Not Available',
    audienceAge: 'Not Available',
    audienceGender: 'Not Available',
    audienceGeography: 'Not Available',
    sourceNote: 'YouTube Data API v3 public metadata',
    verificationStatus: 'Partial Fields Recorded (Illustrative Demo)',
  },
];

export const ProfileEnrichmentPreview: React.FC = () => {
  const [selectedId, setSelectedId] = useState<'a' | 'b'>('a');
  const profile = ENRICHED_PROFILES.find((p) => p.id === selectedId) ?? ENRICHED_PROFILES[0];

  const rows = [
    { label: 'Influencer Name', value: profile.influencerName },
    { label: 'Platform', value: profile.platform },
    { label: 'Profile URL', value: profile.profileUrl },
    { label: 'Follower Count', value: profile.followerCount },
    { label: 'Estimated Engagement', value: profile.estimatedEngagementRate },
    { label: 'Category / Niche', value: profile.category },
    { label: 'Content Themes', value: profile.contentThemes },
    { label: 'Contact Email', value: profile.contactEmail, highlightMissing: true },
    { label: 'Website', value: profile.website, highlightMissing: true },
    { label: 'Audience Age', value: profile.audienceAge, highlightMissing: true },
    { label: 'Audience Gender', value: profile.audienceGender, highlightMissing: true },
    { label: 'Audience Geography', value: profile.audienceGeography, highlightMissing: true },
  ];

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
        <span className="text-xs font-semibold text-[#1F2937]">
          Enriched Creator Record — Illustrative Demo Data
        </span>
        <div className="flex items-center gap-1 rounded-lg bg-white p-1 border border-[#E5E7EB]">
          {ENRICHED_PROFILES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id as 'a' | 'b')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedId === item.id
                  ? 'bg-[#5B21B6] text-white'
                  : 'text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-white divide-y divide-[#F3F4F6]">
        {rows.map((row) => {
          const isUnavailable =
            row.highlightMissing && (row.value === 'Not Found' || row.value === 'Not Available');
          return (
            <div
              key={row.label}
              className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-3.5 py-2 text-xs"
            >
              <span className="sm:col-span-4 font-medium text-[#6B7280]">{row.label}</span>
              <span
                className={`sm:col-span-8 mr-tabular ${
                  isUnavailable ? 'font-semibold text-[#9CA3AF]' : 'font-medium text-[#1F2937]'
                }`}
              >
                {row.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F5F3FF] px-3 py-2 border border-[#DDD6FE] text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#5B21B6]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{profile.verificationStatus}</span>
        </span>
        <span className="text-[#4B5563]">Source: {profile.sourceNote}</span>
      </div>
    </div>
  );
};
