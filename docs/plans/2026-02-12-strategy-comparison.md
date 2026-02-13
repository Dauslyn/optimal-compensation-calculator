# v2.1.0 Strategy Comparison — One-Click Analysis

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After a user calculates their results, one click auto-runs 3 preset strategies against their inputs and shows a professional side-by-side comparison with a clear winner — exportable to PDF and email.

**Architecture:** New `runStrategyComparison()` pure function takes one `UserInputs` and returns results for 3 strategies (All-Salary at YMPE, Dividends-Only, Dynamic Optimizer). A new `StrategyComparison` component renders inline below Summary results. ReportTemplate and EmailAccountantButton gain comparison sections. All logic is testable pure functions; UI is a thin display layer.

**Tech Stack:** React 19, TypeScript, Vitest (pure logic tests only), existing `calculateProjection()` engine, existing formatters, existing CSS variable theming system.

---

## Overview

### What Gets Built

1. **`src/lib/strategyComparison.ts`** — Pure function: takes `UserInputs`, returns 3 `ProjectionSummary` results + winner metadata
2. **`src/components/StrategyComparison.tsx`** — UI component: renders comparison table + winner callout inline in Calculator view
3. **`src/lib/__tests__/strategyComparison.test.ts`** — Tests for the pure comparison logic
4. **Modify `src/components/Summary.tsx`** — Add "Compare Strategies" button + render `StrategyComparison`
5. **Modify `src/components/ReportTemplate.tsx`** — Add comparison page to PDF
6. **Modify `src/components/EmailAccountantButton.tsx`** — Add comparison section to email body

### What Does NOT Get Built

- No changes to `calculator.ts` engine (it already works perfectly)
- No charts (v2.2.0 will add Recharts visualizations)
- No changes to Scenario Builder (stays as power-user tool)
- No new routes, tabs, or navigation changes

### Data Flow

```
User clicks "Compare Strategies"
  → Summary.tsx calls runStrategyComparison(currentInputs)
    → Internally calls calculateProjection() 3x with strategy variants
    → Returns { strategies: [...], winner, diffs }
  → StrategyComparison component renders results
  → ReportTemplate receives comparison data via prop
  → EmailAccountantButton receives comparison data via prop
```

---

## Task 1: Strategy Comparison Engine (`src/lib/strategyComparison.ts`)

**Files:**
- Create: `src/lib/strategyComparison.ts`
- Test: `src/lib/__tests__/strategyComparison.test.ts`

This is the core logic. Everything else is a display layer on top of this.

### Step 1: Write the test file with initial tests

Create `src/lib/__tests__/strategyComparison.test.ts`:

