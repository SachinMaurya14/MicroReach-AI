import React, { useEffect, useState } from 'react';
import { ArrowUp, PlayCircle } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { AnnouncementBar } from '../../components/layout/AnnouncementBar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { RESOURCES_LIST } from '../../data/landingContent';
import { AudienceSection } from '../../sections/AudienceSection';
import { CampaignBanner } from '../../sections/CampaignBanner';
import { CapabilityStrip } from '../../sections/CapabilityStrip';
import { ComparisonSection } from '../../sections/ComparisonSection';
import { FAQSection } from '../../sections/FAQSection';
import { FeatureShowcaseSection } from '../../sections/FeatureShowcaseSection';
import { FinalCTASection } from '../../sections/FinalCTASection';
import { HeroSection } from '../../sections/HeroSection';
import { PricingPreviewSection } from '../../sections/PricingPreviewSection';
import { ResourcesSection } from '../../sections/ResourcesSection';
import { UseCasesSection } from '../../sections/UseCasesSection';
import { WhyMicroReachSection } from '../../sections/WhyMicroReachSection';
import { WorkflowSection } from '../../sections/WorkflowSection';
import { FeatureTabId, ResourceItem } from '../../types/landing';
import { scrollToSection } from '../../utils/scrollToSection';

type InfoTopic = 'about' | 'contact' | 'careers' | 'privacy' | 'terms';

const INFO_TOPIC_CONTENT: Record<InfoTopic, { title: string; subtitle: string; body: string }> = {
  about: {
    title: 'About MicroReach AI',
    subtitle: 'Discover creators. Build relationships. Reach out with relevance.',
    body: 'MicroReach AI is an AI-powered micro-influencer discovery, qualification, profile enrichment, and outreach platform. The initial release workflow focuses on Beauty & Skincare creator discovery using YouTube Data API v3, transparent qualification criteria, source-aware records, and approval-first outreach tracking.',
  },
  contact: {
    title: 'Contact & Early Access',
    subtitle: 'Public contact channels are not yet published',
    body: 'MicroReach AI is currently in pre-launch frontend preview. Direct support email addresses and office details will be published once the backend and workspace accounts are provisioned.',
  },
  careers: {
    title: 'Careers at MicroReach AI',
    subtitle: 'Team updates',
    body: 'No open roles are currently posted on this public marketing preview. Check back after the platform launch phase.',
  },
  privacy: {
    title: 'Privacy Policy Summary',
    subtitle: 'Public data transparency principles',
    body: 'MicroReach AI is designed to work strictly with permitted public creator sources, mark unavailable contact emails as Not Found rather than guessing, and require human approval before outbound outreach. Full legal policy documentation will accompany workspace launch.',
  },
  terms: {
    title: 'Terms of Service Summary',
    subtitle: 'Platform compliance principles',
    body: 'Users must respect source platform terms, avoid unauthorized scraping, and execute Instagram DMs manually unless an officially permitted integration is configured. Complete Terms of Service will be finalized prior to general availability.',
  },
};

export const LandingPage: React.FC = () => {
  const { navigate } = useAppRouter();
  const [activeFeatureTab, setActiveFeatureTab] = useState<FeatureTabId>('discovery');
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [activeResource, setActiveResource] = useState<ResourceItem | null>(null);
  const [activeInfoTopic, setActiveInfoTopic] = useState<InfoTopic | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 640);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleOpenResourceById = (resourceId: string) => {
    const found = RESOURCES_LIST.find((r) => r.id === resourceId) ?? null;
    setActiveResource(found);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1F2937]">
      <AnnouncementBar />

      <SiteHeader
        onSelectFeatureTab={setActiveFeatureTab}
        onNavigateDashboard={() => navigate('/dashboard')}
        onOpenResourceById={handleOpenResourceById}
      />

      <main className="flex-1">
        <HeroSection onOpenWalkthroughModal={() => setWalkthroughOpen(true)} />
        <CapabilityStrip />
        <FeatureShowcaseSection
          activeTab={activeFeatureTab}
          onTabChange={setActiveFeatureTab}
        />
        <AudienceSection />
        <WhyMicroReachSection />
        <WorkflowSection />
        <ComparisonSection />
        <UseCasesSection />
        <CampaignBanner />
        <ResourcesSection onSelectResource={setActiveResource} />
        <PricingPreviewSection />
        <FAQSection />
        <FinalCTASection />
      </main>

      <SiteFooter
        onSelectFeatureTab={setActiveFeatureTab}
        onOpenResourceById={handleOpenResourceById}
        onOpenInfoModal={(topic) => setActiveInfoTopic(topic)}
      />

      {/* Watch Walkthrough Modal (Clearly Labelled Placeholder) */}
      <Modal
        isOpen={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        title="Product Walkthrough Preview"
        subtitle="Walkthrough video placeholder — final recorded demo will be added once live workspace integration is connected."
      >
        <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-8 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#5B21B6] text-white">
            <PlayCircle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h4 className="mt-4 text-lg font-bold text-[#1F2937]">
            Walkthrough Video Coming Soon
          </h4>
          <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-[#4B5563]">
            This interactive placeholder previews the six-stage MicroReach AI workflow: Discovery,
            Data Collection, Filtering, Enrichment, AI Personalization, and Human-Approved
            Tracking.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setWalkthroughOpen(false);
                navigate('/dashboard');
              }}
            >
              Open Dashboard Preview
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setWalkthroughOpen(false);
                scrollToSection('features');
              }}
            >
              Explore Interactive Tabs
            </Button>
          </div>
        </div>
      </Modal>

      {/* Editorial Resource Reader Modal */}
      <Modal
        isOpen={activeResource !== null}
        onClose={() => setActiveResource(null)}
        title={activeResource?.title ?? ''}
        subtitle={activeResource ? `${activeResource.category} Guide` : undefined}
      >
        {activeResource && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-[#4B5563]">{activeResource.description}</p>
            <div className="space-y-4 divide-y divide-[#E5E7EB] border-t border-[#E5E7EB] pt-4">
              {activeResource.sections.map((section) => (
                <div key={section.heading} className="pt-4 first:pt-0">
                  <h4 className="text-base font-bold text-[#1F2937]">{section.heading}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4B5563]">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Footer Info Modal (Company / Legal Preview) */}
      <Modal
        isOpen={activeInfoTopic !== null}
        onClose={() => setActiveInfoTopic(null)}
        title={activeInfoTopic ? INFO_TOPIC_CONTENT[activeInfoTopic].title : ''}
        subtitle={activeInfoTopic ? INFO_TOPIC_CONTENT[activeInfoTopic].subtitle : undefined}
        maxWidthClass="max-w-lg"
      >
        {activeInfoTopic && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-[#4B5563]">
              {INFO_TOPIC_CONTENT[activeInfoTopic].body}
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setActiveInfoTopic(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Discreet Back to Top Control */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-[#5B21B6] shadow-lg hover:bg-[#F5F3FF] transition-colors cursor-pointer"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
