import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type AppRoutePath =
  | '/'
  | '/discover'
  | '/demo-access'
  | '/dashboard'
  | '/dashboard/influencers'
  | '/dashboard/campaigns'
  | '/dashboard/content'
  | '/dashboard/incentives'
  | '/dashboard/messages'
  | '/dashboard/reports'
  | '/dashboard/tasks'
  | '/dashboard/settings'
  | '/dashboard/administration'
  | '/dashboard/help';

interface RouterContextValue {
  currentPath: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue>({
  currentPath: '/',
  navigate: () => {},
});

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = normalizePath(to);
    if (normalizePath(window.location.pathname) !== target) {
      window.history.pushState({}, '', target);
    }
    setCurrentPath(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useAppRouter(): RouterContextValue {
  return useContext(RouterContext);
}
