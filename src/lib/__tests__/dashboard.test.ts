/**
 * Tests for v2.3.0 "Custom Dashboard":
 * - Widget registry has all expected widgets
 * - Each widget has required fields (id, label, icon, category)
 * - Dashboard layout persistence to/from localStorage
 * - Widget instance creation and removal
 * - Strategy ID validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WIDGET_REGISTRY,
  createWidgetInstance,
  getAvailableWidgets,
} from '../../components/dashboard/widgetRegistry';
import {
  saveDashboardLayout,
  loadDashboardLayout,
  clearDashboardLayout,
  DASHBOARD_STORAGE_KEY,
} from '../../components/dashboard/dashboardStorage';
import { getDefaultInputs } from '../localStorage';
import { runStrategyComparison } from '../strategyComparison';

describe('Widget Registry', () => {
  it('contains at least 12 widget definitions', () => {
    expect(Object.keys(WIDGET_REGISTRY).length).toBeGreaterThanOrEqual(12);
  });

  it('every widget has required fields', () => {
    for (const [id, widget] of Object.entries(WIDGET_REGISTRY)) {
      expect(widget.id).toBe(id);
      expect(widget.label).toBeTruthy();
      expect(widget.icon).toBeTruthy();
      expect(['chart', 'table', 'stat']).toContain(widget.category);
    }
  });

  it('contains all expected chart widgets', () => {
    const expectedCharts = [
      'total-tax-comparison',
      'corporate-balance-over-time',
      'cumulative-tax-paid',
      'tax-breakdown',
      'compensation-mix',
      'rrsp-room',
      'effective-tax-rate',
      'compensation-by-year',
    ];
    for (const chartId of expectedCharts) {
      expect(WIDGET_REGISTRY[chartId]).toBeDefined();
      expect(WIDGET_REGISTRY[chartId].category).toBe('chart');
    }
  });

  it('contains all expected table widgets', () => {
    const expectedTables = [
      'after-tax-wealth',
      'action-plan',
      'yearly-projection',
    ];
    for (const tableId of expectedTables) {
      expect(WIDGET_REGISTRY[tableId]).toBeDefined();
      expect(WIDGET_REGISTRY[tableId].category).toBe('table');
    }
  });

  it('contains key metrics stat widget', () => {
    expect(WIDGET_REGISTRY['key-metrics']).toBeDefined();
    expect(WIDGET_REGISTRY['key-metrics'].category).toBe('stat');
  });

  it('ipp-contributions widget exists and is marked conditional', () => {
    expect(WIDGET_REGISTRY['ipp-contributions']).toBeDefined();
    expect(WIDGET_REGISTRY['ipp-contributions'].conditional).toBe(true);
  });
});

// Provide a minimal localStorage mock for the Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('Dashboard Layout Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a layout', () => {
    const widgets = [
      createWidgetInstance('total-tax-comparison', 'dynamic'),
      createWidgetInstance('action-plan', 'salary-at-ympe'),
    ];
    saveDashboardLayout({ widgets });

    const loaded = loadDashboardLayout();
    expect(loaded).not.toBeNull();
    expect(loaded!.widgets).toHaveLength(2);
    expect(loaded!.widgets[0].widgetType).toBe('total-tax-comparison');
    expect(loaded!.widgets[1].strategyId).toBe('salary-at-ympe');
  });

  it('returns null when no layout saved', () => {
    const loaded = loadDashboardLayout();
    expect(loaded).toBeNull();
  });

  it('clearDashboardLayout removes saved data', () => {
    saveDashboardLayout({ widgets: [createWidgetInstance('tax-breakdown', 'dynamic')] });
    expect(loadDashboardLayout()).not.toBeNull();
    clearDashboardLayout();
    expect(loadDashboardLayout()).toBeNull();
  });

  it('returns null for corrupted data', () => {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, 'not-json');
    expect(loadDashboardLayout()).toBeNull();
  });

  it('returns null for data missing widgets array', () => {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(loadDashboardLayout()).toBeNull();
  });
});

describe('Widget Renderer data extraction', () => {
  it('getStrategyData returns correct strategy from comparison', { timeout: 15000 }, async () => {
    const { getStrategyData } = await import('../../components/dashboard/WidgetRenderer');
    const mockComparison = {
      strategies: [
        { id: 'salary-at-ympe', summary: { totalTax: 100 } },
        { id: 'dividends-only', summary: { totalTax: 200 } },
        { id: 'dynamic', summary: { totalTax: 150 } },
      ],
      yearlyData: [
        { strategyId: 'salary-at-ympe', years: [] },
        { strategyId: 'dividends-only', years: [] },
        { strategyId: 'dynamic', years: [] },
      ],
      winner: { lowestTax: 'salary-at-ympe', highestBalance: 'dynamic', bestOverall: 'dynamic' },
    };

    const result = getStrategyData(mockComparison as any, 'dividends-only');
    expect(result.strategy.id).toBe('dividends-only');
    expect(result.strategy.summary.totalTax).toBe(200);
  });

  it('getStrategyData falls back to first strategy for unknown ID', { timeout: 15000 }, async () => {
    const { getStrategyData } = await import('../../components/dashboard/WidgetRenderer');
    const mockComparison = {
      strategies: [
        { id: 'salary-at-ympe', summary: { totalTax: 100 } },
      ],
      yearlyData: [
        { strategyId: 'salary-at-ympe', years: [] },
      ],
      winner: { lowestTax: 'salary-at-ympe', highestBalance: 'salary-at-ympe', bestOverall: 'salary-at-ympe' },
    };

    const result = getStrategyData(mockComparison as any, 'nonexistent');
    expect(result.strategy.id).toBe('salary-at-ympe');
  });
});

describe('Dashboard Integration', () => {
  const inputs = {
    ...getDefaultInputs(),
    province: 'ON' as const,
    requiredIncome: 100000,
    annualCorporateRetainedEarnings: 400000,
    corporateInvestmentBalance: 500000,
    planningHorizon: 5 as const,
    salaryStrategy: 'dynamic' as const,
  };
  const comparison = runStrategyComparison(inputs);

  it('all comparison strategies are selectable', () => {
    expect(comparison.strategies).toHaveLength(3);
    const ids = comparison.strategies.map(s => s.id);
    expect(ids).toContain('salary-at-ympe');
    expect(ids).toContain('dividends-only');
    expect(ids).toContain('dynamic');
  });

  it('available widgets count matches registry when IPP disabled', () => {
    const widgets = getAvailableWidgets({ ippEnabled: false });
    // Should have all widgets minus the conditional IPP one
    expect(widgets.length).toBe(15);
  });

  it('available widgets count includes IPP when enabled', () => {
    const widgets = getAvailableWidgets({ ippEnabled: true });
    expect(widgets.length).toBe(16);
  });

  it('createWidgetInstance generates unique IDs', () => {
    const w1 = createWidgetInstance('tax-breakdown', 'dynamic');
    const w2 = createWidgetInstance('tax-breakdown', 'dynamic');
    expect(w1.instanceId).not.toBe(w2.instanceId);
    expect(w1.widgetType).toBe('tax-breakdown');
    expect(w1.strategyId).toBe('dynamic');
  });

  it('getStrategyData extracts correct strategy for each ID', async () => {
    const { getStrategyData } = await import('../../components/dashboard/WidgetRenderer');
    for (const strategy of comparison.strategies) {
      const result = getStrategyData(comparison, strategy.id);
      expect(result.strategy.id).toBe(strategy.id);
    }
  });

  it('layout round-trips through persistence', () => {
    localStorage.clear();
    const widget1 = createWidgetInstance('total-tax-comparison', 'dynamic');
    const widget2 = createWidgetInstance('action-plan', 'salary-at-ympe');
    const widget3 = createWidgetInstance('key-metrics', 'dividends-only');

    saveDashboardLayout({ widgets: [widget1, widget2, widget3] });
    const loaded = loadDashboardLayout();
    expect(loaded!.widgets).toHaveLength(3);
    expect(loaded!.widgets[0].widgetType).toBe('total-tax-comparison');
    expect(loaded!.widgets[0].strategyId).toBe('dynamic');
    expect(loaded!.widgets[2].strategyId).toBe('dividends-only');
  });
});
