/**
 * IPP Analysis Component
 *
 * Shows Individual Pension Plan analysis comparing IPP vs RRSP
 * contribution limits and benefits.
 */

import { useMemo } from 'react';
import {
  calculateIPPContribution,
  compareIPPvsRRSP,
  calculateNetIPPBenefit,
  estimateIPPAdminCosts,
} from '../lib/tax';

interface IPPAnalysisProps {
  memberAge: number;
  yearsOfService: number;
  currentSalary: number;
  corporateTaxRate: number;
  rrspLimit: number;
  year: number;
}

export function IPPAnalysis({
  memberAge,
  yearsOfService,
  currentSalary,
  corporateTaxRate,
  rrspLimit,
  year,
}: IPPAnalysisProps) {
  const memberInfo = useMemo(
    () => ({
      age: memberAge,
      yearsOfService,
      currentSalary,
    }),
    [memberAge, yearsOfService, currentSalary]
  );

  const ippResult = useMemo(
    () => calculateIPPContribution(memberInfo, corporateTaxRate, year),
    [memberInfo, corporateTaxRate, year]
  );

  const comparison = useMemo(
    () => compareIPPvsRRSP(memberInfo, rrspLimit, year, corporateTaxRate),
    [memberInfo, rrspLimit, year, corporateTaxRate]
  );

  const netBenefit = useMemo(
    () => calculateNetIPPBenefit(memberInfo, corporateTaxRate, year),
    [memberInfo, corporateTaxRate, year]
  );

  const adminCosts = useMemo(() => estimateIPPAdminCosts(), []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-primary-glow)' }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: 'var(--accent-primary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              IPP Analysis
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Individual Pension Plan vs RRSP
            </p>
          </div>
        </div>

        {comparison.ippAdvantage && (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: 'rgb(34, 197, 94)',
            }}
          >
            IPP Recommended
          </span>
        )}
      </div>

      {/* Member Summary */}
      <div
        className="p-3 rounded-lg mb-4"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Age</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {memberAge} years
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Years of Service</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {yearsOfService} years
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Pensionable Earnings</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(currentSalary)}
            </p>
          </div>
        </div>
      </div>

      {/* Contribution Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div
          className="p-4 rounded-lg text-center"
          style={{
            background: comparison.ippAdvantage
              ? 'rgba(34, 197, 94, 0.1)'
              : 'var(--bg-base)',
            border: comparison.ippAdvantage
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            IPP Contribution
          </p>
          <p
            className="text-xl font-bold"
            style={{
              color: comparison.ippAdvantage
                ? 'rgb(34, 197, 94)'
                : 'var(--text-primary)',
            }}
          >
            {formatCurrency(ippResult.totalAnnualContribution)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
            Tax-deductible for corporation
          </p>
        </div>

        <div
          className="p-4 rounded-lg text-center"
          style={{
            background: !comparison.ippAdvantage
              ? 'rgba(34, 197, 94, 0.1)'
              : 'var(--bg-base)',
            border: !comparison.ippAdvantage
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            RRSP Limit
          </p>
          <p
            className="text-xl font-bold"
            style={{
              color: !comparison.ippAdvantage
                ? 'rgb(34, 197, 94)'
                : 'var(--text-primary)',
            }}
          >
            {formatCurrency(rrspLimit)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
            Personal contribution limit
          </p>
        </div>
      </div>

      {/* Difference */}
      {comparison.difference !== 0 && (
        <div
          className="p-3 rounded-lg mb-4 text-center"
          style={{
            background:
              comparison.difference > 0
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
          }}
        >
          <p className="text-sm">
            <span style={{ color: 'var(--text-muted)' }}>IPP allows </span>
            <span
              className="font-bold"
              style={{
                color:
                  comparison.difference > 0
                    ? 'rgb(34, 197, 94)'
                    : 'rgb(239, 68, 68)',
              }}
            >
              {comparison.difference > 0 ? '+' : ''}
              {formatCurrency(comparison.difference)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}> vs RRSP</span>
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Projected Annual Pension
          </p>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(ippResult.projectedAnnualPension)}/year
          </p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            At retirement (based on {yearsOfService + 1} years service)
          </p>
        </div>

        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Corporate Tax Savings
          </p>
          <p
            className="font-semibold"
            style={{ color: 'rgb(34, 197, 94)' }}
          >
            {formatCurrency(netBenefit.taxSavings)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            At {(corporateTaxRate * 100).toFixed(1)}% corporate rate
          </p>
        </div>

        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            RRSP Room Reduction (PA)
          </p>
          <p
            className="font-semibold"
            style={{ color: 'rgb(239, 68, 68)' }}
          >
            -{formatCurrency(ippResult.rrspRoomReduction)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Pension Adjustment
          </p>
        </div>

        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-base)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Annual Admin Costs
          </p>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            ~{formatCurrency(netBenefit.adminCosts)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Actuarial + administration
          </p>
        </div>
      </div>

      {/* Notes */}
      {comparison.notes.length > 0 && (
        <div
          className="p-3 rounded-lg"
          style={{ background: 'rgba(59, 130, 246, 0.1)' }}
        >
          <p
            className="text-xs font-medium mb-2"
            style={{ color: 'rgb(59, 130, 246)' }}
          >
            Analysis Notes
          </p>
          <ul className="space-y-1">
            {comparison.notes.map((note, index) => (
              <li
                key={index}
                className="text-xs flex items-start gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span style={{ color: 'rgb(59, 130, 246)' }}>-</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Setup Costs */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          One-time IPP Setup Costs
        </p>
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>
            Setup: {formatCurrency(adminCosts.setup)}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Triennial valuation: {formatCurrency(adminCosts.triennialValuation)}
          </span>
        </div>
      </div>

      <p
        className="text-xs mt-4 pt-3"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-dim)',
        }}
      >
        IPP contributions are made by the corporation and are tax-deductible.
        Consult an actuary for precise calculations based on your situation.
      </p>
    </div>
  );
}
