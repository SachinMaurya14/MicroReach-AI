import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { FeatureTabId } from '../../types/landing';
import { scrollToSection } from '../../utils/scrollToSection';
import { BrandLogo } from '../BrandLogo';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';

interface SiteHeaderProps {
  onSelectFeatureTab: (tabId: FeatureTabId) => void;
  onNavigateDashboard: () => void;
  onOpenResourceById: (resourceId: string) => void;
}

const PRODUCT_DROPDOWN_ITEMS: { label: string; description: string; tabId: FeatureTabId }[] = [
  {
    label: 'Creator Discovery',
    description: 'Niche and geography-based public sourcing',
    tabId: 'discovery',
  },
  {
    label: 'Smart Filtering',
    description: 'Transparent qualification thresholds',
    tabId: 'filtering',
  },
  {
    label: 'Profile Enrichment',
    description: 'Source-aware creator contact records',
    tabId: 'enrichment',
  },
  {
    label: 'AI Email Pitch',
    description: '60–90 word personalized outreach drafts',
    tabId: 'email-pitch',
  },
  {
    label: 'Instagram DM',
    description: '15–30 word manual DM workflows',
    tabId: 'instagram-dm',
  },
  {
    label: 'Outreach Tracker',
    description: 'Approval-first queue & duplicate prevention',
    tabId: 'outreach-tracker',
  },
];

const RESOURCE_DROPDOWN_ITEMS: { label: string; resourceId?: string; sectionId?: string }[] = [
  { label: 'Micro-Influencer Discovery Guide', resourceId: 'discovery-guide' },
  { label: 'Understanding Engagement', resourceId: 'engagement-guide' },
  { label: 'Personalized Outreach Guide', resourceId: 'outreach-guide' },
  { label: 'Frequently Asked Questions', sectionId: 'faq' },
];

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  onSelectFeatureTab,
  onNavigateDashboard,
  onOpenResourceById,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'product' | 'resources' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const navigateToSection = (sectionId: string) => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    scrollToSection(sectionId);
  };

  const handleSelectFeature = (tabId: FeatureTabId) => {
    onSelectFeatureTab(tabId);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    scrollToSection('features');
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-[#E5E7EB]/85"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.90)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container>
        <div className="flex h-16 md:h-20 items-center justify-between gap-6">
          {/* Left: Brand Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="MicroReach AI home"
            className="shrink-0"
          >
            <BrandLogo />
          </a>

          {/* Center: Desktop Navigation */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-7">
            {/* Product Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'product'}
                onClick={() =>
                  setOpenDropdown((prev) => (prev === 'product' ? null : 'product'))
                }
                className="inline-flex items-center gap-1 text-[15px] font-medium text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Product</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-150 ${
                    openDropdown === 'product' ? 'rotate-180 text-[#5B21B6]' : 'text-[#6B7280]'
                  }`}
                  aria-hidden="true"
                />
              </button>

              {openDropdown === 'product' && (
                <div className="absolute left-0 top-full mt-3 w-[320px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-xl">
                  {PRODUCT_DROPDOWN_ITEMS.map((item) => (
                    <button
                      key={item.tabId}
                      type="button"
                      onClick={() => handleSelectFeature(item.tabId)}
                      className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-[#F5F3FF] transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-semibold text-[#1F2937]">{item.label}</div>
                      <div className="text-xs text-[#6B7280] mt-0.5">{item.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateToSection('how-it-works')}
              className="text-[15px] font-medium text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              How It Works
            </button>

            <button
              type="button"
              onClick={() => navigateToSection('use-cases')}
              className="text-[15px] font-medium text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Use Cases
            </button>

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'resources'}
                onClick={() =>
                  setOpenDropdown((prev) => (prev === 'resources' ? null : 'resources'))
                }
                className="inline-flex items-center gap-1 text-[15px] font-medium text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Resources</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-150 ${
                    openDropdown === 'resources' ? 'rotate-180 text-[#5B21B6]' : 'text-[#6B7280]'
                  }`}
                  aria-hidden="true"
                />
              </button>

              {openDropdown === 'resources' && (
                <div className="absolute left-0 top-full mt-3 w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-xl">
                  {RESOURCE_DROPDOWN_ITEMS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        if (item.resourceId) {
                          onOpenResourceById(item.resourceId);
                        } else if (item.sectionId) {
                          navigateToSection(item.sectionId);
                        }
                      }}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#1F2937] hover:bg-[#F5F3FF] hover:text-[#5B21B6] transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateToSection('pricing')}
              className="text-[15px] font-medium text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Pricing
            </button>

            <button
              type="button"
              onClick={() => navigateToSection('faq')}
              className="text-[15px] font-medium text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              FAQ
            </button>
          </nav>

          {/* Right: Login & Get Started */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="px-3.5 py-2 text-[15px] font-semibold text-[#1F2937] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Login
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateDashboard}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Hamburger Trigger */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile Navigation Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E5E7EB] bg-white px-5 py-5 shadow-lg">
          <nav aria-label="Mobile navigation" className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                Product Capabilities
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRODUCT_DROPDOWN_ITEMS.map((item) => (
                  <button
                    key={item.tabId}
                    type="button"
                    onClick={() => handleSelectFeature(item.tabId)}
                    className="rounded-lg bg-[#F9FAFB] px-3 py-2 text-left text-xs font-medium text-[#1F2937] hover:bg-[#F5F3FF] hover:text-[#5B21B6] cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-1 border-t border-[#E5E7EB] pt-3">
              <button
                type="button"
                onClick={() => navigateToSection('how-it-works')}
                className="py-2 text-left text-sm font-medium text-[#1F2937] cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => navigateToSection('use-cases')}
                className="py-2 text-left text-sm font-medium text-[#1F2937] cursor-pointer"
              >
                Use Cases
              </button>
              <button
                type="button"
                onClick={() => navigateToSection('resources')}
                className="py-2 text-left text-sm font-medium text-[#1F2937] cursor-pointer"
              >
                Resources
              </button>
              <button
                type="button"
                onClick={() => navigateToSection('pricing')}
                className="py-2 text-left text-sm font-medium text-[#1F2937] cursor-pointer"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => navigateToSection('faq')}
                className="py-2 text-left text-sm font-medium text-[#1F2937] cursor-pointer"
              >
                FAQ
              </button>
            </div>

            <div className="flex items-center gap-3 border-t border-[#E5E7EB] pt-4">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateDashboard();
                }}
              >
                Login
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateDashboard();
                }}
              >
                Get Started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
