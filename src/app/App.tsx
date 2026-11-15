import React from 'react';
import { DemoSessionProvider } from '../hooks/useDemoSession';
import { AdministrationPage } from '../pages/administration/AdministrationPage';
import { CampaignsPage } from '../pages/campaigns/CampaignsPage';
import { ContentPage } from '../pages/content/ContentPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { HelpPage } from '../pages/help/HelpPage';
import { IncentivesPage } from '../pages/incentives/IncentivesPage';
import { InfluencersPage } from '../pages/influencers/InfluencersPage';
import { LandingPage } from '../pages/landing/LandingPage';
import { MessagesPage } from '../pages/messages/MessagesPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { TasksPage } from '../pages/tasks/TasksPage';
import { RouterProvider, useAppRouter } from './routes';

const RouteView: React.FC = () => {
  const { currentPath } = useAppRouter();

  if (currentPath === '/' || currentPath === '') {
    return <LandingPage />;
  }

  if (currentPath === '/dashboard' || currentPath === '/demo-access') {
    return <DashboardPage />;
  }

  if (currentPath === '/discover' || currentPath === '/dashboard/influencers') {
    return <InfluencersPage />;
  }

  if (currentPath === '/dashboard/campaigns') {
    return <CampaignsPage />;
  }

  if (currentPath === '/dashboard/content') {
    return <ContentPage />;
  }

  if (currentPath === '/dashboard/incentives') {
    return <IncentivesPage />;
  }

  if (currentPath === '/dashboard/messages') {
    return <MessagesPage />;
  }

  if (currentPath === '/dashboard/reports') {
    return <ReportsPage />;
  }

  if (currentPath === '/dashboard/tasks') {
    return <TasksPage />;
  }

  if (currentPath === '/dashboard/settings') {
    return <SettingsPage />;
  }

  if (currentPath === '/dashboard/administration') {
    return <AdministrationPage />;
  }

  if (currentPath === '/dashboard/help') {
    return <HelpPage />;
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
