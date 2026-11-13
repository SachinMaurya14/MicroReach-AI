import React from 'react';
import {
  ArrowRight,
  Check,
  Compass,
  Filter,
  Mail,
  MessageSquare,
  Send,
  UserPlus,
} from 'lucide-react';
import { FEATURE_TABS } from '../data/landingContent';
import { FeatureTabId } from '../types/landing';
import { scrollToSection } from '../utils/scrollToSection';
import { DiscoveryTablePreview } from '../components/product-previews/DiscoveryTablePreview';
import { EmailPitchPreview } from '../components/product-previews/EmailPitchPreview';
import { InstagramDMPreview } from '../components/product-previews/InstagramDMPreview';
import { OutreachQueuePreview } from '../components/product-previews/OutreachQueuePreview';
import { ProfileEnrichmentPreview } from '../components/product-previews/ProfileEnrichmentPreview';
import { SmartFilteringPreview } from '../components/product-previews/SmartFilteringPreview';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

interface FeatureShowcaseSectionProps {
  activeTab: FeatureTabId;
  onTabChange: (tabId: FeatureTabId) => void;
}

const TAB_ICONS: Record<FeatureTabId, React.ComponentType<{ className?: string }>> = {
  discovery: Compass,
  filtering: Filter,
  enrichment: UserPlus,
  'email-pitch': Mail,
  'instagram-dm': MessageSquare,
  'outreach-tracker': Send,
};

export const FeatureShowcaseSection: React.FC<FeatureShowcaseSectionProps> = ({
  activeTab,
  onTabChange,
}) => {
  const currentFeature =
    FEATURE_TABS.find((tab) => tab.id === activeTab) ?? FEATURE_TABS[0];

  const renderPreview = () => {
    switch (activeTab) {
      case 'discovery':
        return <DiscoveryTablePreview />;
      case 'filtering':
        return <SmartFilteringPreview />;
      case 'enrichment':
        return <ProfileEnrichmentPreview />;
      case 'email-pitch':
        return <EmailPitchPreview />;
      case 'instagram-dm':
        return <InstagramDMPreview />;
      case 'outreach-tracker':
        return <OutreachQueuePreview />;
    }
  };

  return (
    <section id="features" className="py-20 md:py-24 bg-white">
      <Container>
        <SectionHeading
          title="What can you do with MicroReach AI?"
          subtitle="Everything you need to move from creator discovery to personalized outreach and campaign tracking."
        />

        {/* Six Interactive Horizontal Tabs */}
        <div className="mt-10 flex justify-start md:justify-center overflow-x-auto mr-scrollbar-hide pb-1">
          <div
            role="tablist"
            aria-label="MicroReach AI platform capabilities"
            className="inline-flex items-stretch rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-1 gap-1"
          >
            {FEATURE_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#F5F3FF] text-[#5B21B6] shadow-xs border-b-2 border-[#5B21B6]'
                      : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-white/70 border-b-2 border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Showcase Card */}
        <div
          role="tabpanel"
          id={`panel-${currentFeature.id}`}
          aria-labelledby={`tab-${currentFeature.id}`}
          className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 lg:p-10"
          style={{ boxShadow: 'var(--mr-shadow-subtle)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-5 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5B21B6]">
                {currentFeature.label}
              </p>
              <h3 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-[1.2] text-[#1F2937]">
                {currentFeature.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-[#4B5563]">
                {currentFeature.description}
              </p>

              <ul className="space-y-3 pt-1">
                {currentFeature.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-[#1F2937]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#5B21B6]">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => scrollToSection(currentFeature.ctaTarget)}
                >
                  <span>{currentFeature.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Right Interactive Product Mockup */}
            <div className="lg:col-span-7">{renderPreview()}</div>
          </div>
        </div>
      </Container>
    </section>
  );
};
