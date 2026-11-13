import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppRouter } from '../app/routes';
import { scrollToSection } from '../utils/scrollToSection';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';

export const FinalCTASection: React.FC = () => {
  const { navigate } = useAppRouter();
  return (
    <section className="relative overflow-hidden bg-[#1E0B36] py-20 md:py-24 text-white">
      {/* Restrained Decorative SVG Line-Work */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        viewBox="0 0 1200 360"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-40 280C220 190 420 330 660 220C880 120 1020 210 1240 90"
          stroke="#A78BFA"
          strokeWidth="1.2"
        />
        <path
          d="M-40 120C200 220 460 70 720 170C950 260 1080 140 1240 230"
          stroke="#7C3AED"
          strokeWidth="1"
        />
      </svg>

      <Container className="relative z-10 text-center">
        <div className="mx-auto max-w-[680px]">
          <h2 className="text-[30px] sm:text-[38px] md:text-[42px] font-bold tracking-[-0.02em] leading-[1.18] text-white">
            Ready to scale your micro-influencer outreach?
          </h2>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-[#DDD6FE]">
            Bring discovery, qualification, personalization and outreach tracking into one clear
            workflow.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="border border-white/15"
            >
              <span>Start Free Outreach</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              variant="light"
              size="lg"
              onClick={() => scrollToSection('how-it-works')}
            >
              See How It Works
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};
