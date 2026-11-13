import React, { useState } from 'react';
import { ArrowRight, Clock, Menu } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { Button } from '../ui/Button';
import { AppSidebar } from './AppSidebar';

interface ComingSoonPageProps {
  moduleName: string;
  currentPath: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  moduleName,
  currentPath,
}) => {
  const { navigate } = useAppRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F8F9FC] text-[#111827]">
      <AppSidebar
        variant="dark"
        activePath={currentPath}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg border border-[#E5E7EB] p-2 text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="text-sm text-[#6B7280]">
              <span>Workspace</span>
              <span className="mx-2">&gt;</span>
              <span className="font-semibold text-[#111827]">{moduleName}</span>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-[500px] w-full rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EDE9FE] text-[#5B21B6]">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#111827]">
              {moduleName} — Coming Soon
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#6B7280]">
              The {moduleName} workspace is planned for a future phase. During this UI
              implementation phase, the active interactive workspaces are{' '}
              <strong className="text-[#111827]">Dashboard</strong> and{' '}
              <strong className="text-[#111827]">Influencers</strong>.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
                <span>Open Dashboard</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard/influencers')}
              >
                Open Influencers Discovery
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
