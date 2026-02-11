import { useState, useEffect, useRef, useCallback } from 'react';
import { InputFormClean } from './components/InputFormClean';
import { YearlyProjection } from './components/YearlyProjection';
import { Summary } from './components/Summary';
import { Chart } from './components/Chart';
import { Disclaimer, DisclaimerModal } from './components/Disclaimer';
import { ExportButton } from './components/ExportButton';
import { ShareButton } from './components/ShareButton';
import { ThemeToggle, useTheme } from './components/ThemeToggle';
import { LoadingSpinner, CardSkeleton } from './components/LoadingSpinner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { YearEndAlert } from './components/YearEndAlert';
import { HowItWorks } from './components/HowItWorks';
import type { ProjectionSummary, UserInputs } from './lib/types';
import { calculateProjection } from './lib/calculator';
import { getInputsFromUrl, generateShareUrl } from './lib/shareLink';
import { clearStoredInputs, getDefaultInputs } from './lib/localStorage';
import { PROVINCES, DEFAULT_PROVINCE } from './lib/tax/provinces';
import { getStartingYear } from './lib/tax/indexation';

type ViewMode = 'calculator' | 'scenarios';

const DISCLAIMER_ACCEPTED_KEY = 'ccpc-calculator-disclaimer-accepted';