```typescript
/**
 * Tests for v2.1.0 "Strategy Comparison" engine:
 * - runStrategyComparison() returns exactly 3 strategies
 * - Each strategy has correct label and salaryStrategy
 * - All strategies share the same base inputs (province, income, etc.)
 * - Winner is determined by lowest total tax (primary) and highest balance (secondary)
 * - Diffs are computed correctly between winner and other strategies
 * - Dividends-only strategy has $0 salary
 * - Salary-at-YMPE strategy has salary near YMPE
 * - Dynamic strategy may differ from both
 * - Works with spouse enabled
 * - Works with IPP enabled
 */

import { describe, it, expect } from 'vitest';
import type { UserInputs } from '../types';
import { getDefaultInputs } from '../localStorage';
import {
  runStrategyComparison,
  type StrategyResult,
  type ComparisonResult,
} from '../strategyComparison';

const defaults = getDefaultInputs();

/** Helper: standard test inputs */
function makeInputs(overrides: Partial<UserInputs> = {}): UserInputs {
  return {
    ...defaults,
    province: 'ON',
    requiredIncome: 100000,
    annualCorporateRetainedEarnings: 400000,
    corporateInvestmentBalance: 500000,
    planningHorizon: 5,
    salaryStrategy: 'dynamic',
    ...overrides,
  };
}

describe('runStrategyComparison', () => {
  it('returns exactly 3 strategies', () => {
    const result = runStrategyComparison(makeInputs());
    expect(result.strategies).toHaveLength(3);
  });

  it('strategies have correct labels', () => {
    const result = runStrategyComparison(makeInputs());
    const labels = result.strategies.map(s => s.label);
    expect(labels).toContain('Salary at YMPE');
    expect(labels).toContain('Dividends Only');
    expect(labels).toContain('Dynamic Optimizer');
  });

  it('each strategy has a valid ProjectionSummary', () => {
    const result = runStrategyComparison(makeInputs());
    for (const strategy of result.strategies) {
      expect(strategy.summary.yearlyResults).toHaveLength(5);
      expect(strategy.summary.totalTax).toBeGreaterThan(0);
      expect(strategy.summary.totalCompensation).toBeGreaterThan(0);
    }
  });

  it('dividends-only strategy has zero salary', () => {
    const result = runStrategyComparison(makeInputs());
    const divOnly = result.strategies.find(s => s.id === 'dividends-only')!;
    expect(divOnly.summary.totalSalary).toBe(0);
  });

  it('salary-at-ympe strategy uses fixed salary', () => {
    const result = runStrategyComparison(makeInputs());
    const salaryStrat = result.strategies.find(s => s.id === 'salary-at-ympe')!;
    // Should have non-zero salary
    expect(salaryStrat.summary.totalSalary).toBeGreaterThan(0);
  });

  it('winner is the strategy with lowest total tax', () => {
    const result = runStrategyComparison(makeInputs());
    const taxes = result.strategies.map(s => s.summary.totalTax);
    const minTax = Math.min(...taxes);
    const winnerStrategy = result.strategies.find(s => s.id === result.winner.lowestTax)!;
    expect(winnerStrategy.summary.totalTax).toBe(minTax);
  });

  it('winner.highestBalance picks strategy with largest final balance', () => {
    const result = runStrategyComparison(makeInputs());
    const balances = result.strategies.map(s => s.summary.finalCorporateBalance);
    const maxBalance = Math.max(...balances);
    const balanceWinner = result.strategies.find(s => s.id === result.winner.highestBalance)!;
    expect(balanceWinner.summary.finalCorporateBalance).toBe(maxBalance);
  });

  it('diffs are computed relative to the best-overall strategy', () => {
    const result = runStrategyComparison(makeInputs());
    // The best-overall strategy should have diff of 0 for tax
    const best = result.strategies.find(s => s.id === result.winner.bestOverall)!;
    expect(best.diff.taxSavings).toBe(0);
  });

  it('all strategies share base inputs (province, income, horizon)', () => {
    const inputs = makeInputs({ province: 'BC' });
    const result = runStrategyComparison(inputs);
    // Each strategy's yearly results should have same length as horizon
    for (const strategy of result.strategies) {
      expect(strategy.summary.yearlyResults).toHaveLength(inputs.planningHorizon);
    }
  });

  it('works with spouse enabled', () => {
    const inputs = makeInputs({
      hasSpouse: true,
      spouseRequiredIncome: 60000,
      spouseSalaryStrategy: 'dynamic',
    });
    const result = runStrategyComparison(inputs);
    expect(result.strategies).toHaveLength(3);
    // Each strategy should have spouse results
    for (const strategy of result.strategies) {
      expect(strategy.summary.spouse).toBeDefined();
    }
  });

  it('works with IPP enabled', () => {
    const inputs = makeInputs({
      considerIPP: true,
      ippMemberAge: 50,
      ippYearsOfService: 10,
    });
    const result = runStrategyComparison(inputs);
    expect(result.strategies).toHaveLength(3);
    // Dynamic and salary strategies should have IPP
    const dynamic = result.strategies.find(s => s.id === 'dynamic')!;
    expect(dynamic.summary.ipp).toBeDefined();
    // Dividends-only with IPP → IPP = 0 (no salary = no pensionable earnings)
    const divOnly = result.strategies.find(s => s.id === 'dividends-only')!;
    expect(divOnly.summary.ipp?.totalContributions ?? 0).toBe(0);
  });

  it('strategies differ in tax outcomes', () => {
    const result = runStrategyComparison(makeInputs());
    const taxes = result.strategies.map(s => s.summary.totalTax);
    // At least two strategies should have different tax outcomes
    const uniqueTaxes = new Set(taxes.map(t => Math.round(t)));
    expect(uniqueTaxes.size).toBeGreaterThanOrEqual(2);
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run src/lib/__tests__/strategyComparison.test.ts`

Expected: FAIL — module `../strategyComparison` not found.

### Step 3: Implement `strategyComparison.ts`

Create `src/lib/strategyComparison.ts`:

