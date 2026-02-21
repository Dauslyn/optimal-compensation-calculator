/**
 * DashboardTab (v2.3.0)
 *
 * Main tab component for the custom dashboard feature.
 * Manages:
 * - DndContext wrapping shelf + grid
 * - Widget grid state (add, remove, reorder, change strategy)
 * - Persistence to localStorage
 * - Empty state UI
 */

import { memo, useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { ComparisonResult } from '../../lib/strategyComparison';
import type { UserInputs } from '../../lib/types';
import { WidgetShelf } from '../dashboard/WidgetShelf';
import { WidgetCard } from '../dashboard/WidgetCard';
import {
  getAvailableWidgets,
  createWidgetInstance,
  WIDGET_REGISTRY,
  type DashboardWidget,
} from '../dashboard/widgetRegistry';
import {
  saveDashboardLayout,
  loadDashboardLayout,
  clearDashboardLayout,
} from '../dashboard/dashboardStorage';

interface DashboardTabProps {
  comparison: ComparisonResult;
  inputs: UserInputs;
}

export const DashboardTab = memo(function DashboardTab({
  comparison,
  inputs,
}: DashboardTabProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = loadDashboardLayout();
    return saved?.widgets ?? [];
  });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const { setNodeRef: setDropzoneRef } = useDroppable({ id: 'dashboard-dropzone' });

  const ippEnabled = inputs.considerIPP || inputs.spouseConsiderIPP;
  const availableWidgets = getAvailableWidgets({ ippEnabled });

  // Persist layout on every change
  useEffect(() => {
    saveDashboardLayout({ widgets });
  }, [widgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    // Case 1: Dragging from shelf to grid (or onto the droppable area)
    const activeData = active.data.current;
    if (activeData?.type === 'shelf-item') {
      const widgetType = activeData.widgetType as string;
      const defaultStrategy = comparison.winner.bestOverall;
      const newWidget = createWidgetInstance(widgetType, defaultStrategy);

      setWidgets(prev => {
        // If dropped on an existing widget, insert before it
        const overIndex = prev.findIndex(w => w.instanceId === String(over.id));
        if (overIndex >= 0) {
          const updated = [...prev];
          updated.splice(overIndex, 0, newWidget);
          return updated;
        }
        // Otherwise append
        return [...prev, newWidget];
      });
      return;
    }

    // Case 2: Reordering within grid
    if (active.id !== over.id) {
      setWidgets(prev => {
        const oldIndex = prev.findIndex(w => w.instanceId === String(active.id));
        const newIndex = prev.findIndex(w => w.instanceId === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, [comparison.winner.bestOverall]);

  const handleRemove = useCallback((instanceId: string) => {
    setWidgets(prev => prev.filter(w => w.instanceId !== instanceId));
  }, []);

  const handleStrategyChange = useCallback((instanceId: string, strategyId: string) => {
    setWidgets(prev =>
      prev.map(w => w.instanceId === instanceId ? { ...w, strategyId } : w)
    );
  }, []);

  const handleReset = useCallback(() => {
    clearDashboardLayout();
    setWidgets([]);
  }, []);

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Widget Shelf */}
        <WidgetShelf widgets={availableWidgets} />

        {/* Reset button (only show when widgets exist) */}
        {widgets.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/20"
              style={{
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Reset Dashboard
            </button>
          </div>
        )}

        {/* Drop Zone / Grid */}
        {widgets.length === 0 ? (
          /* Empty state — useDroppable provides a valid drop target for dnd-kit */
          <div
            ref={setDropzoneRef}
            className="border-2 border-dashed rounded-xl p-12 text-center"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="text-4xl mb-4">📊</div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Drag widgets here to build your comparison view
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tip: Place the same widget twice with different strategies to compare side by side
            </p>
          </div>
        ) : (
          <SortableContext
            items={widgets.map(w => w.instanceId)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgets.map(widget => (
                <WidgetCard
                  key={widget.instanceId}
                  instanceId={widget.instanceId}
                  widgetType={widget.widgetType}
                  strategyId={widget.strategyId}
                  comparison={comparison}
                  inputs={inputs}
                  onRemove={handleRemove}
                  onStrategyChange={handleStrategyChange}
                />
              ))}
            </div>
          </SortableContext>
        )}

        {/* Drag overlay (ghost while dragging from shelf) */}
        <DragOverlay>
          {activeDragId && activeDragId.startsWith('shelf-') ? (
            <div className="opacity-80 bg-[var(--bg-elevated)] rounded-xl p-3 shadow-xl border border-[var(--accent-primary)]">
              <div className="text-2xl text-center">
                {WIDGET_REGISTRY[activeDragId.replace('shelf-', '')]?.icon ?? '📊'}
              </div>
              <div className="text-xs text-center mt-1" style={{ color: 'var(--text-primary)' }}>
                {WIDGET_REGISTRY[activeDragId.replace('shelf-', '')]?.label ?? 'Widget'}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
});
