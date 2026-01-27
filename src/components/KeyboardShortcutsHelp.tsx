/**
 * Keyboard Shortcuts Help Panel
 *
 * Displays available keyboard shortcuts for power users.
 */

import { getKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function KeyboardShortcutsHelp() {
  const shortcuts = getKeyboardShortcuts();

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <h4
        className="text-sm font-semibold mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        Keyboard Shortcuts
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {shortcuts.map(({ keys, description }) => (
          <div key={keys} className="flex items-center gap-2">
            <kbd
              className="px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              {keys}
            </kbd>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
