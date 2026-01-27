/**
 * Tooltip Component
 *
 * Provides hover/click tooltips for explaining complex tax concepts.
 */

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Check if mobile on mount
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);

    const handleResize = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close tooltip when clicking outside (for mobile)
  useEffect(() => {
    if (!isVisible || !isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, isMobile]);

  const handleClick = () => {
    if (isMobile) {
      setIsVisible(!isVisible);
    }
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--bg-card-solid)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--bg-card-solid)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--bg-card-solid)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--bg-card-solid)] border-y-transparent border-l-transparent',
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => !isMobile && setIsVisible(true)}
      onMouseLeave={() => !isMobile && setIsVisible(false)}
      onClick={handleClick}
    >
      {children || (
        <svg
          className="w-4 h-4 cursor-help"
          style={{ color: 'var(--text-dim)' }}
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
      )}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ width: 'max-content', maxWidth: '280px' }}
        >
          <div
            className="px-3 py-2 text-xs rounded-lg shadow-lg"
            style={{
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
            }}
          >
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
          />
        </div>
      )}
    </span>
  );
}

/**
 * Info label with built-in tooltip
 */
interface InfoLabelProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
}

export function InfoLabel({ label, tooltip, htmlFor }: InfoLabelProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {label}
      <Tooltip content={tooltip} />
    </label>
  );
}

/**
 * Predefined tooltips for common tax concepts
 */
export const TAX_TOOLTIPS = {
  cda: 'Capital Dividend Account - A notional account tracking the tax-free portion of capital gains. Capital dividends paid from the CDA are tax-free to shareholders.',
  erdtoh: 'Eligible Refundable Dividend Tax on Hand - Tracks refundable taxes paid on investment income from eligible dividends. Refunded when eligible dividends are paid.',
  nrdtoh: 'Non-Eligible Refundable Dividend Tax on Hand - Tracks refundable taxes paid on passive investment income. Refunded when non-eligible dividends are paid.',
  grip: 'General Rate Income Pool - Tracks income taxed at the general corporate rate. Allows payment of eligible dividends even from a CCPC.',
  eligibleDividend: 'Dividends paid from income taxed at the general corporate rate. Higher gross-up (38%) but also higher dividend tax credits, resulting in lower personal tax.',
  nonEligibleDividend: 'Dividends paid from income taxed at the small business rate. Lower gross-up (15%) and lower dividend tax credits, resulting in higher personal tax.',
  rdtohRefund: 'When dividends are paid, the corporation gets a refund of 38.33% of the dividend amount from RDTOH balances.',
  cpp: 'Canada Pension Plan - Mandatory payroll deduction on employment income. Both employee and employer contribute equally.',
  cpp2: 'CPP2 (Enhanced CPP) - Additional CPP contributions on earnings between YMPE ($74,600) and YAMPE ($85,000) at 4% rate.',
  ei: 'Employment Insurance - Payroll deduction for employment benefits. Employer pays 1.4x the employee contribution.',
  ympe: "Year's Maximum Pensionable Earnings - The income ceiling for base CPP contributions ($74,600 for 2026).",
  yampe: "Year's Additional Maximum Pensionable Earnings - The ceiling for CPP2 contributions ($85,000 for 2026).",
  ontarioSurtax: 'Additional tax of 20% on Ontario tax over $5,824 and 36% on Ontario tax over $7,453 (2026 indexed values).',
  ontarioHealthPremium: 'Provincial health levy ranging from $0 to $900 based on taxable income. Not indexed to inflation.',
  smallBusinessRate: 'Combined federal + provincial rate of 12.2% (Ontario) on active business income up to $500,000.',
  passiveIncomeGrind: 'When passive income exceeds $50,000, the small business deduction is reduced by $5 for every $1 of passive income.',
  investmentReturnRate: 'Expected annual total return on corporate investments, combining dividend income, interest, and capital gains.',
  inflationRate: 'Expected annual inflation rate. Used to project future tax brackets, CPP/EI limits, and optionally your spending needs.',
};
