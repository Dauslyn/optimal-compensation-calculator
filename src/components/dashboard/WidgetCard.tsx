/**
 * WidgetCard (v2.3.0)
 *
 * Wrapper for each widget placed on the dashboard grid.
 * Provides: drag handle, strategy selector, remove button.
 */

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import type { ComparisonResult } from '../../lib/strategyComparison';
import type { UserInputs } from '../../lib/types';
import { WIDGET_REGISTRY, STRATEGY_IDS } from './widgetRegistry';
import { WidgetRenderer } from './WidgetRenderer';

interface WidgetCardProps {
  instanceId: string;
  widgetType: string;
  strategyId: string;
  comparison: ComparisonResult;
  inputs: UserInputs;
  onRemove: (instanceId: string) => void;
  onStrategyChange: (instanceId: string, strategyId: string) => void;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#3b82f6',
  'dividends-only': '#10b981',
  'dynamic': '#f59e0b',
};

const STRATEGY_LABELS: Record<string, string> = {
  'salary-at-ympe': 'Salary at YMPE',
  'dividends-only': 'Dividends Only',
  'dynamic': 'Dynamic Optimizer',
};

export const WidgetCard = memo(function WidgetCard({
  instanceId, widgetType, strategyId, comparison, inputs, onRemove, onStrategyChange,
}: WidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  };

  const widget = WIDGET_REGISTRY[widgetType];
  if (!widget) return null;

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl overflow-hidden" data-testid={`widget-card-${instanceId}`}>
      <div className="rounded-xl" style={{
        background: 'rgba(0,0,0,0.3)',
        border: isDragging ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={() => onRemove(instanceId)} className="p-1 rounded-md hover:bg-red-500/20 transition-colors"
            title="Remove widget" aria-label={`Remove ${widget.label}`}>
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
          <div className="flex items-center gap-2 flex-1 justify-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {widget.icon} {widget.label}
            </span>
          </div>
          <div className="relative">
            <select value={strategyId} onChange={(e) => onStrategyChange(instanceId, e.target.value)}
              className="text-xs font-medium pl-5 pr-2 py-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `${STRATEGY_COLORS[strategyId]}20`,
                color: STRATEGY_COLORS[strategyId],
                border: `1px solid ${STRATEGY_COLORS[strategyId]}40`,
              }}
              aria-label={`Strategy for ${widget.label}`}>
              {STRATEGY_IDS.map(id => (
                <option key={id} value={id}>{STRATEGY_LABELS[id]}</option>
              ))}
            </select>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
              style={{ background: STRATEGY_COLORS[strategyId] }} />
          </div>
        </div>
        {/* Widget content */}
        <div className="p-4">
          <WidgetRenderer widgetType={widgetType} strategyId={strategyId} comparison={comparison} inputs={inputs} />
        </div>
      </div>
    </div>
  );
});
