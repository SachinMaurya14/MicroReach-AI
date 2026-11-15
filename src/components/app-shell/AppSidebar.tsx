import React from 'react';
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  DollarSign,
  HelpCircle,
  Home,
  Image,
  Mail,
  MoreHorizontal,
  Settings,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { APP_SIDEBAR_ITEMS, SidebarNavItem } from '../../data/navigation';
import { BrandLogo } from '../BrandLogo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

interface AppSidebarProps {
  variant: 'dark' | 'light';
  activePath: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ICON_MAP: Record<
  SidebarNavItem['iconKey'],
  React.ComponentType<{ className?: string }>
> = {
  dashboard: Home,
  influencers: Users,
  campaigns: Zap,
  content: Image,
  incentives: DollarSign,
  messages: Mail,
  reports: BarChart3,
  tasks: CheckSquare,
  settings: Settings,
  administration: Shield,
  help: HelpCircle,
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  variant,
  activePath,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { navigate } = useAppRouter();
  const isDark = variant === 'dark';

  const primaryItems = APP_SIDEBAR_ITEMS.filter((item) => item.section === 'primary');
  const secondaryItems = APP_SIDEBAR_ITEMS.filter((item) => item.section === 'secondary');

  const handleNavClick = (path: string) => {
    navigate(path);
    onCloseMobile?.();
  };

  const widthClass = isDark ? 'w-[240px]' : 'w-[220px]';

  const renderSidebarBody = () => (
    <div
      className={`flex h-full flex-col justify-between ${
        isDark
          ? 'bg-[#1B0D33] text-white'
          : 'bg-white text-[#111827] border-r border-[#E5E7EB]'
      }`}
    >
      {/* Top Brand + Primary Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between px-2 pb-5">
          <button
            type="button"
            onClick={() => handleNavClick('/dashboard')}
            className="text-left cursor-pointer"
            aria-label="MicroReach AI Dashboard"
          >
            <BrandLogo size="sm" tone={isDark ? 'light' : 'dark'} />
          </button>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close sidebar menu"
              className={`lg:hidden rounded-lg p-1.5 cursor-pointer ${
                isDark
                  ? 'text-[#DDD6FE] hover:bg-white/10'
                  : 'text-[#4B5563] hover:bg-[#F3F4F6]'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav aria-label="Application navigation" className="space-y-1">
          {primaryItems.map((item) => {
            const Icon = ICON_MAP[item.iconKey];
            const isActive = activePath === item.path;

            const activeClasses = isDark
              ? 'bg-[#2E1A4E] text-white font-semibold'
              : 'bg-[#EDE9FE] text-[#5B21B6] font-semibold';

            const inactiveClasses = isDark
              ? 'text-[#DDD6FE]/80 hover:bg-white/8 hover:text-white font-medium'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] font-medium';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-10 w-full items-center justify-between gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors cursor-pointer ${
                  isActive ? activeClasses : inactiveClasses
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? isDark
                          ? 'text-white'
                          : 'text-[#5B21B6]'
                        : isDark
                          ? 'text-[#DDD6FE]/75'
                          : 'text-[#6B7280]'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </span>

                {typeof item.badgeCount === 'number' && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold mr-tabular ${
                      isDark
                        ? 'bg-[#5B21B6] text-white'
                        : 'bg-[#EDE9FE] text-[#5B21B6]'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          className={`my-4 border-t ${isDark ? 'border-white/10' : 'border-[#E5E7EB]'}`}
          aria-hidden="true"
        />

        <nav aria-label="Workspace settings navigation" className="space-y-1">
          {secondaryItems.map((item) => {
            const Icon = ICON_MAP[item.iconKey];
            const isActive = activePath === item.path;

            const activeClasses = isDark
              ? 'bg-[#2E1A4E] text-white font-semibold'
              : 'bg-[#EDE9FE] text-[#5B21B6] font-semibold';

            const inactiveClasses = isDark
              ? 'text-[#DDD6FE]/75 hover:bg-white/8 hover:text-white font-medium'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] font-medium';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors cursor-pointer ${
                  isActive ? activeClasses : inactiveClasses
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Workspace Switcher + Back to Landing Page */}
      <div
        className={`px-3 py-3.5 border-t space-y-2.5 ${
          isDark ? 'border-white/10' : 'border-[#E5E7EB]'
        }`}
      >
        <div className="flex justify-end px-1">
          <MoreHorizontal
            className={`h-4 w-4 ${isDark ? 'text-[#DDD6FE]/60' : 'text-[#9CA3AF]'}`}
            aria-hidden="true"
          />
        </div>

        <WorkspaceSwitcher variant={variant} />

        <button
          type="button"
          onClick={() => handleNavClick('/dashboard')}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
            isDark
              ? 'text-[#DDD6FE]/85 hover:bg-white/10 hover:text-white'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed-Width Sidebar */}
      <aside className={`hidden lg:block ${widthClass} shrink-0 h-screen sticky top-0`}>
        {renderSidebarBody()}
      </aside>

      {/* Mobile / Tablet Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#111827]/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className={`relative z-10 ${widthClass} max-w-[82vw] h-full shadow-2xl`}>
            {renderSidebarBody()}
          </aside>
        </div>
      )}
    </>
  );
};
