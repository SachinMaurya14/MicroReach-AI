import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppRouter } from '../app/routes';
import { scrollToSection } from '../utils/scrollToSection';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';

export const CampaignBanner: React.FC = () => {
  const { navigate } = useAppRouter();
  return (
    <section className="py-12 md:py-16 bg-white">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] px-6 py-12 sm:px-12 sm:py-16 text-center">
          {/* Restrained Geometric SVG Accents (Left) */}
          <svg
            className="hidden sm:block pointer-events-none absolute left-6 top-6 h-24 w-24 text-[#5B21B6]/20 mr-animate-float"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="34" cy="54" r="18" stroke="currentColor" strokeWidth="2" />
            <circle cx="34" cy="54" r="10" fill="#DDD6FE" fillOpacity="0.65" />
            <path
              d="M70 16L73 24L81 27L73 30L70 38L67 30L59 27L67 24L70 16Z"
              fill="#7C3AED"
              fillOpacity="0.35"
            />
          </svg>

          {/* Restrained Geometric SVG Accents (Right) */}
          <svg
            className="hidden sm:block pointer-events-none absolute right-6 bottom-6 h-24 w-24 text-[#5B21B6]/20 mr-animate-float-slow"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M62 24A18 18 0 1 0 80 56A14 14 0 1 1 62 24Z"
              fill="#5B21B6"
              fillOpacity="0.22"
            />
            <circle cx="28" cy="72" r="7" stroke="#7C3AED" strokeOpacity="0.35" strokeWidth="2" />
            <path
              d="M36 28L38 33L43 35L38 37L36 42L34 37L29 35L34 33L36 28Z"
              fill="#5B21B6"
              fillOpacity="0.3"
            />
          </svg>

          <div className="relative z-10 mx-auto max-w-[640px]">
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] leading-[1.2] text-[#1F2937]">
              Ready to build a smarter influencer campaign?
            </h2>
            <p className="mt-4 text-[15px] sm:text-[17px] leading-relaxed text-[#4B5563]">
              Discover relevant creators, qualify profiles and prepare personalized outreach with
              MicroReach AI.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
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
                onClick={() => scrollToSection('how-it-works')}
              >
                Explore How It Works
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
