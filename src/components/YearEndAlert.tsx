/**
 * Year-End Planning Alert
 *
 * Shows contextual guidance when users are planning near year-end.
 * Provides timing recommendations for salary vs dividend decisions.
 */

import { useState, useMemo } from 'react';

interface YearEndAlertProps {
  startingYear: number;
  province: string;
}

interface YearEndInfo {
  daysUntilYearEnd: number;
  isYearEndPeriod: boolean;
  rrspDeadlineInfo: string;
  daysUntilRRSPDeadline: number;
  currentMonth: number;
  recommendations: string[];
}

function getYearEndInfo(_startingYear: number): YearEndInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Calculate days until year end
  const yearEnd = new Date(currentYear, 11, 31); // Dec 31
  const daysUntilYearEnd = Math.max(
    0,
    Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // RRSP deadline is 60 days after year end (March 1, or Feb 29 in leap year)
  const rrspDeadlineYear = currentYear + 1;
  const isLeapYear =
    (rrspDeadlineYear % 4 === 0 && rrspDeadlineYear % 100 !== 0) ||
    rrspDeadlineYear % 400 === 0;
  const rrspDeadline = isLeapYear
    ? new Date(rrspDeadlineYear, 1, 29) // Feb 29
    : new Date(rrspDeadlineYear, 2, 1); // March 1

  const daysUntilRRSPDeadline = Math.max(
    0,
    Math.ceil((rrspDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const rrspDeadlineInfo = rrspDeadline.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Year-end planning period: October through January (Q4 + RRSP deadline crunch)
  const isYearEndPeriod = currentMonth >= 10 || currentMonth <= 2;

  // Generate contextual recommendations
  const recommendations: string[] = [];

  if (currentMonth >= 10 && currentMonth <= 12) {
    // October - December: Pre year-end planning
    if (daysUntilYearEnd <= 30) {
      recommendations.push(
        'Salary paid before Dec 31 counts for this tax year. Dividends can be declared later.'
      );
      recommendations.push(
        'Consider paying a salary bonus now if you want to maximize RRSP room for next year.'
      );
    }
    if (daysUntilYearEnd <= 60) {
      recommendations.push(
        'Dividends declared by year-end are taxable this year, even if paid in January.'
      );
    }
    recommendations.push(
      'Corporate year-end bonuses are deductible if paid within 180 days of fiscal year-end.'
    );
  } else if (currentMonth === 1) {
    // January: Post year-end, pre-RRSP deadline
    recommendations.push(
      `You have ${daysUntilRRSPDeadline} days until the RRSP contribution deadline (${rrspDeadlineInfo}).`
    );
    recommendations.push(
      'Salary bonuses paid now count toward the current year. Consider dividend timing carefully.'
    );
  } else if (currentMonth === 2) {
    // February: RRSP deadline crunch
    if (daysUntilRRSPDeadline <= 30) {
      recommendations.push(
        `RRSP deadline alert! Only ${daysUntilRRSPDeadline} days until ${rrspDeadlineInfo}.`
      );
      recommendations.push(
        'Contributions made before the deadline reduce your prior year taxable income.'
      );
    }
  }

  return {
    daysUntilYearEnd,
    isYearEndPeriod,
    rrspDeadlineInfo,
    daysUntilRRSPDeadline,
    currentMonth,
    recommendations,
  };
}

export function YearEndAlert({ startingYear, province }: YearEndAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const yearEndInfo = useMemo(() => getYearEndInfo(startingYear), [startingYear]);

  // Don't show if:
  // 1. User dismissed the alert
  // 2. Not in year-end planning period
  // 3. No recommendations to show
  if (isDismissed || !yearEndInfo.isYearEndPeriod || yearEndInfo.recommendations.length === 0) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const isCurrentYear = startingYear === currentYear;
  const isNextYear = startingYear === currentYear + 1;

  // Only show for current or next year planning
  if (!isCurrentYear && !isNextYear) {
    return null;
  }

  return (
    <div
      className="relative p-4 rounded-lg mb-4 animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-md transition-colors"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-6">
        {/* Calendar icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(251, 191, 36, 0.2)' }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: 'rgb(251, 191, 36)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold" style={{ color: 'rgb(251, 191, 36)' }}>
              Year-End Planning
            </h3>
            {yearEndInfo.daysUntilYearEnd > 0 && yearEndInfo.currentMonth >= 10 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: 'rgb(251, 191, 36)',
                }}
              >
                {yearEndInfo.daysUntilYearEnd} days until year-end
              </span>
            )}
          </div>

          <ul className="space-y-1.5">
            {yearEndInfo.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: 'rgb(251, 191, 36)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{rec}</span>
              </li>
            ))}
          </ul>

          {province === 'QC' && (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Quebec: QPP and QPIP deductions apply. Consider provincial tax credit timing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to get year-end planning status
 */
export function useYearEndStatus() {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const isYearEndPeriod = currentMonth >= 10 || currentMonth <= 2;

    return {
      isYearEndPeriod,
      currentMonth,
      currentYear: now.getFullYear(),
    };
  }, []);
}
