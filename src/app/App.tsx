import React from 'react';
import { Loader2 } from 'lucide-react';
import { AccessRequiredScreen } from '../components/app-shell/AccessRequiredScreen';
import { ComingSoonPage } from '../components/app-shell/ComingSoonPage';
import { APP_SIDEBAR_ITEMS } from '../data/navigation';
import { DemoSessionProvider, useDemoSession } from '../hooks/useDemoSession';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { DemoAccessPage } from '../pages/demo-access/DemoAccessPage';
import { InfluencersPage } from '../pages/influencers/InfluencersPage';
import { LandingPage } from '../pages/landing/LandingPage';
import { RouterProvider, useAppRouter } from './routes';

const DemoSessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, authenticated, demoAccessConfigured } = useDemoSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-5 py-3.5 text-sm font-medium text-[#4B5563] shadow-xs">
          <Loader2 className="h-4 w-4 animate-spin text-[#5B21B6]" aria-hidden="true" />
          <span>Checking shared workspace session...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <AccessRequiredScreen demoAccessConfigured={demoAccessConfigured} />;
  }

  return <>{children}</>;
};

const RouteView: React.FC = () => {
  const { currentPath } = useAppRouter();

  if (currentPath === '/' || currentPath === '') {
    return <LandingPage />;
  }

  if (currentPath === '/demo-access') {
    return <DemoAccessPage />;
  }

  if (currentPath === '/dashboard') {
    return (
      <DemoSessionGate>
        <DashboardPage />
      </DemoSessionGate>
    );
  }

  if (currentPath === '/dashboard/influencers') {
    return (
      <DemoSessionGate>
        <InfluencersPage />
      </DemoSessionGate>
    );
  }

  const matchedSidebarItem = APP_SIDEBAR_ITEMS.find((item) => item.path === currentPath);
  if (matchedSidebarItem) {
    return (
      <DemoSessionGate>
        <ComingSoonPage
          moduleName={matchedSidebarItem.label}
          currentPath={matchedSidebarItem.path}
        />
      </DemoSessionGate>
    );
  }

  return <LandingPage />;
};

export function App() {
  return (
    <DemoSessionProvider>
      <RouterProvider>
        <RouteView />
      </RouterProvider>
    </DemoSessionProvider>
  );
}

export default App;
