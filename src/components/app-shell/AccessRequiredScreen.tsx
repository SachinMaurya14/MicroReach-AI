import React from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { BrandLogo } from '../BrandLogo';
import { Button } from '../ui/Button';

interface AccessRequiredScreenProps {
  demoAccessConfigured: boolean;
}

export const AccessRequiredScreen: React.FC<AccessRequiredScreenProps> = ({
  demoAccessConfigured,
}) => {
  const { navigate } = useAppRouter();

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827] flex flex-col">
      <header className="h-16 border-b border-[#E5E7EB] bg-white px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer"
          aria-label="MicroReach AI Home"
        >
          <BrandLogo size="sm" tone="dark" />
        </button>

        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Landing Page</span>
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[520px] rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDE9FE] text-[#5B21B6]">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="mt-4 text-center text-2xl font-bold text-[#111827]">
            Access Link Required
          </h1>
          <p className="mt-2.5 text-center text-sm leading-relaxed text-[#4B5563]">
            This MicroReach AI dashboard is a shared workspace protected by a private evaluator
            invitation link. No workspace records are exposed without an active invitation session.
          </p>

          <div className="mt-6 space-y-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs text-[#4B5563]">
            <div className="flex items-start gap-2.5">
              <KeyRound className="h-4 w-4 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-[#111827]">How Evaluators Enter</p>
                <p className="mt-0.5 leading-relaxed">
                  Open the full private link shared by the project owner in the format{' '}
                  <code className="rounded bg-[#EDE9FE] px-1.5 py-0.5 text-[11px] text-[#5B21B6]">
                    /demo-access#token=YOUR_INVITATION_TOKEN
                  </code>
                  . No account registration or password is required.
                </p>
              </div>
            </div>

            {!demoAccessConfigured && (
              <div className="flex items-start gap-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[#92400E]">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Server Setup Pending</p>
                  <p className="mt-0.5 leading-relaxed">
                    The project owner still needs to set{' '}
                    <code>DEMO_ACCESS_TOKEN</code> and <code>DEMO_SESSION_SECRET</code> in server
                    secrets before invitation links can be exchanged.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="primary" size="md" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to Public Overview</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