```typescript
/**
 * Strategy Comparison Engine (v2.1.0)
 *
 * Takes a user's inputs and runs 3 preset strategies through calculateProjection(),
 * returning side-by-side results with winner determination and diff computation.
 *
 * Strategies:
 * 1. Salary at YMPE — Fixed salary at Year's Maximum Pensionable Earnings
 * 2. Dividends Only — Zero salary, all dividends
 * 3. Dynamic Optimizer — Engine picks optimal salary/dividend mix
 */

import type { UserInputs, ProjectionSummary } from './types';
import { calculateProjection } from './calculator';
import { getTaxYearData } from './tax/indexation';

export interface StrategyResult {
  id: string;
  label: string;
  description: string;
  summary: ProjectionSummary;
  diff: {
    taxSavings: number;         // vs best-overall (negative = pays more tax)
    balanceDifference: number;  // vs best-overall
    rrspRoomDifference: number; // vs best-overall
  };
}

export interface ComparisonResult {
  strategies: StrategyResult[];
  winner: {
    lowestTax: string;
    highestBalance: string;
    bestOverall: string;
  };
}

/**
 * Run the 3 preset strategies against the user's inputs.
 * The user's other settings (province, income needs, balances, spouse, IPP, etc.)
 * are preserved — only the salary strategy changes.
 */
export function runStrategyComparison(inputs: UserInputs): ComparisonResult {
  const ympe = getTaxYearData(inputs.startingYear).cpp.ympe;

  // Define the 3 strategy variants
  const strategyDefs: Array<{
    id: string;
    label: string;
    description: string;
    inputOverrides: Partial<UserInputs>;
  }> = [
    {
      id: 'salary-at-ympe',
      label: 'Salary at YMPE',
      description: `Fixed salary at $${ympe.toLocaleString()} (maximizes CPP, generates RRSP room)`,
      inputOverrides: {
        salaryStrategy: 'fixed',
        fixedSalaryAmount: ympe,
      },
    },
    {
      id: 'dividends-only',
      label: 'Dividends Only',
      description: 'Zero salary — all compensation via dividends (no CPP, no RRSP room)',
      inputOverrides: {
        salaryStrategy: 'dividends-only',
      },
    },
    {
      id: 'dynamic',
      label: 'Dynamic Optimizer',
      description: 'Engine selects optimal salary/dividend split each year',
      inputOverrides: {
        salaryStrategy: 'dynamic',
      },
    },
  ];

  // Run each strategy
  const strategies: Array<{ id: string; label: string; description: string; summary: ProjectionSummary }> =
    strategyDefs.map(def => ({
      id: def.id,
      label: def.label,
      description: def.description,
      summary: calculateProjection({ ...inputs, ...def.inputOverrides }),
    }));

  // Determine winners
  const lowestTaxStrategy = strategies.reduce((best, s) =>
    s.summary.totalTax < best.summary.totalTax ? s : best
  );
  const highestBalanceStrategy = strategies.reduce((best, s) =>
    s.summary.finalCorporateBalance > best.summary.finalCorporateBalance ? s : best
  );

  // Best overall: weighted score (60% tax savings, 40% balance)
  const maxTax = Math.max(...strategies.map(s => s.summary.totalTax));
  const maxBalance = Math.max(...strategies.map(s => s.summary.finalCorporateBalance));
  const bestOverallStrategy = strategies.reduce((best, s) => {
    const score =
      (maxTax > 0 ? (1 - s.summary.totalTax / maxTax) * 0.6 : 0) +
      (maxBalance > 0 ? (s.summary.finalCorporateBalance / maxBalance) * 0.4 : 0);
    const bestScore =
      (maxTax > 0 ? (1 - best.summary.totalTax / maxTax) * 0.6 : 0) +
      (maxBalance > 0 ? (best.summary.finalCorporateBalance / maxBalance) * 0.4 : 0);
    return score > bestScore ? s : best;
  });

  // Compute diffs relative to best-overall
  const results: StrategyResult[] = strategies.map(s => ({
    id: s.id,
    label: s.label,
    description: s.description,
    summary: s.summary,
    diff: {
      taxSavings: bestOverallStrategy.summary.totalTax - s.summary.totalTax,
      balanceDifference: s.summary.finalCorporateBalance - bestOverallStrategy.summary.finalCorporateBalance,
      rrspRoomDifference: s.summary.totalRRSPRoomGenerated - bestOverallStrategy.summary.totalRRSPRoomGenerated,
    },
  }));

  return {
    strategies: results,
    winner: {
      lowestTax: lowestTaxStrategy.id,
      highestBalance: highestBalanceStrategy.id,
      bestOverall: bestOverallStrategy.id,
    },
  };
}
```

