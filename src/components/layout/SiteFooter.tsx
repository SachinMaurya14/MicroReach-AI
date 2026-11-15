import React, { useState } from 'react';
import { FeatureTabId } from '../../types/landing';
import { scrollToSection } from '../../utils/scrollToSection';
import { BrandLogo } from '../BrandLogo';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';

interface SiteFooterProps {
  onSelectFeatureTab: (tabId: FeatureTabId) => void;
  onOpenResourceById: (resourceId: string) => void;
  onOpenInfoModal: (topic: 'about' | 'contact' | 'careers' | 'privacy' | 'terms') => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onSelectFeatureTab,
  onOpenResourceById,
  onOpenInfoModal,
}) => {
  const [subEmail, setSubEmail] = useState('');
  const [subFeedback, setSubFeedback] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = subEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSubFeedback('Enter a valid email address to preview updates.');
      return;
    }
    setSubFeedback(
      `Frontend preview only: ${trimmed} was validated locally (no backend configured).`
    );
    setSubEmail('');
  };

  const jumpToFeature = (tabId: FeatureTabId) => {
    onSelectFeatureTab(tabId);
    scrollToSection('features');
  };

  return (
    <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB] pt-16 pb-12 text-[#1F2937]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-[#E5E7EB]">
          {/* Left Brand & Preview Subscription Column */}
          <div className="lg:col-span-4 space-y-4">
            <BrandLogo />
            <p className="text-sm leading-relaxed text-[#4B5563] max-w-[320px]">
              Discover creators. Build relationships. Reach out with relevance.
            </p>

            <form onSubmit={handleSubscribe} noValidate className="pt-2 max-w-[340px]">
              <p className="text-xs font-semibold text-[#1F2937] mb-2">
                Product Updates (Frontend Preview)
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="footer-email" className="sr-only">
                  Email address for product updates preview
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs text-[#1F2937] placeholder:text-[#9CA3AF]"
                />
                <Button type="submit" variant="primary" size="sm">
                  Notify Me
                </Button>
              </div>
              {subFeedback && (
                <p className="mt-2 text-[11px] leading-snug text-[#5B21B6]">{subFeedback}</p>
              )}
            </form>
          </div>

          {/* 5 Link Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-sm">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                Product
              </h3>
              <ul className="mt-4 space-y-2.5 text-[#4B5563]">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('features')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToFeature('discovery')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Discovery
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToFeature('email-pitch')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Personalization
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToFeature('outreach-tracker')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Outreach Tracking
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                Workflow
              </h3>
              <ul className="mt-4 space-y-2.5 text-[#4B5563]">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('how-it-works')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToFeature('filtering')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Qualification
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToFeature('enrichment')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Profile Enrichment
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('use-cases')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Campaign Tracking
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                Resources
              </h3>
              <ul className="mt-4 space-y-2.5 text-[#4B5563]">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenResourceById('discovery-guide')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Guides
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenResourceById('engagement-guide')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Documentation
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('faq')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    FAQs
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                Company
              </h3>
              <ul className="mt-4 space-y-2.5 text-[#4B5563]">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('about')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    About MicroReach AI
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('contact')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('careers')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Careers
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                Legal
              </h3>
              <ul className="mt-4 space-y-2.5 text-[#4B5563]">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('privacy')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('terms')}
                    className="hover:text-[#5B21B6] transition-colors cursor-pointer text-left"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>Copyright 2026 MicroReach AI. All rights reserved.</p>
          <p>Public marketing preview · Illustrative demo data shown where indicated.</p>
        </div>
      </Container>
    </footer>
  );
};
