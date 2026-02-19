# Lifetime UI Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three lifetime charts, update ReportTemplate with a lifetime section, add lifetime data to the accountant email, and register three new dashboard widgets.

**Architecture:** Four independent changes, all purely presentational — no calculator logic touched. New chart components follow the exact pattern of existing charts in `src/components/charts/`. Widget registration follows the existing `widgetRegistry.ts` + `WidgetRenderer.tsx` pattern.

**Tech Stack:** React 19, TypeScript, Recharts 3, Tailwind CSS v4. No new dependencies.

---

## Task 1: Create `LifetimeCharts.tsx`

Three charts in one file (mirrors the pattern of `ComparisonCharts.tsx`). All three are exported as named exports and wrapped with `memo`.

**Files:**
- Create: `src/components/charts/LifetimeCharts.tsx`

### Step 1: Create the file with all three components

```tsx
// src/components/charts/LifetimeCharts.tsx
import { memo } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ComparisonResult } from '../../lib/strategyComparison';
import type { ProjectionSummary } from '../../lib/types';
import { formatCurrency, formatPercent } from '../../lib/formatters';

// ── Shared helpers ──────────────────────────────────────────────────────────

const STRATEGY_COLORS: Record<string, string> = {
  'salary-at-ympe': '#10b981',
  'dividends-only': '#d4a017',
  'dynamic': '#6ee7b7',
};

const INCOME_COLORS = {
  cpp:        '#10b981',
  oas:        '#6ee7b7',
  rrif:       '#d4a017',
  corporate:  '#f87171',
  tfsa:       '#a3e635',
  ipp:        '#2dd4bf',
};

const PHASE_BANDS = {
  accumulation: 'rgba(59,130,246,0.06)',
  retirement:   'rgba(16,185,129,0.06)',
  estate:       'rgba(248,113,113,0.06)',
};

const axisProps = {
  stroke: 'rgba(255,255,255,0.4)',
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const legendProps = {
  iconType: 'line' as const,
  iconSize: 12,
  wrapperStyle: { fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,17,13,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(110,231,183,0.1)',
      borderRadius: '14px',
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '13px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
            {typeof entry.value === 'number' && entry.value > 0 && entry.value < 1
              ? formatPercent(entry.value)
              : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── 1. RetirementIncomeChart ────────────────────────────────────────────────
// Stacked area per income source for a single strategy's retirement years.

interface RetirementIncomeChartProps {
  comparison: ComparisonResult;
  strategyId: string;
}

export const RetirementIncomeChart = memo(function RetirementIncomeChart({
  comparison,
  strategyId,
}: RetirementIncomeChartProps) {
  const strategyData = comparison.yearlyData.find(d => d.strategyId === strategyId)
    ?? comparison.yearlyData[0];
  const strategy = comparison.strategies.find(s => s.id === strategyId)
    ?? comparison.strategies[0];

  const retirementYears = strategyData.years.filter(y => y.phase === 'retirement');

  if (retirementYears.length === 0) {
    return (
      <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
        No retirement years in this projection
      </div>
    );
  }

  const data = retirementYears.map(y => ({
    year: y.calendarYear ?? y.year,
    CPP:       y.retirement?.cppIncome       ?? 0,
    OAS:       y.retirement?.oasNet          ?? 0,
    RRIF:      y.retirement?.rrifWithdrawal  ?? 0,
    Corporate: y.retirement?.corporateDividends ?? 0,
    TFSA:      y.retirement?.tfsaWithdrawal  ?? 0,
    IPP:       y.retirement?.ippPension      ?? 0,
  }));

  const hasIPP = data.some(d => d.IPP > 0);

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Retirement Income by Source — {strategy.label}
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Stacked annual retirement income across all sources
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'rgba(255,255,255,0.7)' }} />
          <Area type="monotone" dataKey="CPP"       stackId="a" fill={INCOME_COLORS.cpp}       stroke={INCOME_COLORS.cpp}       fillOpacity={0.7} />
          <Area type="monotone" dataKey="OAS"       stackId="a" fill={INCOME_COLORS.oas}       stroke={INCOME_COLORS.oas}       fillOpacity={0.7} />
          <Area type="monotone" dataKey="RRIF"      stackId="a" fill={INCOME_COLORS.rrif}      stroke={INCOME_COLORS.rrif}      fillOpacity={0.7} />
          <Area type="monotone" dataKey="Corporate" stackId="a" fill={INCOME_COLORS.corporate} stroke={INCOME_COLORS.corporate} fillOpacity={0.7} />
          <Area type="monotone" dataKey="TFSA"      stackId="a" fill={INCOME_COLORS.tfsa}      stroke={INCOME_COLORS.tfsa}      fillOpacity={0.7} />
          {hasIPP && (
            <Area type="monotone" dataKey="IPP" stackId="a" fill={INCOME_COLORS.ipp} stroke={INCOME_COLORS.ipp} fillOpacity={0.7} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// ── 2. BalanceDepletionChart ────────────────────────────────────────────────
// Multi-line total liquid wealth across all phases for all 3 strategies.
// Phase transition years get a vertical reference line.

interface BalanceDepletionChartProps {
  comparison: ComparisonResult;
}

export const BalanceDepletionChart = memo(function BalanceDepletionChart({
  comparison,
}: BalanceDepletionChartProps) {
  const winner = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);

  // Find retirement transition year from the dynamic/first strategy
  const primaryYears = comparison.yearlyData[0]?.years ?? [];
  const firstRetirementYear = primaryYears.find(y => y.phase === 'retirement');
  const firstEstateYear = primaryYears.find(y => y.phase === 'estate');

  const maxYears = Math.max(...comparison.yearlyData.map(d => d.years.length));

  const data = Array.from({ length: maxYears }, (_, idx) => {
    const refYear = primaryYears[idx];
    const dp: Record<string, any> = {
      year: refYear?.calendarYear ?? refYear?.year ?? `Y${idx + 1}`,
    };
    comparison.yearlyData.forEach(sd => {
      const s = comparison.strategies.find(st => st.id === sd.strategyId);
      const y = sd.years[idx];
      if (s && y) {
        const bal = y.balances;
        dp[s.label] = bal
          ? (bal.rrspBalance + bal.tfsaBalance + Math.max(0, bal.corporateBalance) + (bal.ippFundBalance ?? 0))
          : y.notionalAccounts.corporateInvestments; // fallback for accumulation phase without balances
      }
    });
    return dp;
  });

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Total Wealth Over Lifetime
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        RRSP + TFSA + Corporate + IPP Fund across all phases
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis tickFormatter={formatCompact} {...axisProps} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Legend {...legendProps} />
          {firstRetirementYear && (
            <ReferenceLine
              x={firstRetirementYear.calendarYear ?? firstRetirementYear.year}
              stroke="rgba(16,185,129,0.4)"
              strokeDasharray="4 4"
              label={{ value: 'Retirement', fill: 'rgba(16,185,129,0.7)', fontSize: 10, position: 'top' }}
            />
          )}
          {firstEstateYear && (
            <ReferenceLine
              x={firstEstateYear.calendarYear ?? firstEstateYear.year}
              stroke="rgba(248,113,113,0.4)"
              strokeDasharray="4 4"
              label={{ value: 'Estate', fill: 'rgba(248,113,113,0.7)', fontSize: 10, position: 'top' }}
            />
          )}
          {comparison.strategies.map(s => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.label}
              stroke={STRATEGY_COLORS[s.id] ?? '#6b7280'}
              strokeWidth={s.id === winner?.id ? 3 : 2}
              dot={{ fill: STRATEGY_COLORS[s.id] ?? '#6b7280', r: 2, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// ── 3. LifetimeOverviewStats ────────────────────────────────────────────────
// Stat grid — 6 boxes from summary.lifetime. No Recharts.

interface LifetimeOverviewStatsProps {
  summary: ProjectionSummary;
}

export const LifetimeOverviewStats = memo(function LifetimeOverviewStats({
  summary,
}: LifetimeOverviewStatsProps) {
  const lt = summary.lifetime;

  if (!lt) {
    return (
      <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
        No lifetime data available
      </div>
    );
  }

  const stats = [
    { label: 'Total Lifetime Spending', value: formatCurrency(lt.totalLifetimeSpending), positive: true },
    { label: 'Lifetime Effective Tax Rate', value: formatPercent(lt.lifetimeEffectiveRate), positive: false },
    { label: 'Peak Corporate Balance', value: `${formatCurrency(lt.peakCorporateBalance)} (yr ${lt.peakYear})`, positive: true },
    { label: 'Net Estate Value', value: formatCurrency(lt.estateValue), positive: true },
    { label: 'CPP Benefits Received', value: formatCurrency(lt.cppTotalReceived), positive: true },
    { label: 'OAS Benefits Received', value: formatCurrency(lt.oasTotalReceived), positive: true },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Lifetime Overview
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-value ${stat.positive ? 'positive' : ''}`} style={{ fontSize: '1.05rem' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div>Accumulation: {lt.totalAccumulationYears} yr{lt.totalAccumulationYears !== 1 ? 's' : ''}</div>
        <div>Retirement: {lt.totalRetirementYears} yr{lt.totalRetirementYears !== 1 ? 's' : ''}</div>
        <div>RRIF Withdrawn: {formatCurrency(lt.rrifTotalWithdrawn)}</div>
        <div>TFSA Withdrawn: {formatCurrency(lt.tfsaTotalWithdrawn)}</div>
      </div>
    </div>
  );
});
```

### Step 2: Verify TypeScript compiles

```bash
cd "/Users/home/Documents/Vibe Coding/Project Ideas/Optimal Compensation Calculator/optimal-compensation-calculator"
npx tsc --noEmit
```

Expected: No errors. If there are import errors, check `formatPercent` vs `formatPercentage` in `src/lib/formatters.ts`.

### Step 3: Commit

```bash
git add src/components/charts/LifetimeCharts.tsx
git commit -m "feat: add RetirementIncomeChart, BalanceDepletionChart, LifetimeOverviewStats"
```

---

## Task 2: Register 3 new dashboard widgets

**Files:**
- Modify: `src/components/dashboard/widgetRegistry.ts`
- Modify: `src/components/dashboard/WidgetRenderer.tsx`

### Step 1: Add to `widgetRegistry.ts`

Add three entries to `WIDGET_REGISTRY` after the `'key-metrics'` entry:

```ts
'retirement-income': { id: 'retirement-income', label: 'Retirement Income by Source', icon: '\u{1F4B0}', category: 'chart' },
'balance-depletion':  { id: 'balance-depletion',  label: 'Total Wealth Over Lifetime',   icon: '\u{1F4C9}', category: 'chart' },
'lifetime-overview':  { id: 'lifetime-overview',  label: 'Lifetime Overview Stats',       icon: '\u{1F31F}', category: 'stat'  },
```

### Step 2: Add cases to `WidgetRenderer.tsx`

Add import at top of file (after existing chart imports):

```tsx
import { RetirementIncomeChart, BalanceDepletionChart, LifetimeOverviewStats } from '../charts/LifetimeCharts';
```

Add three cases in the `switch` block before the `default:` case:

```tsx
case 'retirement-income':
  return <RetirementIncomeChart comparison={comparison} strategyId={strategyId} />;

