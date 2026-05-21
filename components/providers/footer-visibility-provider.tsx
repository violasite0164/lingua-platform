'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'lingua-footer-visible';

type FooterVisibilityContextValue = {
  footerVisible: boolean;
  setFooterVisible: (visible: boolean) => void;
  toggleFooter: () => void;
};

const FooterVisibilityContext = createContext<FooterVisibilityContextValue | null>(null);

export function FooterVisibilityProvider({ children }: { children: ReactNode }) {
  const [footerVisible, setFooterVisibleState] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'true') setFooterVisibleState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setFooterVisible = useCallback((visible: boolean) => {
    setFooterVisibleState(visible);
    try {
      localStorage.setItem(STORAGE_KEY, visible ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFooter = useCallback(() => {
    setFooterVisibleState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ footerVisible, setFooterVisible, toggleFooter }),
    [footerVisible, setFooterVisible, toggleFooter],
  );

  return (
    <FooterVisibilityContext.Provider value={value}>{children}</FooterVisibilityContext.Provider>
  );
}

export function useFooterVisibility() {
  const ctx = useContext(FooterVisibilityContext);
  if (!ctx) {
    throw new Error('useFooterVisibility must be used within FooterVisibilityProvider');
  }
  return ctx;
}