### Step 4: Run tests to verify they pass

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run src/lib/__tests__/strategyComparison.test.ts`

Expected: All 11 tests PASS.

### Step 5: Commit

```bash
git add src/lib/strategyComparison.ts src/lib/__tests__/strategyComparison.test.ts
git commit -m "feat(v2.1.0): add strategy comparison engine with 3 preset strategies"
```

---

## Task 2: Strategy Comparison UI Component (`src/components/StrategyComparison.tsx`)

**Files:**
- Create: `src/components/StrategyComparison.tsx`

This is a display-only component. No state management — it receives `ComparisonResult` as a prop and renders a comparison table with winner badges.

### Step 1: Create the component

Create `src/components/StrategyComparison.tsx`:

```typescript
/**
 * StrategyComparison Component (v2.1.0)
 *
 * Renders a side-by-side comparison of 3 preset strategies after
 * runStrategyComparison() has been called. Shows:
 * - 3 strategy columns with key metrics
 * - Winner badge on the best-overall strategy
 * - Diff indicators showing how each strategy compares
 * - Trade-off insight footer
 */

import { memo } from 'react';
import type { ComparisonResult, StrategyResult } from '../lib/strategyComparison';
import { formatCurrency, formatPercent, formatDifference } from '../lib/formatters';

interface StrategyComparisonProps {
  comparison: ComparisonResult;
}

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#3b82f6',   // Blue
  'dividends-only': '#10b981',   // Emerald
  'dynamic': '#f59e0b',          // Amber
};

function StrategyCard({ strategy, isWinner, winnerId }: {
  strategy: StrategyResult;
  isWinner: boolean;
  winnerId: string;
}) {
  const color = STRATEGY_COLORS[strategy.id] || '#6b7280';
  const s = strategy.summary;

  return (
    <div
      className="relative rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: isWinner
          ? `2px solid ${color}`
          : '1px solid var(--border-subtle)',
        boxShadow: isWinner ? `0 0 20px ${color}33` : undefined,
      }}
    >
      {/* Winner badge */}
      {isWinner && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: color }}
        >
          RECOMMENDED
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-4 pt-1">
        <div
          className="inline-block w-3 h-3 rounded-full mr-2"
          style={{ background: color }}
        />
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {strategy.label}
        </span>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {strategy.description}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <MetricRow
          label="Total Tax"
          value={formatCurrency(s.totalTax)}
          diff={strategy.id !== winnerId ? strategy.diff.taxSavings : null}
          diffInvert={true}
          isBest={strategy.id !== winnerId ? false : undefined}
        />
        <MetricRow
          label="Effective Rate"
          value={formatPercent(s.effectiveTaxRate)}
        />
        <MetricRow
          label="Avg Annual Income"
          value={formatCurrency(s.averageAnnualIncome)}
        />
        <MetricRow
          label="Final Corp Balance"
          value={formatCurrency(s.finalCorporateBalance)}
          diff={strategy.id !== winnerId ? strategy.diff.balanceDifference : null}
        />
        <MetricRow
          label="RRSP Room Generated"
          value={formatCurrency(s.totalRRSPRoomGenerated)}
          diff={strategy.id !== winnerId ? strategy.diff.rrspRoomDifference : null}
        />
        <MetricRow
          label="Compensation Mix"
          value={s.totalCompensation > 0
            ? `${Math.round((s.totalSalary / s.totalCompensation) * 100)}% sal / ${Math.round((s.totalDividends / s.totalCompensation) * 100)}% div`
            : '0% / 100%'
          }
        />
      </div>
    </div>
  );
}

function MetricRow({ label, value, diff, diffInvert, isBest }: {
  label: string;
  value: string;
  diff?: number | null;
  diffInvert?: boolean;
  isBest?: boolean;
}) {
  const diffDisplay = diff != null && diff !== 0 ? formatDifference(diff, diffInvert) : null;

  return (
    <div
      className="flex items-center justify-between py-2 border-b"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
        {diffDisplay && (
          <div
            className="text-xs"
            style={{
              color: diffDisplay.color === 'positive' ? 'var(--accent-success, #10b981)'
                : diffDisplay.color === 'negative' ? 'var(--accent-danger, #ef4444)'
                : 'var(--text-muted)',
            }}
          >
            {diffDisplay.text}
          </div>
        )}
      </div>
    </div>
  );
}

