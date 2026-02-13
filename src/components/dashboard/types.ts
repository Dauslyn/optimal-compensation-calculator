/**
 * Dashboard Types (v2.3.0)
 */

export interface DashboardWidget {
  instanceId: string;
  widgetType: string;
  strategyId: string;
}

export interface WidgetDefinition {
  id: string;
  label: string;
  icon: string;
  category: 'chart' | 'table' | 'stat';
  conditional?: boolean;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}
