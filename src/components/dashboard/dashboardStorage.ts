/**
 * Dashboard Layout Persistence (v2.3.0)
 */

import type { DashboardLayout } from './types';

export const DASHBOARD_STORAGE_KEY = 'ccpc-dashboard-v1';

const STORAGE_VERSION = 1;

interface StoredDashboard {
  version: number;
  layout: DashboardLayout;
  savedAt: string;
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  try {
    const data: StoredDashboard = {
      version: STORAGE_VERSION,
      layout,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);
  }
}

export function loadDashboardLayout(): DashboardLayout | null {
  try {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!stored) return null;
    const data: StoredDashboard = JSON.parse(stored);
    if (data.version !== STORAGE_VERSION) {
      console.warn(`Dashboard layout version mismatch: expected ${STORAGE_VERSION}, got ${data.version}`);
      return null;
    }
    if (!data.layout || !Array.isArray(data.layout.widgets)) {
      console.warn('Invalid dashboard layout structure');
      return null;
    }
    return data.layout;
  } catch (error) {
    console.error('Failed to load dashboard layout:', error);
    return null;
  }
}

export function clearDashboardLayout(): void {
  try {
    localStorage.removeItem(DASHBOARD_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear dashboard layout:', error);
  }
}
