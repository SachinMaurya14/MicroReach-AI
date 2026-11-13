export interface SidebarNavItem {
  id: string;
  label: string;
  path: string;
  iconKey:
    | 'dashboard'
    | 'influencers'
    | 'campaigns'
    | 'content'
    | 'incentives'
    | 'messages'
    | 'reports'
    | 'tasks'
    | 'settings'
    | 'administration'
    | 'help';
  badgeCount?: number;
  section: 'primary' | 'secondary';
}

export const APP_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    iconKey: 'dashboard',
    section: 'primary',
  },
  {
    id: 'influencers',
    label: 'Influencers',
    path: '/dashboard/influencers',
    iconKey: 'influencers',
    section: 'primary',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    path: '/dashboard/campaigns',
    iconKey: 'campaigns',
    section: 'primary',
  },
  {
    id: 'content',
    label: 'Content',
    path: '/dashboard/content',
    iconKey: 'content',
    section: 'primary',
  },
  {
    id: 'incentives',
    label: 'Incentives',
    path: '/dashboard/incentives',
    iconKey: 'incentives',
    section: 'primary',
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/dashboard/messages',
    iconKey: 'messages',
    section: 'primary',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/dashboard/reports',
    iconKey: 'reports',
    section: 'primary',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: '/dashboard/tasks',
    iconKey: 'tasks',
    badgeCount: 7,
    section: 'primary',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/dashboard/settings',
    iconKey: 'settings',
    section: 'secondary',
  },
  {
    id: 'administration',
    label: 'Administration',
    path: '/dashboard/administration',
    iconKey: 'administration',
    section: 'secondary',
  },
  {
    id: 'help',
    label: 'Help',
    path: '/dashboard/help',
    iconKey: 'help',
    section: 'secondary',
  },
];
