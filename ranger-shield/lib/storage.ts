// ============================================================
// RANGER TRANCHES — LOCALSTORAGE PERSISTENCE
//
// All functions guard against SSR (typeof window === 'undefined').
// loadState() returns null on any error — never throws.
// ============================================================

import type { AppState } from './tranche/types';
import { LOCAL_STORAGE_KEY, STATE_SCHEMA_VERSION } from './constants';

/**
 * Persist the current AppState to localStorage.
 * Silent fail — localStorage may be unavailable in private browsing or SSR.
 */
export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[ranger-tranches] Failed to save state:', e);
  }
}

/**
 * Load AppState from localStorage.
 * Returns null if:
 *   - Running in SSR (no window)
 *   - No stored state found
 *   - JSON parse fails
 *   - Schema version mismatch (stale state from an older build)
 */
export function loadState(): AppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.schemaVersion !== STATE_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Remove persisted state from localStorage.
 * Used for demo reset.
 */
export function clearState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}
