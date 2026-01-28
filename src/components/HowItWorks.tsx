import { useState } from 'react';

export function HowItWorks() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-black/5"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-primary-glow)' }}
          >
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--accent-primary)' }}
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
          </div>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            How This Calculator Works
          </span>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div
          className="px-6 pb-6 space-y-6 animate-fade-in"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {/* Tax Integration */}
          <div className="pt-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Tax Integration
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Canada's tax system is designed so that income earned through a corporation and paid out as
              dividends should be taxed similarly to salary income. This is called "integration." The corporation
              pays tax first, then you pay personal tax on dividends—but the dividend gross-up and tax credit
              system aims to make the total tax roughly equal. In practice, integration is imperfect and varies
              by province, which is why comparing strategies matters.
            </p>
          </div>

          {/* Effective vs Marginal Rates */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Effective vs. Marginal Rates
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This calculator shows <strong>effective tax rates</strong>—the actual percentage of your total
              income paid in tax. This differs from marginal rates (the rate on your next dollar). For example,
              even if your top bracket is 50%, your effective rate might be 35% because lower brackets apply
              to your first dollars of income.
            </p>
          </div>

          {/* RDTOH */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              RDTOH (Refundable Dividend Tax on Hand)
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              When your corporation earns passive investment income, it pays ~50% tax. However, 30.67% of this
              is added to an RDTOH account and refunded when you pay dividends ($38.33 per $100 of dividends).
              This means the effective corporate tax on investments is closer to 20% if you eventually pay
              dividends. The calculator tracks these refunds automatically.
            </p>
          </div>

          {/* SBD Grind */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Small Business Deduction (SBD) Grind
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The first $500,000 of active business income is taxed at ~12% (the SBD rate). But if your
              corporation earns more than $50,000 in passive investment income, this limit is reduced by $5
              for every $1 over $50,000. At $150,000 of passive income, you lose the SBD entirely and all
              active income is taxed at the general rate (~26%). This "grind" is factored into projections.
            </p>
          </div>

          {/* CPP Contributions */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              CPP Contributions
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              CPP contributions are shown separately from taxes because they're not a tax—they're retirement
              savings you'll receive back as pension income. Salary generates CPP contributions (and RRSP room),
              while dividends don't. This trade-off is one reason why the "right" answer depends on your
              personal situation.
            </p>
          </div>

          {/* Research Credit */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
          >
            <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              Based on PWL Capital Research
            </h3>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              This calculator implements the methodology from PWL Capital's research paper{' '}
              <a
                href="https://pwlcapital.com/wp-content/uploads/2024/04/OptimalCompensationSavingandConsumptionforOwners_2023.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                "Optimal Compensation, Savings, and Consumption for Owners of CCPCs"
              </a>
              {' '}by Ben Felix and the PWL Capital team. Their work found that a dynamic approach—varying
              the salary/dividend mix based on notional account balances—often outperforms static strategies.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://pwlcapital.com/wp-content/uploads/2024/04/OptimalCompensationSavingandConsumptionforOwners_2023.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Read the Paper (PDF)
              </a>
              <a
                href="https://pwlcapital.com/episode-13-optimal-compensation-from-a-ccpc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Listen to Episode 13
              </a>
            </div>
          </div>

          {/* Methodology Note */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <strong>Methodology:</strong> Calculations use 2025/2026 federal and provincial tax brackets,
              CPP/QPP rates, and dividend gross-up factors. Investment returns assume a balanced portfolio
              with configurable allocation. Results are projections based on current tax law and should be
              verified with a tax professional before making decisions.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
