import type { YearlyResult } from '../lib/types';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts';

interface ChartProps {
  results: YearlyResult[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(value);

  // Get effective tax rate from payload (stored as hidden data)
  const effectiveRate = payload[0]?.payload?.effectiveRate;

  return (
    <div
      style={{
        background: 'rgba(22, 22, 30, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>{label}</p>
      {payload.map((entry: any, index: number) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
            fontSize: '13px',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      {effectiveRate !== undefined && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '13px',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8' }} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Effective Tax Rate:</span>
          <span style={{ fontWeight: 600, color: '#818cf8' }}>
            {(effectiveRate * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export function Chart({ results }: ChartProps) {
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const compensationData = results.map((year) => ({
    year: `Y${year.year}`,
    Salary: year.salary,
    'Capital Div': year.dividends.capitalDividends,
    'Eligible Div': year.dividends.eligibleDividends,
    'Non-Elig Div': year.dividends.nonEligibleDividends,
    effectiveRate: year.effectiveIntegratedRate,
  }));

  const accountsData = results.map((year) => ({
    year: `Y${year.year}`,
    'Corp Balance': year.notionalAccounts.corporateInvestments,
    CDA: year.notionalAccounts.CDA,
    GRIP: year.notionalAccounts.GRIP,
  }));

  const COLORS = {
    salary: '#6366f1',
    capitalDiv: '#34d399',
    eligibleDiv: '#a78bfa',
    nonEligibleDiv: '#fbbf24',
    corp: '#38bdf8',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compensation Breakdown */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5">Compensation by Year</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={compensationData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: 'rgba(255,255,255,0.7)' }}
            />
            <Bar dataKey="Salary" fill={COLORS.salary} stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Capital Div" fill={COLORS.capitalDiv} stackId="a" />
            <Bar dataKey="Eligible Div" fill={COLORS.eligibleDiv} stackId="a" />
            <Bar dataKey="Non-Elig Div" fill={COLORS.nonEligibleDiv} stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Corporate Balance Trend */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-5">Corporate Balance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={accountsData}>
            <defs>
              <linearGradient id="colorCorp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.corp} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.corp} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: 'rgba(255,255,255,0.7)' }}
            />
            <Area
              type="monotone"
              dataKey="Corp Balance"
              stroke={COLORS.corp}
              fill="url(#colorCorp)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="CDA"
              stroke={COLORS.capitalDiv}
              strokeWidth={2}
              dot={{ fill: COLORS.capitalDiv, r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="GRIP"
              stroke={COLORS.eligibleDiv}
              strokeWidth={2}
              dot={{ fill: COLORS.eligibleDiv, r: 3, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
