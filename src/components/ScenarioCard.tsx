/**
 * ScenarioCard Component
 *
 * A compact card displaying a scenario's key inputs and results.
 * Supports editing, duplication, and deletion.
 */

import { useState, memo } from 'react';
import type { Scenario } from '../lib/scenarios';
import type { UserInputs } from '../lib/types';
import { PROVINCES } from '../lib/tax/provinces';
import { formatCurrency } from '../lib/formatters';

interface ScenarioCardProps {
  scenario: Scenario;
  isWinner?: 'tax' | 'balance' | 'overall' | null;
  isSelected?: boolean;
  isCalculating?: boolean;
  onSelect?: () => void;
  onUpdate: (updates: Partial<UserInputs>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCalculate: () => void;
  onRename: (name: string) => void;
}

const WinnerBadge = memo(function WinnerBadge({ type }: { type: 'tax' | 'balance' | 'overall' }) {
  const badges = {
    tax: { label: 'Lowest Tax', icon: '💰', color: '#6ee7b7' },
    balance: { label: 'Highest Balance', icon: '📈', color: '#10b981' },
    overall: { label: 'Best Overall', icon: '🏆', color: '#d4a017' },
  };
  const badge = badges[type];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold animate-scale-in"
      style={{ background: `${badge.color}20`, color: badge.color }}
    >
      <span>{badge.icon}</span>
      {badge.label}
    </span>
  );
});

export const ScenarioCard = memo(function ScenarioCard({
  scenario,
  isWinner,
  isSelected,
  isCalculating,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onCalculate,
  onRename,
}: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scenario.name);

  const handleNameSubmit = () => {
    if (editName.trim() && editName !== scenario.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const results = scenario.results;
  const hasResults = results !== null;

  // Calculate totals from results
  const totalTax = hasResults
    ? results.yearlyResults.reduce((sum, y) => sum + y.totalTax, 0)
    : 0;
  const totalIncome = hasResults
    ? results.yearlyResults.reduce((sum, y) => sum + y.afterTaxIncome, 0)
    : 0;
  const finalBalance = hasResults
    ? results.yearlyResults[results.yearlyResults.length - 1]?.notionalAccounts.corporateInvestments ?? 0
    : 0;

  return (
    <div
      className={`relative rounded-xl transition-all duration-200 cursor-pointer ${
        isSelected ? 'shadow-lg' : 'hover:shadow-lg'
      }`}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${isSelected ? scenario.color + '40' : 'var(--border-subtle)'}`,
        boxShadow: isSelected ? `0 0 24px ${scenario.color}12, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
      onClick={onSelect}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ background: scenario.color }}
      />

      {/* Header */}
      <div className="p-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSubmit();
                  if (e.key === 'Escape') {
                    setEditName(scenario.name);
                    setIsEditing(false);
                  }
                }}
                className="w-full px-2 py-1 text-sm font-semibold rounded"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className="font-semibold text-sm truncate cursor-text"
                style={{ color: 'var(--text-primary)' }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="Double-click to rename"
              >
                {scenario.name}
              </h3>
            )}
            {isWinner && (
              <div className="mt-1">
                <WinnerBadge type={isWinner} />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onDuplicate}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/10"
              title="Duplicate scenario"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
              title="Delete scenario"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Settings */}
        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          {/* Province & Strategy Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Province
              </label>
              <select
                value={scenario.inputs.province}
                onChange={(e) => onUpdate({ province: e.target.value as UserInputs['province'] })}
                className="w-full mt-0.5 text-xs py-1.5 px-2 rounded-lg"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                {Object.values(PROVINCES).map((p) => (
                  <option key={p.code} value={p.code}>{p.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Strategy
              </label>
              <select
                value={scenario.inputs.salaryStrategy}
                onChange={(e) => onUpdate({ salaryStrategy: e.target.value as UserInputs['salaryStrategy'] })}
                className="w-full mt-0.5 text-xs py-1.5 px-2 rounded-lg"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="dynamic">Dynamic</option>
                <option value="fixed">Fixed Salary</option>
                <option value="dividends-only">Dividends Only</option>
              </select>
            </div>
          </div>

          {/* Income & Balance Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Required Income
              </label>
              <div className="relative mt-0.5">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input
                  type="number"
                  value={scenario.inputs.requiredIncome}
                  onChange={(e) => onUpdate({ requiredIncome: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs py-1.5 pl-5 pr-2 rounded-lg"
                  style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  step="5000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Corp Balance
              </label>
              <div className="relative mt-0.5">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input
                  type="number"
                  value={scenario.inputs.corporateInvestmentBalance}
                  onChange={(e) => onUpdate({ corporateInvestmentBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs py-1.5 pl-5 pr-2 rounded-lg"
                  style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  step="10000"
                />
              </div>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={scenario.inputs.maximizeTFSA}
                onChange={(e) => onUpdate({ maximizeTFSA: e.target.checked })}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>TFSA</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={scenario.inputs.contributeToRRSP}
                onChange={(e) => onUpdate({ contributeToRRSP: e.target.checked })}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>RRSP</span>
            </label>
          </div>
        </div>

        {/* Results Preview */}
        {hasResults ? (
          <div
            className="mt-3 pt-3 grid grid-cols-3 gap-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="text-center">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Tax</div>
              <div className="text-sm font-bold" style={{ color: '#f87171' }}>
                {formatCurrency(totalTax)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Net Income</div>
              <div className="text-sm font-bold" style={{ color: '#6ee7b7' }}>
                {formatCurrency(totalIncome)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Final Balance</div>
              <div className="text-sm font-bold" style={{ color: '#10b981' }}>
                {formatCurrency(finalBalance)}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCalculate();
              }}
              disabled={isCalculating}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: scenario.color,
                color: 'white',
                opacity: isCalculating ? 0.7 : 1,
              }}
            >
              {isCalculating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating...
                </span>
              ) : (
                'Calculate'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ScenarioCard;