export const StrategyComparison = memo(function StrategyComparison({
  comparison,
}: StrategyComparisonProps) {
  const { strategies, winner } = comparison;

  // Find winner and losers for insight
  const bestOverall = strategies.find(s => s.id === winner.bestOverall);
  const lowestTaxStrat = strategies.find(s => s.id === winner.lowestTax);
  const highestBalanceStrat = strategies.find(s => s.id === winner.highestBalance);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Strategy Comparison
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Same inputs, 3 compensation strategies — here's what changes
          </p>
        </div>
        {bestOverall && (
          <span
            className="px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{
              background: `${STRATEGY_COLORS[bestOverall.id]}20`,
              color: STRATEGY_COLORS[bestOverall.id],
            }}
          >
            Best: {bestOverall.label}
          </span>
        )}
      </div>

      {/* 3-Column Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map(strategy => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isWinner={strategy.id === winner.bestOverall}
            winnerId={winner.bestOverall}
          />
        ))}
      </div>

      {/* Trade-off Insight */}
      {lowestTaxStrat && highestBalanceStrat && lowestTaxStrat.id !== highestBalanceStrat.id && (
        <div
          className="p-4 rounded-lg text-sm"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="font-medium">Trade-off: </span>
          <span style={{ color: STRATEGY_COLORS[lowestTaxStrat.id] }}>
            {lowestTaxStrat.label}
          </span>
          {' '}pays the least tax ({formatCurrency(lowestTaxStrat.summary.totalTax)}), while{' '}
          <span style={{ color: STRATEGY_COLORS[highestBalanceStrat.id] }}>
            {highestBalanceStrat.label}
          </span>
          {' '}leaves the most in corporate investments ({formatCurrency(highestBalanceStrat.summary.finalCorporateBalance)}).
        </div>
      )}
    </div>
  );
});
```

### Step 2: Verify it compiles

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx tsc --noEmit 2>&1 | grep -i "StrategyComparison" | head -5`

Expected: No errors referencing this file (pre-existing errors in test files are OK).

### Step 3: Commit

```bash
git add src/components/StrategyComparison.tsx
git commit -m "feat(v2.1.0): add StrategyComparison display component with 3-column cards"
```

---

## Task 3: Wire Into Summary.tsx

**Files:**
- Modify: `src/components/Summary.tsx`

Add a "Compare Strategies" button that triggers the comparison and renders the `StrategyComparison` component inline.

### Step 1: Add imports and state

At the top of `Summary.tsx`, add imports:

```typescript
import { StrategyComparison } from './StrategyComparison';
import { runStrategyComparison, type ComparisonResult } from '../lib/strategyComparison';
```

Inside the `Summary` component function, add state:

```typescript
const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
const [isComparing, setIsComparing] = useState(false);

const handleCompare = async () => {
  setIsComparing(true);
  // Small delay for UI feedback
  await new Promise(resolve => setTimeout(resolve, 50));
  const result = runStrategyComparison(inputs);
  setComparisonResult(result);
  setIsComparing(false);
};
```

### Step 2: Add the "Compare Strategies" button + comparison section

Insert after the IPP Analysis section (before EmailCapture, around line 382). Find the `{/* Email Capture */}` comment and insert before it:

```tsx
{/* Strategy Comparison */}
<div className="pt-2">
  {!comparisonResult ? (
    <button
      onClick={handleCompare}
      disabled={isComparing}
      className="w-full py-4 rounded-xl text-sm font-semibold transition-all hover:shadow-lg"
      style={{
        background: 'var(--accent-gradient, linear-gradient(135deg, #3b82f6, #8b5cf6))',
        color: 'white',
        opacity: isComparing ? 0.7 : 1,
      }}
    >
      {isComparing ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Comparing strategies...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Compare All 3 Strategies
        </span>
      )}
    </button>
  ) : (
    <div className="animate-slide-up">
      <StrategyComparison comparison={comparisonResult} />
    </div>
  )}
</div>
```

### Step 3: Pass comparison to ReportTemplate

Find where `ReportTemplate` is rendered (hidden div for print). Add the `comparisonResult` prop:

