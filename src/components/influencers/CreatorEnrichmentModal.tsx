import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { ContactChannelType, OutreachChannel } from '../../types/database';
import { InfluencerDemoProfile } from '../../types/influencer';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface CreatorEnrichmentModalProps {
  profile: InfluencerDemoProfile | null;
  onClose: () => void;
  onEnrich: (influencerId: string) => Promise<InfluencerDemoProfile | null>;
  onUpdateChannels?: (
    influencerId: string,
    input: {
      preferredChannel?: OutreachChannel;
      addChannel?: { type: ContactChannelType; value: string; evidence?: string };
    }
  ) => Promise<InfluencerDemoProfile | null>;
}

const CHANNEL_TYPE_LABELS: Record<ContactChannelType, string> = {
  email: 'Business Email',
  instagram: 'Instagram Profile',
  linkedin: 'LinkedIn Profile',
  youtube: 'YouTube Channel',
  other_contact: 'External Contact URL',
};

const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: 'Email',
  instagram_dm: 'Instagram DM',
  linkedin_message: 'LinkedIn Message',
  youtube_contact: 'YouTube Contact',
};

export const CreatorEnrichmentModal: React.FC<CreatorEnrichmentModalProps> = ({
  profile,
  onClose,
  onEnrich,
  onUpdateChannels,
}) => {
  const [enriching, setEnriching] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState<ContactChannelType>('linkedin');
  const [newChannelValue, setNewChannelValue] = useState('');
  const [newChannelEvidence, setNewChannelEvidence] = useState('');
  const [channelFeedback, setChannelFeedback] = useState<string | null>(null);

  if (!profile) return null;

  const handleEnrich = async () => {
    setEnriching(true);
    await onEnrich(profile.id);
    setEnriching(false);
  };

  const handleSavePreferred = async (nextPref: OutreachChannel) => {
    if (!onUpdateChannels) return;
    setSavingChannel(true);
    setChannelFeedback(null);
    const res = await onUpdateChannels(profile.id, { preferredChannel: nextPref });
    setSavingChannel(false);
    if (res) {
      setChannelFeedback(`Preferred outreach channel updated to ${OUTREACH_CHANNEL_LABELS[nextPref]}.`);
    }
  };

  const handleConfirmAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateChannels || !newChannelValue.trim()) return;
    setSavingChannel(true);
    setChannelFeedback(null);
    const res = await onUpdateChannels(profile.id, {
      addChannel: {
        type: newChannelType,
        value: newChannelValue.trim(),
        evidence: newChannelEvidence.trim() || undefined,
      },
    });
    setSavingChannel(false);
    if (res) {
      setNewChannelValue('');
      setNewChannelEvidence('');
      setChannelFeedback(`Confirmed and saved ${CHANNEL_TYPE_LABELS[newChannelType]}.`);
    } else {
      setChannelFeedback('Could not validate or save that contact channel. Check the URL or email format.');
    }
  };

  const hasEmail = Boolean(profile.contactEmail && profile.contactEmail.toLowerCase() !== 'not found');
  const channels = profile.contactChannels ?? [];
  const availability = profile.channelAvailability ?? [];
  const activePreferred = profile.preferredChannel ?? profile.recommendedChannel ?? 'email';

  return (
    <Modal
      isOpen={Boolean(profile)}
      onClose={onClose}
      title={`${profile.name} — Profile & Enrichment Details`}
      subtitle={`${profile.primaryNiche} · ${profile.location} · Data Source: ${profile.dataSource || 'youtube_data_api_v3'}`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4 text-sm">
        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mr-tabular">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Reach
            </p>
            <p className="mt-1 text-base font-bold text-[#111827]">
              {profile.totalReachCount > 0 ? profile.totalReachCount.toLocaleString() : 'Not Available'}
            </p>
            <p className="text-[11px] text-[#6B7280]">
              {profile.platforms.youtube ? 'YouTube Subscribers' : 'Instagram Followers'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Est. Engagement
            </p>
            <p className="mt-1 text-base font-bold text-[#111827]">
              {profile.engagementRate !== null && profile.engagementRate !== undefined
                ? `${profile.engagementRate.toFixed(2)}%`
                : 'Unavailable'}
            </p>
            <p className="text-[11px] text-[#6B7280] truncate" title={profile.engagementSource || undefined}>
              {profile.engagementSampleSize
                ? `${profile.engagementSampleSize} posts/videos sampled`
                : profile.engagementMeta?.reasonIfUnavailable || 'Sample metrics unavailable'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Geography Status
            </p>
            <p className="mt-1 text-base font-bold text-[#111827] inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
              <span>{profile.geographyVerification || 'Unknown'}</span>
            </p>
            <p className="text-[11px] text-[#6B7280] truncate">{profile.location}</p>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Enrichment
            </p>
            <p className="mt-1 text-base font-bold text-[#111827] capitalize">
              {profile.enrichmentStatus || 'Pending'}
            </p>
            <p className="text-[11px] text-[#6B7280]">
              {profile.enrichedAt
                ? new Date(profile.enrichedAt).toLocaleDateString()
                : 'Not enriched yet'}
            </p>
          </div>
        </div>

        {/* Contact & Provenance Section */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
              Public Contact &amp; Source Provenance
            </h4>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                hasEmail
                  ? 'bg-[#D1FAE5] text-[#065F46]'
                  : 'bg-[#F3F4F6] text-[#4B5563]'
              }`}
            >
              {profile.emailProvenanceStatus || (hasEmail ? 'Found Publicly' : 'Not Found')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-[#5B21B6] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold text-[#111827]">
                  {hasEmail ? profile.contactEmail : 'Not Found'}
                </p>
                <p className="text-[#6B7280] break-all">
                  Source: {profile.emailSource || (hasEmail ? 'Public profile metadata' : 'No public business email listed')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 text-[#5B21B6] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                {profile.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#5B21B6] hover:underline inline-flex items-center gap-1 break-all"
                  >
                    <span>{profile.website}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="font-semibold text-[#6B7280]">Website: Not Found</p>
                )}
                {profile.profileUrl && (
                  <a
                    href={profile.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[#6B7280] hover:text-[#5B21B6] truncate mt-0.5"
                  >
                    Profile: {profile.profileUrl}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F3F4F6] text-[11px] text-[#6B7280] grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span>Audience Age: Not Available</span>
            <span>Audience Gender: Not Available</span>
            <span>Audience Geography: Not Available</span>
          </div>
        </div>

        {/* Multi-Platform Discovered Contact Channels */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#6B7280] flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
              <span>Multi-Platform Contact Channels (Verified Links Only)</span>
            </h4>
            {onUpdateChannels && (
              <div className="flex items-center gap-1.5 text-xs">
                <label htmlFor="preferred-outreach-channel" className="text-[11px] font-semibold text-[#6B7280]">
                  Preferred:
                </label>
                <select
                  id="preferred-outreach-channel"
                  value={activePreferred}
                  disabled={savingChannel}
                  onChange={(e) => void handleSavePreferred(e.target.value as OutreachChannel)}
                  className="h-7 rounded-lg border border-[#D1D5DB] bg-white px-2 text-[11px] font-semibold text-[#111827]"
                >
                  <option value="email">Email</option>
                  <option value="instagram_dm">Instagram DM</option>
                  <option value="linkedin_message">LinkedIn Message</option>
                  <option value="youtube_contact">YouTube Contact</option>
                </select>
              </div>
            )}
          </div>

          {channels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {channels.map((ch) => (
                <div
                  key={`${ch.type}-${ch.value}`}
                  className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2.5 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#111827]">
                        {CHANNEL_TYPE_LABELS[ch.type]}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          ch.verificationStatus === 'user_confirmed'
                            ? 'bg-[#D1FAE5] text-[#065F46]'
                            : ch.verificationStatus === 'found_publicly'
                              ? 'bg-[#EDE9FE] text-[#5B21B6]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {ch.verificationStatus.replace('_', ' ')}
                      </span>
                    </div>
                    {ch.url ? (
                      <a
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-[11px] font-medium text-[#5B21B6] hover:underline truncate"
                      >
                        {ch.value}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-[#374151] truncate">{ch.value}</p>
                    )}
                    <p className="text-[10px] text-[#6B7280] truncate">
                      Source: {ch.source} ({ch.linkingConfidence.replace('_', ' ')})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280]">
              Only primary profile link detected so far. Run Enrich Profile or explicitly confirm a verified LinkedIn/Instagram/Email link below.
            </p>
          )}

          {availability.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {availability.map((av) => (
                <div
                  key={av.channel}
                  title={av.unavailableReason || `Method: ${av.sendingMethod}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                    av.available
                      ? 'border-[#DDD6FE] bg-[#F5F3FF] text-[#5B21B6]'
                      : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-semibold">
                    <span className="truncate">{av.label}</span>
                    <span>{av.available ? av.sendingMethod.toUpperCase() : 'N/A'}</span>
                  </div>
                  <p className="text-[10px] truncate">
                    {av.available
                      ? av.recipientDisplay || 'Ready'
                      : av.unavailableReason || 'Unavailable'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {onUpdateChannels && (
            <form
              onSubmit={(e) => void handleConfirmAddChannel(e)}
              className="pt-2 border-t border-[#F3F4F6] space-y-2"
            >
              <p className="text-[11px] font-semibold text-[#4B5563]">
                Explicitly Link / Confirm Verified Channel (Never matched by name alone)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <select
                  aria-label="Channel type to confirm"
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as ContactChannelType)}
                  className="sm:col-span-3 h-8 rounded-lg border border-[#D1D5DB] bg-white px-2 text-xs text-[#111827]"
                >
                  <option value="linkedin">LinkedIn URL</option>
                  <option value="instagram">Instagram URL / @</option>
                  <option value="email">Business Email</option>
                  <option value="youtube">YouTube URL</option>
                  <option value="other_contact">Contact URL</option>
                </select>
                <input
                  type="text"
                  value={newChannelValue}
                  onChange={(e) => setNewChannelValue(e.target.value)}
                  placeholder="https://linkedin.com/in/... or verified@email.com"
                  className="sm:col-span-5 h-8 rounded-lg border border-[#D1D5DB] px-2.5 text-xs text-[#111827]"
                />
                <input
                  type="text"
                  value={newChannelEvidence}
                  onChange={(e) => setNewChannelEvidence(e.target.value)}
                  placeholder="Evidence note (optional)"
                  className="sm:col-span-2 h-8 rounded-lg border border-[#D1D5DB] px-2.5 text-xs text-[#111827]"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={savingChannel || !newChannelValue.trim()}
                  className="sm:col-span-2 h-8"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Confirm</span>
                </Button>
              </div>
              {channelFeedback && (
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{channelFeedback}</span>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Qualification & Methodology */}
        {(profile.qualificationReason ||
          profile.engagementSource ||
          profile.fitScoreBreakdown ||
          profile.engagementMeta) && (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wide text-[11px] text-[#6B7280]">
                Qualification &amp; Methodology
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {profile.classificationCode && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      profile.classificationCode === 'PASS'
                        ? 'bg-[#D1FAE5] text-[#059669]'
                        : profile.classificationCode === 'REVIEW_REQUIRED'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}
                  >
                    {profile.classificationCode}
                  </span>
                )}
                {typeof profile.fitScore === 'number' && (
                  <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10.5px] font-semibold text-[#5B21B6]">
                    Brand-Fit: {Math.round(profile.fitScore)}/100
                  </span>
                )}
                {profile.evaluatedAt && (
                  <span className="text-[10.5px] text-[#6B7280]">
                    Evaluated {new Date(profile.evaluatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {profile.qualificationReason && (
              <p className="text-[#111827]">
                <span className="font-semibold">Classification Reason: </span>
                {profile.qualificationReason}
              </p>
            )}
            {(profile.engagementSource || profile.engagementMeta?.formulaDescription) && (
              <p className="text-[#6B7280]">
                <span className="font-semibold text-[#374151]">Engagement Methodology: </span>
                {profile.engagementMeta?.formulaDescription
                  ? `${profile.engagementMeta.formulaDescription} (${profile.engagementMeta.sampleSize ?? profile.engagementSampleSize ?? 0} sampled; status: ${profile.engagementMeta.availabilityStatus ?? 'available'})`
                  : profile.engagementSource}
              </p>
            )}
            {profile.fitScoreBreakdown?.reasons && profile.fitScoreBreakdown.reasons.length > 0 && (
              <div className="pt-1 border-t border-[#E5E7EB] text-[11px] text-[#4B5563] space-y-0.5">
                <p className="font-semibold text-[#374151]">Fit Score Breakdown:</p>
                <p>{profile.fitScoreBreakdown.reasons.join(' · ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Content Themes & Evidence */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#6B7280] flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
            <span>Extracted Content Themes &amp; Evidence</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {profile.niches.map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B21B6]"
              >
                {theme}
              </span>
            ))}
          </div>

          {profile.contentEvidence && profile.contentEvidence.length > 0 ? (
            <ul className="space-y-1.5 pt-1 text-xs text-[#374151]">
              {profile.contentEvidence.slice(0, 6).map((item, idx) => (
                <li
                  key={`${item.theme}-${idx}`}
                  className="rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2"
                >
                  <span className="font-semibold text-[#111827]">{item.theme}: </span>
                  <span>{item.evidence}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#6B7280]">
              Click Enrich Profile to scan public bio, website contact pages, and content evidence with Gemini AI.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB]">
          <p className="text-[11px] text-[#6B7280]">
            SSRF-protected bounded public scan. Missing private emails and unlinked accounts are never guessed.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={enriching}
              onClick={() => void handleEnrich()}
              className="inline-flex items-center gap-1.5"
            >
              {enriching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : profile.enrichmentStatus === 'enriched' ? (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {enriching
                  ? 'Enriching...'
                  : profile.enrichmentStatus === 'enriched'
                    ? 'Re-enrich Profile'
                    : 'Enrich Profile'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
