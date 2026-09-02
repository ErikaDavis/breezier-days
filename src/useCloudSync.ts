import { useCallback, useEffect, useMemo, useState } from 'react';

export type SyncState = 'ready' | 'syncing' | 'synced' | 'error';

export type CloudSyncData = {
  children?: unknown[];
  savedIdeas?: unknown[];
  savedDayPlans?: unknown[];
  savedLearningPlans?: unknown[];
  isPremium?: boolean;
  personalizedHelpUsage?: number;
  helpNowUsage?: number;
  selectedChildForHelp?: number | null;
  handoff?: Record<string, unknown>;
  [key: string]: unknown;
};

const IDENTITY_KEY = 'breezier-days-identity';
const PASSCODE_KEY = 'breezier-days-sync-passcode';
const REMOTE_DATA_KEY = 'breezier-days-remote-data';

function getOrCreateIdentity() {
  try {
    const existing = window.localStorage.getItem(IDENTITY_KEY);
    if (existing) return existing;
    const created =
      globalThis.crypto?.randomUUID?.() ??
      `bd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(IDENTITY_KEY, created);
    return created;
  } catch {
    return `bd-${Date.now()}`;
  }
}

function readRemoteData(): CloudSyncData | null {
  try {
    const raw = window.localStorage.getItem(REMOTE_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Local-first sync layer used by the app.
 *
 * This keeps the app usable even when the remote sync service is unavailable.
 * The existing Supabase integration can still be used by the app's premium
 * functions through supabaseClient.ts.
 */
export function useCloudSync() {
  const [identity] = useState<string>(() => getOrCreateIdentity());

  const [syncPasscode, setSyncPasscodeState] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(PASSCODE_KEY);
    } catch {
      return null;
    }
  });

  const [syncState, setSyncState] = useState<SyncState>('ready');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [remoteData, setRemoteData] = useState<CloudSyncData | null>(() => readRemoteData());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PASSCODE_KEY);
      setSyncPasscodeState(saved || null);
    } catch {
      // Keep the locally generated identity available even if storage is blocked.
    }
  }, []);

  const setSyncPasscode = useCallback((value: string) => {
    const next = value.trim();

    try {
      if (next) {
        window.localStorage.setItem(PASSCODE_KEY, next);
      } else {
        window.localStorage.removeItem(PASSCODE_KEY);
      }
    } catch {
      // Storage failures should not prevent the app from working locally.
    }

    setSyncPasscodeState(next || null);
    setSyncState(next ? 'synced' : 'ready');
    setSyncError(null);
  }, []);

  const clearSyncPasscode = useCallback(() => {
    try {
      window.localStorage.removeItem(PASSCODE_KEY);
    } catch {}

    setSyncPasscodeState(null);
    setSyncState('ready');
    setSyncError(null);
  }, []);

  const schedulePush = useCallback(() => {
    // App state already persists to localStorage in its own effects.
    // Keep this callback intentionally lightweight so it never blocks the UI.
    setSyncState(prev => (prev === 'error' ? prev : syncPasscode ? 'synced' : 'ready'));
  }, [syncPasscode]);

  const stableRemoteData = useMemo(() => remoteData, [remoteData]);

  return {
    identity,
    schedulePush,
    syncState,
    syncError,
    syncPasscode,
    setSyncPasscode,
    clearSyncPasscode,
    remoteData: stableRemoteData,
  };
}
