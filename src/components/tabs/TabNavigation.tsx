import { memo } from 'react';

export type TabId = 'recommended' | 'compare' | 'details' | 'dashboard' | 'export';

interface Tab {
  id: TabId;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  disabled?: boolean;
}

const TABS: Tab[] = [
  { id: 'recommended', label: 'Recommended', icon: '✓' },
  { id: 'compare', label: 'Compare All' },
  { id: 'details', label: 'Details' },
  { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
  { id: 'export', label: 'Export' },
];

export const TabNavigation = memo(function TabNavigation({
  activeTab,
  onTabChange,
  disabled = false,
}: TabNavigationProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (e.key === 'ArrowRight' && currentIndex < TABS.length - 1) {
      e.preventDefault();
      onTabChange(TABS[currentIndex + 1].id);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      onTabChange(TABS[currentIndex - 1].id);
    }
  };

  return (
    <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:flex gap-1" role="tablist" onKeyDown={handleKeyDown}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => !disabled && onTabChange(tab.id)}
            disabled={disabled}
            className={`
              px-4 py-3 text-sm font-medium transition-colors
              border-b-2 -mb-px
              ${activeTab === tab.id
                ? 'border-current'
                : 'border-transparent hover:border-gray-300'
              }
            `}
            style={{
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile: Dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => !disabled && onTabChange(e.target.value as TabId)}
          disabled={disabled}
          className="w-full px-4 py-3 text-sm font-medium"
          style={{
            background: 'var(--bg-base)',
            color: 'var(--text-primary)',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {TABS.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.icon ? `${tab.icon} ${tab.label}` : tab.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});
