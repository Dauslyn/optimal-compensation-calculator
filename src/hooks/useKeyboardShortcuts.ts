/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard navigation for power users.
 *
 * Shortcuts:
 * - Ctrl/Cmd + Enter: Calculate
 * - Ctrl/Cmd + R: Reset to defaults (when not in input)
 * - Ctrl/Cmd + P: Print/Export PDF
 * - Ctrl/Cmd + L: Copy share link
 * - Ctrl/Cmd + D: Toggle dark/light mode
 * - Escape: Close modals
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onCalculate?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onToggleTheme?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onCalculate,
  onReset,
  onExport,
  onShare,
  onToggleTheme,
  onEscape,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Don't trigger shortcuts when typing in inputs (except for Escape)
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Escape works everywhere
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Other shortcuts only work when not typing
      if (isTyping) return;

      if (modifierKey) {
        switch (event.key.toLowerCase()) {
          case 'enter':
            event.preventDefault();
            onCalculate?.();
            break;

          case 'r':
            // Don't override browser refresh if shift is held
            if (!event.shiftKey) {
              event.preventDefault();
              onReset?.();
            }
            break;

          case 'p':
            event.preventDefault();
            onExport?.();
            break;

          case 'l':
            event.preventDefault();
            onShare?.();
            break;

          case 'd':
            event.preventDefault();
            onToggleTheme?.();
            break;
        }
      }
    },
    [enabled, onCalculate, onReset, onExport, onShare, onToggleTheme, onEscape]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get keyboard shortcuts data for display
 */
export function getKeyboardShortcuts() {
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const modifier = isMac ? '⌘' : 'Ctrl';

  return [
    { keys: `${modifier} + Enter`, description: 'Calculate' },
    { keys: `${modifier} + R`, description: 'Reset to defaults' },
    { keys: `${modifier} + P`, description: 'Export PDF' },
    { keys: `${modifier} + L`, description: 'Copy share link' },
    { keys: `${modifier} + D`, description: 'Toggle theme' },
    { keys: 'Esc', description: 'Close modal' },
  ];
}