```tsx
<ReportTemplate
  ref={componentRef}
  summary={summary}
  inputs={inputs}
  clientName={clientName}
  comparison={comparisonResult}
/>
```

### Step 4: Pass comparison to EmailAccountantButton in App.tsx

In `App.tsx`, the `EmailAccountantButton` is in the header. It needs access to comparison data. Two options:
- **Simple approach:** The email button already sits in App.tsx header. We can pass the comparison from Summary up via a callback. But that's over-engineered.
- **Better approach:** Move the "Email Accountant" affordance into Summary.tsx where comparison data lives. But that's a layout change.
- **Simplest approach:** Add a `comparison` prop to `EmailAccountantButton`. Summary.tsx already has a local `EmailAccountantButton` import path. Wait — actually EmailAccountantButton is in `App.tsx` header, not in Summary. The simplest approach: lift comparison state to App.tsx.

**Decision: Lift comparison state to App.tsx.**

In `App.tsx`, add state:

```typescript
const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
```

Pass it down to `Summary` as a prop + callback:

```tsx
<Summary
  summary={results}
  inputs={currentInputs}
  comparison={comparisonResult}
  onCompare={setComparisonResult}
/>
```

And pass to `EmailAccountantButton`:

```tsx
<EmailAccountantButton
  inputs={currentInputs}
  summary={results}
  comparison={comparisonResult}
  disabled={!results}
/>
```

Clear comparison when inputs change:

```typescript
// In handleCalculate:
setComparisonResult(null);
```

Update Summary's interface:

```typescript
interface SummaryProps {
  summary: ProjectionSummary;
  inputs: UserInputs;
  comparison: ComparisonResult | null;
  onCompare: (result: ComparisonResult) => void;
}
```

And the `handleCompare` function in Summary uses `onCompare`:

```typescript
const handleCompare = async () => {
  setIsComparing(true);
  await new Promise(resolve => setTimeout(resolve, 50));
  const result = runStrategyComparison(inputs);
  onCompare(result);
  setIsComparing(false);
};
```

Replace `comparisonResult` references in Summary with the `comparison` prop.

### Step 5: Verify the app compiles and runs

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx tsc --noEmit 2>&1 | grep -v "test" | head -10`

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vite build 2>&1 | tail -5`

Expected: Clean build (or only pre-existing TS errors in test files).

### Step 6: Run all tests to confirm nothing is broken

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run`

Expected: All 1,414+ tests pass.

### Step 7: Commit

```bash
git add src/components/Summary.tsx src/App.tsx
git commit -m "feat(v2.1.0): wire strategy comparison into Summary with Compare button"
```

---

## Task 4: Add Comparison Section to PDF Report

**Files:**
- Modify: `src/components/ReportTemplate.tsx`

Add a new section to the PDF between Notional Accounts and Methodology. This is the section that makes the advisor say "this is what I hand to my client."

### Step 1: Add comparison prop to ReportTemplate

Update the component's props interface and forwardRef:

```typescript
import type { ComparisonResult } from '../lib/strategyComparison';

