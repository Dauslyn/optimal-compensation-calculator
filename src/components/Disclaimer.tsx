/**
 * Legal Disclaimer Component
 *
 * Displays important legal disclaimers about the calculator's limitations
 * and the need for professional advice.
 */

import { PROVINCES, DEFAULT_PROVINCE } from '../lib/tax/provinces';
import type { ProvinceCode } from '../lib/tax/provinces';

interface DisclaimerProps {
  variant?: 'full' | 'compact';
  className?: string;
  province?: ProvinceCode;
}

export function Disclaimer({ variant = 'full', className = '', province = DEFAULT_PROVINCE }: DisclaimerProps) {
  const lastUpdated = 'January 2025';
  const taxYearsSupported = '2025-2026';

  if (variant === 'compact') {
    return (
      <div
        className={`text-xs ${className}`}
        style={{ color: 'var(--text-dim)' }}
      >
        <p>
          Estimates only. Not financial, tax, or legal advice.{' '}
          <a
            href="#disclaimer"
            className="underline hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            Read full disclaimer
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      id="disclaimer"
      className={`p-5 rounded-xl ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 mt-0.5 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
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
        <div>
          <h3
            className="font-semibold text-sm mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Important Disclaimer
          </h3>
          <div
            className="text-xs space-y-2"
            style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}
          >
            <p>
              <strong>This calculator provides estimates for educational and informational purposes only.</strong>{' '}
              It is not financial, tax, or legal advice. Tax laws are complex, frequently change,
              and may vary based on individual circumstances not captured by this tool.
            </p>
            <p>
              The calculations assume {PROVINCES[province].name} residency and use simplified assumptions about
              tax treatment, investment returns, and corporate structures. Actual results may differ
              significantly based on your specific situation.
            </p>
            <p>
              <strong>Before making any financial decisions</strong>, consult with a qualified
              accountant, tax professional, or financial advisor who can consider your complete
              financial picture and provide personalized advice.
            </p>
            <p>
              The creators of this tool are not liable for any decisions made based on its output.
              By using this calculator, you acknowledge that you understand and accept these limitations.
            </p>
            <p className="pt-2" style={{ color: 'var(--text-dim)' }}>
              Tax rates current as of: {lastUpdated} | Supports tax years: {taxYearsSupported}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal disclaimer for first-time visitors
 */
interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function DisclaimerModal({ isOpen, onAccept }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
    >
      <div
        className="max-w-lg w-full p-6 rounded-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-primary)' }}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              CCPC Compensation Calculator
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Before you begin
            </p>
          </div>
        </div>

        <div
          className="text-sm space-y-3 mb-6"
          style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}
        >
          <p>
            This calculator provides <strong>estimates for educational purposes only</strong>.
            It is not financial, tax, or legal advice.
          </p>
          <p>
            Tax laws are complex and change frequently. The calculations use simplified
            assumptions and may not reflect your specific situation.
          </p>
          <p>
            <strong>Always consult a qualified accountant or tax professional</strong>{' '}
            before making any financial decisions based on these estimates.
          </p>
        </div>

        <button
          onClick={onAccept}
          className="btn-primary w-full"
        >
          I Understand, Continue
        </button>

        <p
          className="text-xs text-center mt-3"
          style={{ color: 'var(--text-dim)' }}
        >
          By clicking continue, you acknowledge that you understand these limitations.
        </p>
      </div>
    </div>
  );
}
