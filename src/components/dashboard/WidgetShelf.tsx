/**
 * WidgetShelf (v2.3.0)
 *
 * Horizontal scrollable row of draggable widget thumbnail cards.
 * Users drag widgets from this shelf into the dashboard grid.
 * Uses @dnd-kit's useDraggable for each shelf item.
 */

import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { WidgetDefinition } from './widgetRegistry';

interface WidgetShelfProps {
  widgets: WidgetDefinition[];
}

interface ShelfItemProps {
  widget: WidgetDefinition;
}

function ShelfItem({ widget }: ShelfItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shelf-${widget.id}`,
    data: { type: 'shelf-item', widgetType: widget.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const categoryColor = {
    chart: '#3b82f6',
    table: '#10b981',
    stat: '#f59e0b',
  }[widget.category];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex-shrink-0 w-[140px] p-3 rounded-xl transition-all hover:scale-105 select-none"
      data-testid={`shelf-item-${widget.id}`}
      role="option"
      aria-label={`Add ${widget.label} widget`}
    >
      <div
        className="rounded-lg p-3 text-center"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="text-2xl mb-1">{widget.icon}</div>
        <div
          className="text-xs font-medium leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {widget.label}
        </div>
        <div
          className="mt-1.5 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full inline-block"
          style={{
            background: `${categoryColor}20`,
            color: categoryColor,
          }}
        >
          {widget.category}
        </div>
      </div>
    </div>
  );
}

export const WidgetShelf = memo(function WidgetShelf({ widgets }: WidgetShelfProps) {
  return (
    <div className="sticky top-0 z-10 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Widget Shelf
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Drag widgets below to build your view
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        role="listbox"
        aria-label="Available widgets"
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        {widgets.map(widget => (
          <ShelfItem key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  );
});
