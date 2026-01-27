/**
 * ScenarioBuilder Component
 *
 * The main container for the "What If" scenario builder feature.
 * Allows creating, comparing, and managing multiple scenarios.
 * Includes Monte Carlo simulation for risk analysis.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioComparison } from './ScenarioComparison';
import { MonteCarloResultsComponent } from './MonteCarloResults';
import { ExportModal } from './ExportModal';
import {
  createScenario,
  duplicateScenario,
  compareScenarios,
  saveScenariosToStorage,
  loadScenariosFromStorage,
  getPresetScenarios,
  SCENARIO_COLORS,
  type Scenario,
} from '../lib/scenarios';
import type { UserInputs } from '../lib/types';
import { calculateProjection } from '../lib/calculator';
import { runMonteCarloSimulation, type MonteCarloResults, type MonteCarloConfig } from '../lib/monteCarlo';

interface ScenarioBuilderProps {
  baseInputs?: UserInputs;
}

type ScenarioTab = 'comparison' | 'monteCarlo';

export function ScenarioBuilder({ baseInputs }: ScenarioBuilderProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [calculatingIds, setCalculatingIds] = useState<Set<string>>(new Set());
  const [showPresets, setShowPresets] = useState(false);
  const [activeTab, setActiveTab] = useState<ScenarioTab>('comparison');

  // Monte Carlo state
  const [monteCarloResults, setMonteCarloResults] = useState<MonteCarloResults | null>(null);
  const [isRunningMonteCarlo, setIsRunningMonteCarlo] = useState(false);
  const [monteCarloConfig, setMonteCarloConfig] = useState<Partial<MonteCarloConfig>>({
    numSimulations: 1000,
    returnVolatility: 0.12,
  });

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Load scenarios from storage on mount
  useEffect(() => {
    const stored = loadScenariosFromStorage();
    if (stored && stored.length > 0) {
      setScenarios(stored);
      setSelectedScenarioId(stored[0].id);
    } else {
      // Create initial scenarios
      const initial = [
        createScenario('Current Strategy', baseInputs, SCENARIO_COLORS[0]),
        createScenario('Alternative', { ...baseInputs, salaryStrategy: 'dividends-only' }, SCENARIO_COLORS[1]),
      ];
      setScenarios(initial);
      setSelectedScenarioId(initial[0].id);
    }
  }, []);

  // Save scenarios when they change
  useEffect(() => {
    if (scenarios.length > 0) {
      saveScenariosToStorage(scenarios);
    }
  }, [scenarios]);

  // Get comparison results
  const { winner } = useMemo(() => compareScenarios(scenarios), [scenarios]);

  // Calculate a scenario
  const handleCalculate = useCallback(async (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    setCalculatingIds((prev) => new Set(prev).add(scenarioId));

    // Small delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const results = calculateProjection(scenario.inputs);
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === scenarioId
            ? { ...s, results, updatedAt: Date.now() }
            : s
        )
      );
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setCalculatingIds((prev) => {
        const next = new Set(prev);
        next.delete(scenarioId);
        return next;
      });
    }
  }, [scenarios]);

  // Calculate all scenarios
  const handleCalculateAll = useCallback(async () => {
    for (const scenario of scenarios) {
      if (!scenario.results) {
        await handleCalculate(scenario.id);
      }
    }
  }, [scenarios, handleCalculate]);

  // Update scenario inputs
  const handleUpdateScenario = useCallback((scenarioId: string, updates: Partial<UserInputs>) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, inputs: { ...s.inputs, ...updates }, results: null, updatedAt: Date.now() }
          : s
      )
    );
  }, []);

  // Rename scenario
  const handleRenameScenario = useCallback((scenarioId: string, name: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? { ...s, name, updatedAt: Date.now() }
          : s
      )
    );
  }, []);

  // Add new scenario
  const handleAddScenario = useCallback(() => {
    const usedColors = scenarios.map((s) => s.color);
    const availableColor = SCENARIO_COLORS.find((c) => !usedColors.includes(c)) || SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length];

    const newScenario = createScenario(
      `Scenario ${scenarios.length + 1}`,
      baseInputs,
      availableColor
    );
    setScenarios((prev) => [...prev, newScenario]);
    setSelectedScenarioId(newScenario.id);
  }, [scenarios, baseInputs]);

  // Add preset scenario
  const handleAddPreset = useCallback((preset: ReturnType<typeof getPresetScenarios>[0]) => {
    const usedColors = scenarios.map((s) => s.color);
    const availableColor = SCENARIO_COLORS.find((c) => !usedColors.includes(c)) || SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length];

    const newScenario = createScenario(
      preset.name,
      { ...baseInputs, ...preset.inputs },
      availableColor
    );
    newScenario.description = preset.description;
    setScenarios((prev) => [...prev, newScenario]);
    setSelectedScenarioId(newScenario.id);
    setShowPresets(false);
  }, [scenarios, baseInputs]);

  // Duplicate scenario
  const handleDuplicateScenario = useCallback((scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    const usedColors = scenarios.map((s) => s.color);
    const availableColor = SCENARIO_COLORS.find((c) => !usedColors.includes(c)) || SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length];

    const duplicated = duplicateScenario(scenario, undefined, availableColor);
    setScenarios((prev) => [...prev, duplicated]);
    setSelectedScenarioId(duplicated.id);
  }, [scenarios]);

  // Delete scenario
  const handleDeleteScenario = useCallback((scenarioId: string) => {
    if (scenarios.length <= 1) return; // Keep at least one

    setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
    if (selectedScenarioId === scenarioId) {
      setSelectedScenarioId(scenarios.find((s) => s.id !== scenarioId)?.id || null);
    }
  }, [scenarios, selectedScenarioId]);

  // Get winner type for a scenario
  const getWinnerType = (scenarioId: string): 'tax' | 'balance' | 'overall' | null => {
    if (winner.bestOverall === scenarioId) return 'overall';
    if (winner.lowestTax === scenarioId) return 'tax';
    if (winner.highestBalance === scenarioId) return 'balance';
    return null;
  };

  // Run Monte Carlo simulation on selected scenario
  const handleRunMonteCarlo = useCallback(async () => {
    const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);
    if (!selectedScenario) return;

    setIsRunningMonteCarlo(true);

    // Small delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const results = runMonteCarloSimulation(selectedScenario.inputs, monteCarloConfig);
      setMonteCarloResults(results);
    } catch (error) {
      console.error('Monte Carlo simulation failed:', error);
    } finally {
      setIsRunningMonteCarlo(false);
    }
  }, [scenarios, selectedScenarioId, monteCarloConfig]);

  // Clear Monte Carlo results when selected scenario changes
  useEffect(() => {
    setMonteCarloResults(null);
  }, [selectedScenarioId]);

  const presets = getPresetScenarios();
  const calculatedCount = scenarios.filter((s) => s.results !== null).length;
  const hasUncalculated = calculatedCount < scenarios.length;
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="p-5 rounded-xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2
              className="text-xl font-bold flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>🧪</span>
              Scenario Builder
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Compare different strategies side-by-side to find your optimal approach.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export Button */}
            {selectedScenario?.results && (
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
            )}

            {/* Calculate All Button */}
            {hasUncalculated && (
              <button
                onClick={handleCalculateAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculate All ({scenarios.length - calculatedCount})
              </button>
            )}

            {/* Add Preset Button */}
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Presets
                <svg className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Presets Dropdown */}
              {showPresets && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl z-50 animate-scale-in"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="p-2">
                    {presets.map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => handleAddPreset(preset)}
                        className="w-full text-left p-3 rounded-lg transition-colors hover:bg-black/5"
                      >
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {preset.name}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {preset.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add Custom Button */}
            <button
              onClick={handleAddScenario}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Scenario
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="flex items-center gap-6 mt-4 pt-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-primary-glow)' }}
            >
              <span className="text-sm">📊</span>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Scenarios</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {scenarios.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16, 185, 129, 0.1)' }}
            >
              <span className="text-sm">✓</span>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Calculated</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {calculatedCount}/{scenarios.length}
              </div>
            </div>
          </div>
          {winner.bestOverall && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm">🏆</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Best: {scenarios.find(s => s.id === winner.bestOverall)?.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isWinner={getWinnerType(scenario.id)}
            isSelected={selectedScenarioId === scenario.id}
            isCalculating={calculatingIds.has(scenario.id)}
            onSelect={() => setSelectedScenarioId(scenario.id)}
            onUpdate={(updates) => handleUpdateScenario(scenario.id, updates)}
            onDuplicate={() => handleDuplicateScenario(scenario.id)}
            onDelete={() => handleDeleteScenario(scenario.id)}
            onCalculate={() => handleCalculate(scenario.id)}
            onRename={(name) => handleRenameScenario(scenario.id, name)}
          />
        ))}
      </div>

      {/* Tab Navigation */}
      <div
        className="flex items-center gap-4 p-1 rounded-lg w-fit"
        style={{ background: 'var(--bg-base)' }}
      >
        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'comparison' ? 'shadow-md' : ''
          }`}
          style={{
            background: activeTab === 'comparison' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'comparison' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <span>📊</span>
          Comparison
        </button>
        <button
          onClick={() => setActiveTab('monteCarlo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'monteCarlo' ? 'shadow-md' : ''
          }`}
          style={{
            background: activeTab === 'monteCarlo' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'monteCarlo' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <span>🎲</span>
          Monte Carlo
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'comparison' ? (
        <ScenarioComparison scenarios={scenarios} />
      ) : (
        <div className="space-y-4">
          {/* Monte Carlo Config */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Simulation Settings
                </h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Running on: <span style={{ color: scenarios.find(s => s.id === selectedScenarioId)?.color }}>
                    {scenarios.find(s => s.id === selectedScenarioId)?.name || 'Select a scenario'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Number of Simulations */}
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Simulations
                  </label>
                  <select
                    value={monteCarloConfig.numSimulations}
                    onChange={(e) => setMonteCarloConfig((prev) => ({
                      ...prev,
                      numSimulations: parseInt(e.target.value),
                    }))}
                    className="block mt-1 text-xs py-1.5 px-2 rounded-lg"
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value={100}>100 (Fast)</option>
                    <option value={500}>500</option>
                    <option value={1000}>1,000</option>
                    <option value={5000}>5,000 (Detailed)</option>
                    <option value={10000}>10,000 (Very Detailed)</option>
                  </select>
                </div>

                {/* Volatility */}
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Return Volatility
                  </label>
                  <select
                    value={monteCarloConfig.returnVolatility}
                    onChange={(e) => setMonteCarloConfig((prev) => ({
                      ...prev,
                      returnVolatility: parseFloat(e.target.value),
                    }))}
                    className="block mt-1 text-xs py-1.5 px-2 rounded-lg"
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value={0.05}>5% (Conservative)</option>
                    <option value={0.08}>8% (Low)</option>
                    <option value={0.12}>12% (Balanced)</option>
                    <option value={0.16}>16% (Growth)</option>
                    <option value={0.20}>20% (Aggressive)</option>
                  </select>
                </div>

                {/* Run Button */}
                <button
                  onClick={handleRunMonteCarlo}
                  disabled={isRunningMonteCarlo || !selectedScenarioId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md disabled:opacity-50"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  {isRunningMonteCarlo ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run Simulation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Monte Carlo Results */}
          <MonteCarloResultsComponent
            results={monteCarloResults}
            isLoading={isRunningMonteCarlo}
            onRunSimulation={handleRunMonteCarlo}
          />
        </div>
      )}

      {/* Click outside to close presets */}
      {showPresets && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPresets(false)}
        />
      )}

      {/* Export Modal */}
      {selectedScenario?.results && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          results={selectedScenario.results}
          inputs={selectedScenario.inputs}
          scenarioName={selectedScenario.name}
        />
      )}
    </div>
  );
}

export default ScenarioBuilder;
