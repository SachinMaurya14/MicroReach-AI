import React from 'react';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { useAppRouter } from '../app/routes';
import { CreatorDashboardPreview } from '../components/product-previews/CreatorDashboardPreview';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';

interface HeroSectionProps {
  onOpenWalkthroughModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenWalkthroughModal }) => {
  const { navigate } = useAppRouter();

  return (
    <section id="top" className="mr-hero-gradient pt-14 pb-12 md:pt-20 md:pb-16">
      <Container>
        <div className="mx-auto max-w-[820px] text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center rounded-full border border-[#DDD6FE] bg-white px-4 py-1.5 text-xs font-semibold tracking-[0.06em] uppercase text-[#5B21B6] shadow-xs">
            AI-POWERED INFLUENCER OUTREACH PLATFORM
          </div>

          {/* Main Hero H1 */}
          <h1 className="mt-6 text-[36px] sm:text-[46px] md:text-[56px] font-extrabold tracking-[-0.025em] leading-[1.13] text-[#1F2937]">
            Automated <span className="text-[#5B21B6]">Micro-Influencer</span> Discovery &amp;{' '}
            <span className="text-[#5B21B6]">Personalized Outreach</span>
          </h1>

          {/* Supporting Description */}
          <p className="mx-auto mt-6 max-w-[660px] text-[16px] sm:text-[18px] leading-[1.6] text-[#4B5563]">
            Discover relevant creators, evaluate their fit, enrich their profiles, and generate
            personalized collaboration messages — all through one connected outreach workflow.
          </p>

          {/* CTA Cluster with subtle hand-drawn SVG arrow */}
          <div className="relative mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {/* Subtle Hand-Drawn SVG Arrow pointing to Primary CTA */}
            <svg
              className="hidden md:block absolute -left-14 lg:-left-10 -top-4 h-14 w-16 text-[#1F2937]"
              viewBox="0 0 72 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M16 8C8 24 14 45 48 45"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M41 39L49 45L42 51"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/dashboard')}
            >
              <span>Start Free Outreach</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={onOpenWalkthroughModal}
            >
              <Play className="h-4 w-4 text-[#5B21B6] fill-[#5B21B6]" aria-hidden="true" />
              <span>Watch Walkthrough</span>
            </Button>
          </div>

          {/* Three Short Value Statements */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-[#4B5563]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#5B21B6]" aria-hidden="true" />
              <span>Source-aware Discovery</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#5B21B6]" aria-hidden="true" />
              <span>Transparent Qualification</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#5B21B6]" aria-hidden="true" />
              <span>Human-approved Outreach</span>
            </span>
          </div>
        </div>

        {/* Large Central Product Preview */}
        <div className="mt-12 md:mt-14">
          <CreatorDashboardPreview />
        </div>
      </Container>
    </section>
  );
};
