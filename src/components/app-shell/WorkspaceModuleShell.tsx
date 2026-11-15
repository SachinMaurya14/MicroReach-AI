import React, { useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { Button } from '../ui/Button';
import { AppSidebar } from './AppSidebar';

interface WorkspaceModuleShellProps {
  moduleName: string;
  currentPath: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const WorkspaceModuleShell: React.FC<WorkspaceModuleShellProps> = ({
  moduleName,
  currentPath,
  subtitle,
  headerActions,
  children,
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
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg border border-[#E5E7EB] p-2 text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="text-sm text-[#6B7280] truncate">
                <span>Workspace</span>
                <span className="mx-2">&gt;</span>
                <span className="font-semibold text-[#111827]">{moduleName}</span>
              </div>
              {subtitle && (
                <p className="text-[11px] text-[#6B7280] truncate hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-[1360px] space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
};