function App() {
  const [results, setResults] = useState<ProjectionSummary | null>(null);
  const [currentInputs, setCurrentInputs] = useState<UserInputs | null>(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [initialInputs, setInitialInputs] = useState<UserInputs | null>(null);
  const [sharedLinkLoaded, setSharedLinkLoaded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calculator');
  const { theme, toggleTheme } = useTheme();
  const formRef = useRef<{ submit: () => void; reset: () => void } | null>(null);

  // Keyboard shortcuts
  const handleExport = useCallback(() => {
    if (results) {
      document.body.classList.add('printing');
      window.print();
      setTimeout(() => document.body.classList.remove('printing'), 1000);
    }
  }, [results]);

  const handleShare = useCallback(async () => {
    if (currentInputs) {
      const url = generateShareUrl(currentInputs);
      await navigator.clipboard.writeText(url);
    }
  }, [currentInputs]);

  const handleReset = useCallback(() => {
    clearStoredInputs();
    setInitialInputs(getDefaultInputs());
    setResults(null);
    setCurrentInputs(null);
  }, []);

  useKeyboardShortcuts({
    onCalculate: () => formRef.current?.submit(),
    onReset: handleReset,
    onExport: handleExport,
    onShare: handleShare,
    onToggleTheme: toggleTheme,
    onEscape: () => {
      setShowDisclaimerModal(false);
      setShowKeyboardHelp(false);
    },
  });

  useEffect(() => {
    // Check if user has already accepted the disclaimer
    const accepted = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    if (!accepted) {
      setShowDisclaimerModal(true);
    }

    // Check for shared link in URL
    const sharedInputs = getInputsFromUrl();
    if (sharedInputs) {
      setInitialInputs(sharedInputs);
      setSharedLinkLoaded(true);
      // Clear the URL parameter without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, 'true');
    setShowDisclaimerModal(false);
  };

  const handleCalculate = async (inputs: UserInputs) => {
    setIsCalculating(true);
    setResults(null); // Clear previous results to show loading state

    const projection = calculateProjection(inputs);
    setResults(projection);
    setCurrentInputs(inputs);
    setIsCalculating(false);
  };

  return (
    <div className="min-h-screen py-10">
      <div className="container">
        {/* Print Header (only shown when printing) */}
        <div className="print-header">
          <h1>CCPC Compensation Analysis Report</h1>
          <p>Generated on {new Date().toLocaleDateString('en-CA')} | {currentInputs ? PROVINCES[currentInputs.province].name : PROVINCES[DEFAULT_PROVINCE].name} Tax Year {currentInputs?.startingYear ?? getStartingYear()}/{(currentInputs?.startingYear ?? getStartingYear()) + 1}</p>
        </div>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
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
            <div className="no-print flex items-center gap-2">
              {/* Keyboard shortcuts help button */}
              <button
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                className="flex items-center justify-center w-10 h-10 rounded-lg transition-all"
                style={{
                  background: showKeyboardHelp ? 'var(--accent-primary-glow)' : 'var(--bg-elevated)',
                  border: `1px solid ${showKeyboardHelp ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  color: showKeyboardHelp ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                title="Keyboard shortcuts (?)"
                aria-label="Show keyboard shortcuts"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <ShareButton inputs={currentInputs} disabled={!results} />
              <ExportButton disabled={!results} />
            </div>
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="badge badge-success">
                {currentInputs ? PROVINCES[currentInputs.province].name : PROVINCES[DEFAULT_PROVINCE].name} {currentInputs?.startingYear ?? getStartingYear()}/{(currentInputs?.startingYear ?? getStartingYear()) + 1}
              </span>
              <span className="badge" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
                CPP2 + Provincial Taxes
              </span>
            </div>

            {/* Mode Switcher */}
            <div
              className="flex items-center p-1 rounded-lg"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
            >
              <button
                onClick={() => setViewMode('calculator')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'calculator' ? 'shadow-sm' : ''
                }`}
                style={{
                  background: viewMode === 'calculator' ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === 'calculator' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculator
              </button>
              <button
                onClick={() => setViewMode('scenarios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'scenarios' ? 'shadow-sm' : ''
                }`}
                style={{
                  background: viewMode === 'scenarios' ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === 'scenarios' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Scenarios
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                >
                  NEW
                </span>
              </button>
            </div>
          </div>

          {/* Keyboard shortcuts help panel */}
          {showKeyboardHelp && (
            <div className="mt-4 animate-scale-in">
              <KeyboardShortcutsHelp />
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {viewMode === 'calculator' ? (
            <>
              {/* Shared Link Notification */}
              {sharedLinkLoaded && (
                <div
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: 'var(--accent-primary-glow)',
                    border: '1px solid var(--accent-primary)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ color: 'var(--text-primary)' }}>
                      Loaded shared configuration. Click "Calculate" to see results.
                    </span>
                  </div>
                </div>
              )}

              {/* Year-End Planning Alert */}
              <YearEndAlert
                startingYear={currentInputs?.startingYear ?? getStartingYear()}
                province={currentInputs?.province ?? DEFAULT_PROVINCE}
              />

              {/* Input Form */}
              <section className="glass-card p-6">
                <InputFormClean onCalculate={handleCalculate} initialInputs={initialInputs} />
              </section>

              {/* How It Works - Educational Content */}
              <HowItWorks />

              {/* Loading State */}
              {isCalculating && (
                <div className="space-y-6 animate-fade-in">
                  <LoadingSpinner size="lg" text="Calculating optimal compensation..." />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              )}

              {/* Results */}
              {!isCalculating && results && currentInputs && (
                <div className="space-y-6">
                  <div className="animate-slide-up">
                    <Summary summary={results} inputs={currentInputs} />
                  </div>
                  <div className="animate-slide-up animate-delay-100">
                    <Chart results={results.yearlyResults} />
                  </div>
                  <div className="animate-slide-up animate-delay-200">
                    <YearlyProjection results={results.yearlyResults} />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Scenario Builder Mode */
            <div className="animate-fade-in">
              <ScenarioBuilder baseInputs={currentInputs || getDefaultInputs()} />
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <section className="mt-12">
          <Disclaimer variant="full" province={currentInputs?.province ?? DEFAULT_PROVINCE} />
        </section>

        {/* Footer */}
        <footer className="mt-8 pb-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            For informational purposes only. Consult a qualified tax professional for personalized advice.
          </p>
        </footer>
      </div>

      {/* Disclaimer Modal */}
      <DisclaimerModal
        isOpen={showDisclaimerModal}
        onAccept={handleAcceptDisclaimer}
      />
    </div>
  );
}

export default App;