case 'balance-depletion':
  return <BalanceDepletionChart comparison={comparison} />;

case 'lifetime-overview': {
  const s = getStrategyData(comparison, strategyId).strategy;
  return <LifetimeOverviewStats summary={s.summary} />;
}
```

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

Expected: No errors.

### Step 4: Commit

```bash
git add src/components/dashboard/widgetRegistry.ts src/components/dashboard/WidgetRenderer.tsx
git commit -m "feat: register retirement-income, balance-depletion, lifetime-overview dashboard widgets"
```

---

## Task 3: Add lifetime section to `ReportTemplate.tsx`

Insert a new section between the existing "Notional Accounts Tracking" table and "Strategy Comparison" section. The section is conditional on `summary.lifetime` existing.

**Files:**
- Modify: `src/components/ReportTemplate.tsx`

### Step 1: Add the lifetime section

The insertion point is after line 598 (`</div>` closing the notional accounts section) and before line 600 (`{/* ===== STRATEGY COMPARISON ===== */}`).

Insert this block:

```tsx
{/* ===== LIFETIME SUMMARY ===== */}
{summary.lifetime && (
  <div style={{ marginBottom: '20px' }}>
    <h2>Lifetime Model Summary</h2>
    <p style={{ fontSize: '10px', color: '#666', marginBottom: '12px' }}>
      Full lifetime projection from accumulation through retirement drawdown and estate settlement.
    </p>

    {/* Lifetime key metrics */}
    <div className="grid-4" style={{ marginBottom: '16px' }}>
      <div className="metric-box">
        <div className="metric-label">Total Lifetime Spending</div>
        <div className="metric-value">{formatCurrency(summary.lifetime.totalLifetimeSpending)}</div>
      </div>
      <div className="metric-box">
        <div className="metric-label">Lifetime Tax Rate</div>
        <div className="metric-value">{(summary.lifetime.lifetimeEffectiveRate * 100).toFixed(1)}%</div>
      </div>
      <div className="metric-box">
        <div className="metric-label">Net Estate Value</div>
        <div className="metric-value">{formatCurrency(summary.lifetime.estateValue)}</div>
      </div>
      <div className="metric-box">
        <div className="metric-label">Peak Corp Balance</div>
        <div className="metric-value">{formatCurrency(summary.lifetime.peakCorporateBalance)}</div>
      </div>
    </div>

    {/* Phase breakdown */}
    <div className="grid-3" style={{ marginBottom: '16px' }}>
      <div className="metric-box">
        <div className="metric-label">Accumulation Years</div>
        <div className="metric-value">{summary.lifetime.totalAccumulationYears}</div>
      </div>
      <div className="metric-box">
        <div className="metric-label">Retirement Years</div>
        <div className="metric-value">{summary.lifetime.totalRetirementYears}</div>
      </div>
      <div className="metric-box">
        <div className="metric-label">Total Lifetime Tax</div>
        <div className="metric-value">{formatCurrency(summary.lifetime.totalLifetimeTax)}</div>
      </div>
    </div>

    {/* Government benefits + withdrawals */}
    <h3>Government Benefits &amp; Registered Withdrawals</h3>
    <table>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>Item</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>CPP Benefits Received</td>
          <td>{formatCurrency(summary.lifetime.cppTotalReceived)}</td>
        </tr>
        <tr>
          <td>OAS Benefits Received</td>
          <td>{formatCurrency(summary.lifetime.oasTotalReceived)}</td>
        </tr>
        <tr>
          <td>Total RRIF Withdrawals</td>
          <td>{formatCurrency(summary.lifetime.rrifTotalWithdrawn)}</td>
        </tr>
        <tr>
          <td>Total TFSA Withdrawals</td>
          <td>{formatCurrency(summary.lifetime.tfsaTotalWithdrawn)}</td>
        </tr>
      </tbody>
    </table>

    {/* Estate breakdown from final year */}
    {(() => {
      const finalYear = summary.yearlyResults[summary.yearlyResults.length - 1];
      if (!finalYear?.estate) return null;
      return (
        <>
          <h3>Estate Settlement (Final Year)</h3>
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Terminal RRIF Tax (deemed disposition)</td>
                <td style={{ color: '#c62828' }}>({formatCurrency(finalYear.estate.terminalRRIFTax)})</td>
              </tr>
              <tr>
                <td>Corporate Wind-Up Tax</td>
                <td style={{ color: '#c62828' }}>({formatCurrency(finalYear.estate.corporateWindUpTax)})</td>
              </tr>
              <tr>
                <td>TFSA Pass-Through (tax-free)</td>
                <td>{formatCurrency(finalYear.estate.tfsaPassThrough)}</td>
              </tr>
              <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                <td>Net Estate Value</td>
                <td>{formatCurrency(finalYear.estate.netEstateValue)}</td>
              </tr>
            </tbody>
          </table>
        </>
      );
    })()}

    {/* Retirement year-by-year */}
    {summary.yearlyResults.some(y => y.phase === 'retirement') && (
      <>
        <h3>Retirement Year-by-Year</h3>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Age</th>
              <th>CPP</th>
              <th>OAS (Net)</th>
              <th>RRIF</th>
              <th>Corp Div</th>
              <th>TFSA</th>
              <th>Total Income</th>
            </tr>
          </thead>
          <tbody>
            {summary.yearlyResults
              .filter(y => y.phase === 'retirement')
              .map((y, i) => (
                <tr key={i}>
                  <td>{y.calendarYear ?? y.year}</td>
                  <td>{y.age ?? '—'}</td>
                  <td>{formatCurrency(y.retirement?.cppIncome ?? 0)}</td>
                  <td>{formatCurrency(y.retirement?.oasNet ?? 0)}</td>
                  <td>{formatCurrency(y.retirement?.rrifWithdrawal ?? 0)}</td>
                  <td>{formatCurrency(y.retirement?.corporateDividends ?? 0)}</td>
                  <td>{formatCurrency(y.retirement?.tfsaWithdrawal ?? 0)}</td>
                  <td><strong>{formatCurrency(y.retirement?.totalRetirementIncome ?? 0)}</strong></td>
                </tr>
              ))}
          </tbody>
        </table>
      </>
    )}
  </div>
)}
```

### Step 2: Also add lifetime bullet to `generateExecutiveBullets()`

After the existing spouse bullet, add:

```ts
// Lifetime summary
if (summary.lifetime) {
  bullets.push(`Lifetime model projects ${formatCurrency(summary.lifetime.totalLifetimeSpending)} total spending over ${summary.lifetime.totalAccumulationYears + summary.lifetime.totalRetirementYears} years with a net estate of ${formatCurrency(summary.lifetime.estateValue)} after all taxes.`);
}
```

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

Expected: No errors.

### Step 4: Commit

```bash
git add src/components/ReportTemplate.tsx
git commit -m "feat: add lifetime summary section to PDF report template"
```

---

## Task 4: Add lifetime data to `EmailAccountantButton.tsx`

Add a `LIFETIME SUMMARY` section to the email body, inserted after the `KEY INPUTS` block and before `STRATEGY COMPARISON`.

**Files:**
- Modify: `src/components/EmailAccountantButton.tsx`

### Step 1: Insert lifetime section into `buildMailtoUrl()`

In `buildMailtoUrl()`, find the spread of `comparison` lines (around line 62) and add a lifetime block just before it:

```ts
...(summary.lifetime ? [
  '',
  'LIFETIME MODEL',
  '---',
  `Total Lifetime Spending: ${formatCurrency(summary.lifetime.totalLifetimeSpending)}`,
  `Lifetime Effective Tax Rate: ${formatPercentage(summary.lifetime.lifetimeEffectiveRate)}`,
  `Net Estate Value: ${formatCurrency(summary.lifetime.estateValue)}`,
  `Peak Corporate Balance: ${formatCurrency(summary.lifetime.peakCorporateBalance)} (year ${summary.lifetime.peakYear})`,
  `CPP Received: ${formatCurrency(summary.lifetime.cppTotalReceived)} | OAS Received: ${formatCurrency(summary.lifetime.oasTotalReceived)}`,
  `Accumulation: ${summary.lifetime.totalAccumulationYears} yrs | Retirement: ${summary.lifetime.totalRetirementYears} yrs`,
] : []),
```

Also update the strategy comparison tag in the email to reference `lifetimeWinner` when available. Find this line (around line 67):

```ts
const tag = s.id === comparison.winner.bestOverall ? ' <-- RECOMMENDED' : '';
```

Replace with:

```ts
const lifetimeObjectiveWinner = comparison.lifetimeWinner?.byObjective;
const tag = s.id === (lifetimeObjectiveWinner ?? comparison.winner.bestOverall) ? ' <-- RECOMMENDED' : '';
```

### Step 2: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

Expected: No errors.

### Step 3: Commit

```bash
git add src/components/EmailAccountantButton.tsx
git commit -m "feat: add lifetime summary section to accountant email"
```

---

## Task 5: Final verification

### Step 1: Run full test suite

```bash
npx vitest run
```

Expected: All 1,832 tests pass (no regressions — these are all UI changes, no logic touched).

### Step 2: Run production build

```bash
npx vite build
```

Expected: Build succeeds, no TypeScript or bundle errors.

### Step 3: Verify widget shelf shows new widgets

Start dev server and check that the Dashboard tab's widget shelf shows:
- "Retirement Income by Source" (chart)
- "Total Wealth Over Lifetime" (chart)
- "Lifetime Overview Stats" (stat)

### Step 4: Final commit (if any loose ends)

```bash
git log --oneline -6
```

Expected: 4 feature commits since last merge.

---

## Key Notes

- `formatPercent` vs `formatPercentage`: check `src/lib/formatters.ts` — use whichever is exported. The file exports both; `formatPercent` takes a decimal (0.35 → "35.0%"), `formatPercentage` is an alias.
- `summary.lifetime` is only populated when the engine runs retirement + estate phases. If inputs don't include retirement age, it will be `undefined` — all UI guards with `summary.lifetime &&`.
- `y.balances` is populated in retirement phase; accumulation years only have `notionalAccounts`. The `BalanceDepletionChart` falls back to `notionalAccounts.corporateInvestments` for accumulation years.
- Dashboard widgets don't need `strategyId` sensitivity for `balance-depletion` (shows all 3 strategies always) or `lifetime-overview` (reads from the selected strategy's summary).