// Add to props:
comparison?: ComparisonResult | null;
```

### Step 2: Add the comparison section

Insert after the Notional Accounts table (after line ~596, before the Methodology Notes section). Add a page break and new section:

```tsx
{/* ===== STRATEGY COMPARISON ===== */}
{comparison && (
  <div style={{ pageBreakBefore: 'always', marginBottom: '20px' }}>
    <h2>Strategy Comparison</h2>
    <p style={{ fontSize: '10px', color: '#666', marginBottom: '12px' }}>
      Three compensation strategies evaluated using your inputs.
      The recommended strategy balances tax efficiency (60% weight) and corporate balance growth (40% weight).
    </p>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          {comparison.strategies.map(s => (
            <th key={s.id} style={{
              background: s.id === comparison.winner.bestOverall ? '#e8f5e9' : undefined,
            }}>
              {s.label}
              {s.id === comparison.winner.bestOverall && ' ★'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total Tax Paid</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id} style={{
              fontWeight: s.id === comparison.winner.lowestTax ? 700 : 400,
              color: s.id === comparison.winner.lowestTax ? '#2e7d32' : undefined,
            }}>
              {formatCurrency(s.summary.totalTax)}
            </td>
          ))}
        </tr>
        <tr>
          <td><strong>Effective Tax Rate</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id}>
              {(s.summary.effectiveTaxRate * 100).toFixed(1)}%
            </td>
          ))}
        </tr>
        <tr>
          <td><strong>Avg Annual After-Tax</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id}>{formatCurrency(s.summary.averageAnnualIncome)}</td>
          ))}
        </tr>
        <tr>
          <td><strong>Final Corp Balance</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id} style={{
              fontWeight: s.id === comparison.winner.highestBalance ? 700 : 400,
              color: s.id === comparison.winner.highestBalance ? '#2e7d32' : undefined,
            }}>
              {formatCurrency(s.summary.finalCorporateBalance)}
            </td>
          ))}
        </tr>
        <tr>
          <td><strong>RRSP Room Generated</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id}>{formatCurrency(s.summary.totalRRSPRoomGenerated)}</td>
          ))}
        </tr>
        <tr>
          <td><strong>Total Salary</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id}>{formatCurrency(s.summary.totalSalary)}</td>
          ))}
        </tr>
        <tr>
          <td><strong>Total Dividends</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id}>{formatCurrency(s.summary.totalDividends)}</td>
          ))}
        </tr>
        <tr>
          <td><strong>RDTOH Refunds</strong></td>
          {comparison.strategies.map(s => (
            <td key={s.id}>{formatCurrency(s.summary.totalRdtohRefund)}</td>
          ))}
        </tr>
      </tbody>
    </table>
    <div style={{ marginTop: '12px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '10px' }}>
      <strong>Recommendation:</strong>{' '}
      {(() => {
        const best = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);
        if (!best) return '';
        return `Based on this analysis, the ${best.label} strategy is recommended. It results in ${formatCurrency(best.summary.totalTax)} total tax over the projection period with a ${(best.summary.effectiveTaxRate * 100).toFixed(1)}% effective rate, leaving ${formatCurrency(best.summary.finalCorporateBalance)} in corporate investments.`;
      })()}
    </div>
  </div>
)}
```

### Step 3: Verify build

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vite build 2>&1 | tail -5`

Expected: Clean build.

### Step 4: Commit

```bash
git add src/components/ReportTemplate.tsx
git commit -m "feat(v2.1.0): add strategy comparison page to PDF report"
```

---

## Task 5: Add Comparison to Email Body

**Files:**
- Modify: `src/components/EmailAccountantButton.tsx`

### Step 1: Add comparison prop

```typescript
import type { ComparisonResult } from '../lib/strategyComparison';

interface EmailAccountantButtonProps {
  inputs: UserInputs | null;
  summary: ProjectionSummary | null;
  comparison?: ComparisonResult | null;
  disabled?: boolean;
}
```

### Step 2: Add comparison section to email body

In `buildMailtoUrl()`, add a `comparison` parameter and insert a section between KEY INPUTS and VIEW FULL RESULTS:

```typescript
function buildMailtoUrl(
  inputs: UserInputs,
  summary: ProjectionSummary,
  comparison?: ComparisonResult | null,
): string {
```

After the KEY INPUTS section (after the `Expected Return` line, before `VIEW FULL`), conditionally add:

```typescript
...(comparison ? [
  '',
  'STRATEGY COMPARISON',
  '---',
  ...comparison.strategies.map(s => {
    const tag = s.id === comparison.winner.bestOverall ? ' ← RECOMMENDED' : '';
    return `${s.label}: Tax ${formatCurrency(s.summary.totalTax)} | Rate ${formatPercentage(s.summary.effectiveTaxRate)} | Balance ${formatCurrency(s.summary.finalCorporateBalance)}${tag}`;
  }),
  '',
  `Recommendation: ${comparison.strategies.find(s => s.id === comparison.winner.bestOverall)?.label || 'Dynamic Optimizer'} strategy`,
] : []),
```

Update the `handleClick` to pass comparison:

```typescript
const mailtoUrl = buildMailtoUrl(inputs, summary, comparison);
```

And the component props destructure:

```typescript
export function EmailAccountantButton({ inputs, summary, comparison, disabled = false }: EmailAccountantButtonProps) {
```

