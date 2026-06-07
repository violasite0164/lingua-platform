'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { StaminaShopPopup } from '@/components/billing/stamina-shop-popup';
import { getGameStaminaStateClient, spendGameStaminaClient } from '@/lib/game/stamina-client';
import type { GameStaminaState } from '@/lib/game/stamina';

export type OpenStaminaShopOptions = {
  hintMessage?: string;
  requiredAmount?: number;
};

type GameStaminaContextValue = {
  stamina: GameStaminaState | null;
  loading: boolean;
  refreshStamina: () => Promise<GameStaminaState | null>;
  spendStamina: (amount: number) => Promise<
    | { ok: true; state: GameStaminaState; spent: number }
    | { ok: false; message: string; state?: GameStaminaState | null }
  >;
  openStaminaShop: (opts?: OpenStaminaShopOptions) => void;
};

const GameStaminaContext = createContext<GameStaminaContextValue | null>(null);

export function GameStaminaProvider({ children }: { children: ReactNode }) {
  const [stamina, setStamina] = useState<GameStaminaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopOpts, setShopOpts] = useState<OpenStaminaShopOptions>({});
  const staminaRef = useRef<GameStaminaState | null>(null);
  staminaRef.current = stamina;

  const openStaminaShop = useCallback((opts?: OpenStaminaShopOptions) => {
    setShopOpts(opts ?? {});
    setShopOpen(true);
  }, []);

  const refreshStamina = useCallback(async () => {
    const res = await getGameStaminaStateClient();
    if (res.ok) {
      setStamina(res.state);
      return res.state;
    }
    setStamina(null);
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshStamina();
      if (!cancelled) setLoading(false);
    })();
    const id = window.setInterval(() => {
      void refreshStamina();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshStamina]);

  const spendStaminaFn = useCallback(async (amount: number) => {
    const res = await spendGameStaminaClient(amount);
    if (res.ok) {
      const state: GameStaminaState = {
        stamina: res.stamina,
        max: res.max,
        isAdmin: res.isAdmin,
        freePlay: res.freePlay,
        nextRegenAt: res.nextRegenAt,
      };
      setStamina(state);
      return { ok: true as const, state, spent: res.spent };
    }
    const state =
      typeof res.stamina === 'number'
        ? {
            stamina: res.stamina,
            max: res.max ?? 10,
            isAdmin: false,
            nextRegenAt: res.nextRegenAt ?? null,
          }
        : staminaRef.current;
    if (state) setStamina(state);
    return { ok: false as const, message: res.message, state };
  }, []);

  const value = useMemo(
    () => ({
      stamina,
      loading,
      refreshStamina,
      spendStamina: spendStaminaFn,
      openStaminaShop,
    }),
    [stamina, loading, refreshStamina, spendStaminaFn, openStaminaShop],
  );

  return (
    <GameStaminaContext.Provider value={value}>
      {children}
      <StaminaShopPopup
        open={shopOpen}
        onOpenChange={setShopOpen}
        stamina={stamina}
        requiredAmount={shopOpts.requiredAmount}
        hintMessage={shopOpts.hintMessage}
        onStaminaUpdated={(state) => setStamina(state)}
      />
    </GameStaminaContext.Provider>
  );
}

export function useGameStamina(): GameStaminaContextValue {
  const ctx = useContext(GameStaminaContext);
  if (!ctx) {
    throw new Error('useGameStamina must be used within GameStaminaProvider');
  }
  return ctx;
}

export function useOptionalGameStamina(): GameStaminaContextValue | null {
  return useContext(GameStaminaContext);
}
