import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

export const PricingPreviewSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage(null);
    setSubmittedEmail(trimmed);
    setEmail('');
  };

  return (
    <section id="pricing" className="py-20 md:py-24 bg-white border-t border-[#E5E7EB]">
      <Container>
        <div
          id="get-started"
          className="mx-auto max-w-[760px] rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-8 sm:p-12 text-center"
        >
          <SectionHeading
            title="Straightforward pricing for smarter outreach"
            subtitle="MicroReach AI pricing details are being finalized."
          />

          <form onSubmit={handleSubmit} noValidate className="mx-auto mt-8 max-w-[460px]">
            <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="early-access-email" className="sr-only">
                Work email for early access updates
              </label>
              <input
                id="early-access-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF]"
              />
              <Button type="submit" variant="primary" size="md">
                Get Early Access Updates
              </Button>
            </div>

            {errorMessage && (
              <p className="mt-2.5 text-xs font-medium text-[#EF4444]" role="alert">
                {errorMessage}
              </p>
            )}

            {submittedEmail && (
              <div
                className="mt-4 inline-flex items-start gap-2 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3 text-left text-xs text-[#1F2937]"
                role="status"
              >
                <CheckCircle2 className="h-4 w-4 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Preview validated for <strong>{submittedEmail}</strong>. This is a frontend
                  preview only — no data was transmitted or stored because backend persistence is not
                  connected yet.
                </span>
              </div>
            )}

            <p className="mt-4 text-xs text-[#6B7280]">
              Frontend preview only: early-access submissions are not stored until backend
              integration is configured.
            </p>
          </form>
        </div>
      </Container>
    </section>
  );
};
