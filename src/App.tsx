import { useState } from 'react';
import { InputFormClean } from './components/InputFormClean';
import { YearlyProjection } from './components/YearlyProjection';
import { Summary } from './components/Summary';
import { Chart } from './components/Chart';
import type { ProjectionSummary } from './lib/types';
import { calculateProjection } from './lib/calculator';

function App() {
  const [results, setResults] = useState<ProjectionSummary | null>(null);

  const handleCalculate = (inputs: any) => {
    const projection = calculateProjection(inputs);
    setResults(projection);
  };

  return (
    <div className="min-h-screen py-10">
      <div className="container">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--accent-gradient)',
                boxShadow: '0 0 30px var(--accent-primary-glow)'
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                Compensation Calculator
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Optimize salary vs. dividend mix for Canadian CCPC owners
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-success">Ontario 2025/2026</span>
            <span className="badge" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
              CPP2 + Surtax + Health Premium
            </span>
          </div>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Input Form */}
          <section className="glass-card p-6">
            <InputFormClean onCalculate={handleCalculate} />
          </section>

          {/* Results */}
          {results && (
            <div className="space-y-6 animate-fade-in">
              <Summary summary={results} />
              <Chart results={results.yearlyResults} />
              <YearlyProjection results={results.yearlyResults} />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            For informational purposes only. Consult a qualified tax professional for personalized advice.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
