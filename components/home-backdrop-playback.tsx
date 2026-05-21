'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type HomeBackdropPlaybackContextValue = {
  /** true = 隱藏自訂背景圖／影片與遮罩，只顯示主題底色（首頁測驗進行中） */
  backdropMediaHidden: boolean;
  setBackdropMediaHidden: (hidden: boolean) => void;
};

const HomeBackdropPlaybackContext = createContext<HomeBackdropPlaybackContextValue | null>(
  null,
);

export function HomeBackdropPlaybackProvider({ children }: { children: ReactNode }) {
  const [backdropMediaHidden, setBackdropMediaHidden] = useState(false);
  const value = useMemo(
    () => ({ backdropMediaHidden, setBackdropMediaHidden }),
    [backdropMediaHidden],
  );

  return (
    <HomeBackdropPlaybackContext.Provider value={value}>{children}</HomeBackdropPlaybackContext.Provider>
  );
}

/** 首頁外使用時為 no-op，避免誤用報錯 */
export function useHomeBackdropPlayback(): HomeBackdropPlaybackContextValue {
  const ctx = useContext(HomeBackdropPlaybackContext);
  if (!ctx) {
    return {
      backdropMediaHidden: false,
      setBackdropMediaHidden: () => {},
    };
  }
  return ctx;
}