### Step 3: Verify build + existing tests

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run && npx vite build 2>&1 | tail -5`

Expected: All tests pass, clean build.

### Step 4: Commit

```bash
git add src/components/EmailAccountantButton.tsx
git commit -m "feat(v2.1.0): add strategy comparison section to accountant email"
```

---

## Task 6: Add Tests for Comparison in Report & Email

**Files:**
- Modify: `src/lib/__tests__/strategyComparison.test.ts`

### Step 1: Add integration-level tests

Append to the existing test file:

```typescript
describe('comparison data for report/email', () => {
  it('each strategy summary has all fields needed for report table', () => {
    const result = runStrategyComparison(makeInputs());
    for (const strategy of result.strategies) {
      const s = strategy.summary;
      // All fields the report table renders
      expect(typeof s.totalTax).toBe('number');
      expect(typeof s.effectiveTaxRate).toBe('number');
      expect(typeof s.averageAnnualIncome).toBe('number');
      expect(typeof s.finalCorporateBalance).toBe('number');
      expect(typeof s.totalRRSPRoomGenerated).toBe('number');
      expect(typeof s.totalSalary).toBe('number');
      expect(typeof s.totalDividends).toBe('number');
      expect(typeof s.totalRdtohRefund).toBe('number');
    }
  });

  it('winner IDs reference valid strategies', () => {
    const result = runStrategyComparison(makeInputs());
    const ids = result.strategies.map(s => s.id);
    expect(ids).toContain(result.winner.lowestTax);
    expect(ids).toContain(result.winner.highestBalance);
    expect(ids).toContain(result.winner.bestOverall);
  });

  it('diff.taxSavings is 0 for best-overall strategy', () => {
    const result = runStrategyComparison(makeInputs());
    const best = result.strategies.find(s => s.id === result.winner.bestOverall)!;
    expect(best.diff.taxSavings).toBe(0);
    expect(best.diff.balanceDifference).toBe(0);
  });

  it('strategy descriptions are non-empty strings', () => {
    const result = runStrategyComparison(makeInputs());
    for (const strategy of result.strategies) {
      expect(strategy.description.length).toBeGreaterThan(10);
    }
  });

  it('salary-at-ympe description includes the YMPE dollar amount', () => {
    const result = runStrategyComparison(makeInputs());
    const ympeStrat = result.strategies.find(s => s.id === 'salary-at-ympe')!;
    // Should contain a dollar amount like "$71,300" or "$74,600"
    expect(ympeStrat.description).toMatch(/\$[\d,]+/);
  });
});
```

### Step 2: Run tests

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run src/lib/__tests__/strategyComparison.test.ts`

Expected: All 16 tests pass.

### Step 3: Run full test suite

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run`

Expected: All 1,430+ tests pass (1,414 original + 16 new).

### Step 4: Commit

```bash
git add src/lib/__tests__/strategyComparison.test.ts
git commit -m "test(v2.1.0): add report/email integration tests for strategy comparison"
```

---

## Task 7: Final Verification & Cleanup

### Step 1: Full build verification

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx tsc --noEmit 2>&1 | grep -v "\.test\." | head -20`

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vite build`

Expected: Clean TS (ignoring pre-existing test file errors), clean build.

### Step 2: Full test suite

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vitest run`

Expected: All tests pass.

### Step 3: Manual smoke test

Run: `cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator" && npx vite --open`

Verify:
1. Calculator tab: fill form, click Calculate, see results
2. Below results: see "Compare All 3 Strategies" button
3. Click it: see 3 strategy cards appear with winner badge
4. Click "Export Report" (print): PDF includes Strategy Comparison page
5. Click "Email Accountant": email body includes STRATEGY COMPARISON section

### Step 4: Update MEMORY.md

Add v2.1.0 section to memory.

### Step 5: Final commit

```bash
git add -A
git commit -m "chore(v2.1.0): update project memory"
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/strategyComparison.ts` | CREATE | Pure function engine: runs 3 strategies, computes winners + diffs |
| `src/lib/__tests__/strategyComparison.test.ts` | CREATE | 16 tests covering all engine behavior |
| `src/components/StrategyComparison.tsx` | CREATE | 3-column card layout with winner badge + trade-off insight |
| `src/components/Summary.tsx` | MODIFY | Add Compare button + render StrategyComparison inline |
| `src/App.tsx` | MODIFY | Lift comparison state, pass to Summary + EmailAccountantButton |
| `src/components/ReportTemplate.tsx` | MODIFY | Add comparison table + recommendation to PDF |
| `src/components/EmailAccountantButton.tsx` | MODIFY | Add comparison section to email body |

**No changes to:** `calculator.ts`, `types.ts`, Scenario Builder, or any existing test files.
