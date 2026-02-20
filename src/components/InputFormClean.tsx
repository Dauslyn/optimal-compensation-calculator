import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import type { UserInputs, PaymentFrequency } from '../lib/types';
import { PAYMENT_FREQUENCY_MULTIPLIERS } from '../lib/types';
import type { ProvinceCode } from '../lib/tax/provinces';

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  'semi-monthly': 'Semi-monthly (2×/month)',
  monthly: 'Monthly',
  annually: 'Annually',
};

function makeDebtId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString();
}
import { PROVINCES } from '../lib/tax/provinces';
import { getDefaultInflationRate } from '../lib/tax/indexation';
import { getContributionLimitsForYear } from '../lib/tax/constants';
import { validateInputs } from '../lib/validation';
import { InfoLabel, Tooltip, INPUT_TOOLTIPS } from './Tooltip';
import { saveInputsToStorage, loadInputsFromStorage, getDefaultInputs, clearStoredInputs } from '../lib/localStorage';
import { computeBlendedReturnRate, ASSET_CLASS_DEFAULT_RETURNS } from '../lib/accounts/investmentReturns';
import {
  estimateCurrentTargetLiability,
  calculateFundingStatus,
  calculateProjectedPension,
  estimateTerminalFunding,
} from '../lib/tax/ipp';

interface InputFormProps {
  onCalculate: (inputs: UserInputs) => void;
  initialInputs?: UserInputs | null;
}

// InputField component moved OUTSIDE the main component to prevent re-creation on render
interface InputFieldProps {
  label: string;
  id: string;
  value: number | string;
  onChange: (value: string) => void;
  suffix?: string;
  prefix?: string;
  placeholder?: string;
  step?: string;
  hint?: string;
  tooltip?: string;
}

// Format a number to a clean display string (avoids floating point artifacts)
function formatDisplayValue(val: number | string): string {
  if (val === '' || val === undefined || val === null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  if (num === 0) return '';
  // Use toPrecision to strip floating-point noise, then remove trailing zeros
  return parseFloat(num.toPrecision(12)).toString();
}

const InputField = memo(function InputField({
  label,
  id,
  value,
  onChange,
  suffix,
  prefix,
  placeholder,
  step = "1",
  hint,
  tooltip,
}: InputFieldProps) {
  // Local string state so the user has full text-editing control (delete, select+type, etc.)
  const [localValue, setLocalValue] = useState(() => formatDisplayValue(value));
  const isFocused = useRef(false);

  // Sync from parent when not focused (e.g., reset, share link load)
  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(formatDisplayValue(value));
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, digits, one decimal point, and leading minus
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.' || /^-?\d*\.?\d*$/.test(raw)) {
      setLocalValue(raw);
      onChange(raw);
    }
  }, [onChange]);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    // Clean up display on blur (e.g., "7." → "7", "" → "")
    setLocalValue(formatDisplayValue(localValue));
  }, [localValue]);

  return (
    <div>
      {tooltip ? (
        <InfoLabel label={label} tooltip={tooltip} htmlFor={id} />
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={prefix ? { paddingLeft: '28px' } : undefined}
        />
        {suffix && (
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>{hint}</p>}
    </div>
  );
});

// Inline percentage input that stores as decimal (e.g., 0.07) but displays as percentage (7)
// Manages its own local string state to avoid floating-point display artifacts
interface PercentInputProps {
  id: string;
  decimalValue: number;
  onDecimalChange: (decimal: number) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}

function PercentInput({ id, decimalValue, onDecimalChange, placeholder, step, min, max }: PercentInputProps) {
  const [localValue, setLocalValue] = useState(() => {
    if (!decimalValue) return '';
    return formatDisplayValue(parseFloat((decimalValue * 100).toPrecision(12)));
  });
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      if (!decimalValue) {
        setLocalValue('');
      } else {
        setLocalValue(formatDisplayValue(parseFloat((decimalValue * 100).toPrecision(12))));
      }
    }
  }, [decimalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '.' || /^-?\d*\.?\d*$/.test(raw)) {
      setLocalValue(raw);
      if (raw === '' || raw === '.') {
        onDecimalChange(0);
      } else {
        onDecimalChange(parseFloat(raw) / 100);
      }
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onFocus={() => { isFocused.current = true; }}
      onBlur={() => {
        isFocused.current = false;
        setLocalValue(formatDisplayValue(localValue));
      }}
      placeholder={placeholder}
    />
  );
}

// Initialize form data: shared link > localStorage > defaults
const getInitialFormData = (initialInputs?: UserInputs | null): UserInputs => {
  // Priority: shared link inputs > localStorage > defaults
  if (initialInputs) {
    return initialInputs;
  }

  const storedInputs = loadInputsFromStorage();
  if (storedInputs) {
    return storedInputs;
  }

  return getDefaultInputs();
};

export function InputFormClean({ onCalculate, initialInputs }: InputFormProps) {
  const [formData, setFormData] = useState<UserInputs>(() => getInitialFormData(initialInputs));
  const isFirstRender = useRef(true);

  // Update form data when initialInputs changes (e.g., from shared link)
  useEffect(() => {
    if (initialInputs) {
      setFormData(initialInputs);
    }
  }, [initialInputs]);

  // Auto-save to localStorage when form data changes (debounced)
  useEffect(() => {
    // Skip saving on first render (already loaded from storage)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      saveInputsToStorage(formData);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    portfolio: true,
    balances: true,
    inflation: false,
    strategy: false,
    debt: false,
    ipp: false,
    spouse: false,
  });

  const [advancedOpen, setAdvancedOpen] = useState<Record<string, boolean>>({
    basic: false,
    accounts: false,
    portfolio: false,
    strategy: false,
  });

  const toggleAdvanced = (section: string) =>
    setAdvancedOpen(prev => ({ ...prev, [section]: !prev[section] }));

  // Keep investmentReturnRate in sync with allocation and per-class return overrides
  useEffect(() => {
    const blended = computeBlendedReturnRate(
      formData.canadianEquityPercent,
      formData.usEquityPercent,
      formData.internationalEquityPercent,
      formData.fixedIncomePercent,
      formData.canadianEquityReturnRate,
      formData.usEquityReturnRate,
      formData.internationalEquityReturnRate,
      formData.fixedIncomeReturnRate,
    );
    if (Math.abs(blended - formData.investmentReturnRate) > 0.0005) {
      setFormData(prev => ({ ...prev, investmentReturnRate: blended }));
    }
  }, [
    formData.canadianEquityPercent,
    formData.usEquityPercent,
    formData.internationalEquityPercent,
    formData.fixedIncomePercent,
    formData.canadianEquityReturnRate,
    formData.usEquityReturnRate,
    formData.internationalEquityReturnRate,
    formData.fixedIncomeReturnRate,
  ]);

  // Validation
  const validationErrors = useMemo(() => validateInputs(formData), [formData]);
  const isFormValid = validationErrors.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onCalculate(formData);
    }
  };

  const handleNumberChange = (field: keyof UserInputs, value: string) => {
    const parsed = parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Section header component with clear visual affordance
  const SectionHeader = ({
    title,
    section,
    description
  }: {
    title: string;
    section: keyof typeof expandedSections;
    description?: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-3 group hover:opacity-80 transition-opacity"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: expandedSections[section]
              ? 'var(--accent-primary)'
              : 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expandedSections[section] ? 'rotate-180' : ''}`}
            style={{ color: expandedSections[section] ? 'white' : 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="text-left">
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          )}
        </div>
      </div>
      <span
        className="text-xs font-medium px-2 py-1 rounded"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-muted)'
        }}
      >
        {expandedSections[section] ? 'Collapse' : 'Expand'}
      </span>
    </button>
  );

  // Per-section advanced toggle button
  const AdvancedToggle = ({ section }: { section: string }) => (
    <button
      type="button"
      onClick={() => toggleAdvanced(section)}
      className="flex items-center gap-1.5 text-xs mt-3 px-2 py-1 rounded"
      style={{
        color: advancedOpen[section] ? 'var(--text-primary)' : 'var(--text-muted)',
        background: advancedOpen[section] ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <svg
        className={`w-3 h-3 transition-transform duration-150 ${advancedOpen[section] ? 'rotate-180' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      {advancedOpen[section] ? 'Hide advanced' : 'Advanced settings'}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Basic Information */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Basic Information"
          section="basic"
          description="Income, assets, and lifetime planning parameters"
        />

        {expandedSections.basic && (
          <div className="pt-4 mt-2 animate-fade-in space-y-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Quick fields: Province, Income, Corp Balance, Corp Net Income */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <InfoLabel label="Province" tooltip={INPUT_TOOLTIPS.province} htmlFor="province" />
                <select
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value as ProvinceCode })}
                >
                  {Object.values(PROVINCES).map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>Tax jurisdiction</p>
              </div>
              <InputField
                label="Required After-Tax Income"
                id="requiredIncome"
                value={formData.requiredIncome}
                onChange={(v) => handleNumberChange('requiredIncome', v)}
                prefix="$"
                placeholder="100,000"
                step="5000"
                hint="Annual amount you need to live on"
                tooltip={INPUT_TOOLTIPS.requiredIncome}
              />
              <InputField
                label="Corporate Investment Balance"
                id="corpBalance"
                value={formData.corporateInvestmentBalance}
                onChange={(v) => handleNumberChange('corporateInvestmentBalance', v)}
                prefix="$"
                step="10000"
                hint="Current corporate investment account"
                tooltip={INPUT_TOOLTIPS.corporateInvestmentBalance}
              />
              <InputField
                label="Annual Corporate Net Income"
                id="netIncome"
                value={formData.annualCorporateRetainedEarnings}
                onChange={(v) => handleNumberChange('annualCorporateRetainedEarnings', v)}
                prefix="$"
                step="5000"
                hint="Before owner compensation"
                tooltip={INPUT_TOOLTIPS.annualCorporateRetainedEarnings}
              />
            </div>

            {/* Quick fields: Current Age, Retirement Age */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField
                label="Current Age"
                id="currentAge"
                value={formData.currentAge ?? 45}
                onChange={(v) => {
                  const age = parseInt(v) || 45;
                  const endAge = formData.planningEndAge ?? 90;
                  setFormData({ ...formData, currentAge: age, planningHorizon: Math.max(1, endAge - age) });
                }}
                hint="Your age today"
                tooltip={INPUT_TOOLTIPS.currentAge}
              />
              <InputField
                label="Retirement Age"
                id="retirementAge"
                value={formData.retirementAge ?? 65}
                onChange={(v) => {
                  const retAge = parseInt(v) || 65;
                  setFormData({ ...formData, retirementAge: retAge });
                }}
                hint="When you stop working"
                tooltip={INPUT_TOOLTIPS.retirementAge}
              />
            </div>

            <AdvancedToggle section="basic" />

            {advancedOpen.basic && (
              <div className="space-y-5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Planning end age + Starting year */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <InputField
                    label="Planning End Age"
                    id="planningEndAge"
                    value={formData.planningEndAge ?? 90}
                    onChange={(v) => {
                      const endAge = parseInt(v) || 90;
                      const curAge = formData.currentAge ?? 45;
                      setFormData({ ...formData, planningEndAge: endAge, planningHorizon: Math.max(1, endAge - curAge) });
                    }}
                    hint="Project through this age"
                    tooltip={INPUT_TOOLTIPS.planningEndAge}
                  />
                  <div>
                    <InfoLabel label="Starting Year" tooltip={INPUT_TOOLTIPS.startingYear} htmlFor="startingYear" />
                    <select
                      id="startingYear"
                      value={formData.startingYear}
                      onChange={(e) => setFormData({ ...formData, startingYear: parseInt(e.target.value) })}
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>First year of projection</p>
                  </div>
                  <div>
                    <InfoLabel label="Expected Inflation Rate" tooltip={INPUT_TOOLTIPS.inflationRate} htmlFor="inflationRate" />
                    <div className="relative">
                      <PercentInput
                        id="inflationRate"
                        decimalValue={formData.expectedInflationRate}
                        onDecimalChange={(v) => setFormData({ ...formData, expectedInflationRate: v })}
                        placeholder="2.0"
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        %
                      </span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>CRA default: {(getDefaultInflationRate() * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {/* Inflate spending + Retirement spending + Lifetime objective */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex items-center">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.inflateSpendingNeeds}
                        onChange={(e) => setFormData({ ...formData, inflateSpendingNeeds: e.target.checked })}
                      />
                      <div>
                        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Inflate Spending Needs
                          <Tooltip content={INPUT_TOOLTIPS.inflateSpendingNeeds} />
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Increase income requirement each year</p>
                      </div>
                    </label>
                  </div>
                  <InputField
                    label="Retirement Spending"
                    id="retirementSpending"
                    value={formData.retirementSpending ?? 70000}
                    onChange={(v) => handleNumberChange('retirementSpending', v)}
                    prefix="$"
                    hint="Target annual spending (today's $)"
                    tooltip={INPUT_TOOLTIPS.retirementSpending}
                  />
                  <div>
                    <InfoLabel label="Lifetime Objective" tooltip={INPUT_TOOLTIPS.lifetimeObjective} htmlFor="lifetimeObjective" />
                    <select
                      id="lifetimeObjective"
                      value={formData.lifetimeObjective ?? 'balanced'}
                      onChange={(e) => setFormData({ ...formData, lifetimeObjective: e.target.value as 'maximize-spending' | 'maximize-estate' | 'balanced' })}
                    >
                      <option value="maximize-spending">Maximize Spending</option>
                      <option value="maximize-estate">Maximize Estate</option>
                      <option value="balanced">Balanced (60/40)</option>
                    </select>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>Strategy winner criteria</p>
                  </div>
                </div>

                {/* Computed planning horizon info */}
                <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                  Planning: age {formData.currentAge ?? 45} → {formData.planningEndAge ?? 90} ({(formData.planningEndAge ?? 90) - (formData.currentAge ?? 45)} years: {Math.max(0, (formData.retirementAge ?? 65) - (formData.currentAge ?? 45))} accumulation + {Math.max(0, (formData.planningEndAge ?? 90) - (formData.retirementAge ?? 65))} retirement)
                </p>

                {/* CPP / OAS / Historical Salary */}
                <div className="space-y-4">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>CPP, OAS &amp; Retirement Income</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <InputField
                      label="CPP Start Age"
                      id="cppStartAge"
                      value={formData.cppStartAge ?? 65}
                      onChange={(v) => handleNumberChange('cppStartAge', v)}
                      hint="60 = -36%, 65 = standard, 70 = +42%"
                      tooltip={INPUT_TOOLTIPS.cppStartAge}
                    />
                    <InputField
                      label="Age Started Earning"
                      id="salaryStartAge"
                      value={formData.salaryStartAge ?? 22}
                      onChange={(v) => handleNumberChange('salaryStartAge', v)}
                      hint="For CPP contributory history"
                      tooltip={INPUT_TOOLTIPS.salaryStartAge}
                    />
                    <InputField
                      label="Avg. Historical Salary"
                      id="averageHistoricalSalary"
                      value={formData.averageHistoricalSalary ?? 60000}
                      onChange={(v) => handleNumberChange('averageHistoricalSalary', v)}
                      prefix="$"
                      hint="Pre-projection employment income"
                      tooltip={INPUT_TOOLTIPS.averageHistoricalSalary}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={formData.oasEligible ?? true}
                          onChange={(e) => setFormData({ ...formData, oasEligible: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        <span>
                          OAS Eligible
                          <Tooltip content={INPUT_TOOLTIPS.oasEligible} />
                        </span>
                      </label>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>10+ years Canadian residency</p>
                    </div>
                    <InputField
                      label="OAS Start Age"
                      id="oasStartAge"
                      value={formData.oasStartAge ?? 65}
                      onChange={(v) => handleNumberChange('oasStartAge', v)}
                      hint="65-70 (0.6%/mo deferral bonus)"
                      tooltip={INPUT_TOOLTIPS.oasStartAge}
                    />
                  </div>
                </div>

                {/* RRSP / TFSA balances */}
                <div className="space-y-4">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Registered Account Balances</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <InputField
                      label="Available RRSP Room"
                      id="rrsp"
                      value={formData.rrspBalance}
                      onChange={(v) => handleNumberChange('rrspBalance', v)}
                      prefix="$"
                      hint="From CRA My Account or NOA"
                      tooltip={INPUT_TOOLTIPS.rrspRoom}
                    />
                    <InputField
                      label="Actual RRSP Balance"
                      id="actualRRSPBalance"
                      value={formData.actualRRSPBalance ?? 0}
                      onChange={(v) => handleNumberChange('actualRRSPBalance', v)}
                      prefix="$"
                      hint="Current market value"
                      tooltip={INPUT_TOOLTIPS.actualRRSPBalance}
                    />
                    <InputField
                      label="Available TFSA Room"
                      id="tfsa"
                      value={formData.tfsaBalance}
                      onChange={(v) => handleNumberChange('tfsaBalance', v)}
                      prefix="$"
                      hint="From CRA My Account"
                      tooltip={INPUT_TOOLTIPS.tfsaRoom}
                    />
                    <InputField
                      label="Actual TFSA Balance"
                      id="actualTFSABalance"
                      value={formData.actualTFSABalance ?? 0}
                      onChange={(v) => handleNumberChange('actualTFSABalance', v)}
                      prefix="$"
                      hint="Current market value"
                      tooltip={INPUT_TOOLTIPS.actualTFSABalance}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inflation & Indexing — collapsed by default, fields kept for completeness */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Inflation & Indexing"
          section="inflation"
          description="Bracket indexation details (already included in Basic advanced settings)"
        />

        {expandedSections.inflation && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div
              className="p-3 rounded-lg text-xs"
              style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}
            >
              Tax brackets, CPP/EI limits, and contribution limits are automatically indexed using CRA values for 2025-2026, then projected forward using your expected inflation rate (set in Basic → Advanced settings above).
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Composition */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Portfolio Composition"
          section="portfolio"
          description="Asset allocation affects tax treatment of returns"
        />

        {expandedSections.portfolio && (
          <div className="pt-4 mt-2 animate-fade-in space-y-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Quick: 4 allocation sliders */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputField
                label="Canadian Equity"
                id="canadianEquity"
                value={formData.canadianEquityPercent}
                onChange={(v) => handleNumberChange('canadianEquityPercent', v)}
                suffix="%"
                step="1"
                hint="Earns eligible dividends"
                tooltip={INPUT_TOOLTIPS.canadianEquity}
              />
              <InputField
                label="US Equity"
                id="usEquity"
                value={formData.usEquityPercent}
                onChange={(v) => handleNumberChange('usEquityPercent', v)}
                suffix="%"
                step="1"
                hint="Foreign income + gains"
                tooltip={INPUT_TOOLTIPS.usEquity}
              />
              <InputField
                label="International Equity"
                id="intlEquity"
                value={formData.internationalEquityPercent}
                onChange={(v) => handleNumberChange('internationalEquityPercent', v)}
                suffix="%"
                step="1"
                hint="Foreign income + gains"
                tooltip={INPUT_TOOLTIPS.internationalEquity}
              />
              <InputField
                label="Fixed Income"
                id="fixedIncome"
                value={formData.fixedIncomePercent}
                onChange={(v) => handleNumberChange('fixedIncomePercent', v)}
                suffix="%"
                step="1"
                hint="Interest income (fully taxable)"
                tooltip={INPUT_TOOLTIPS.fixedIncome}
              />
            </div>

            {/* Computed blended return — read-only */}
            <div className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
              Blended expected return:{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                {(computeBlendedReturnRate(
                  formData.canadianEquityPercent,
                  formData.usEquityPercent,
                  formData.internationalEquityPercent,
                  formData.fixedIncomePercent,
                  formData.canadianEquityReturnRate,
                  formData.usEquityReturnRate,
                  formData.internationalEquityReturnRate,
                  formData.fixedIncomeReturnRate,
                ) * 100).toFixed(1)}%/yr
              </span>
              {' '}(weighted average of asset class defaults)
            </div>

            <AdvancedToggle section="portfolio" />

            {advancedOpen.portfolio && (
              <div className="space-y-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Override per-class expected returns. Defaults: CA {(ASSET_CLASS_DEFAULT_RETURNS.canadianEquity * 100).toFixed(1)}%, US {(ASSET_CLASS_DEFAULT_RETURNS.usEquity * 100).toFixed(1)}%, Intl {(ASSET_CLASS_DEFAULT_RETURNS.internationalEquity * 100).toFixed(1)}%, Fixed {(ASSET_CLASS_DEFAULT_RETURNS.fixedIncome * 100).toFixed(1)}%.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="caReturnRate" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>CA Return Rate</label>
                    <div className="relative mt-1.5">
                      <PercentInput
                        id="caReturnRate"
                        decimalValue={formData.canadianEquityReturnRate ?? ASSET_CLASS_DEFAULT_RETURNS.canadianEquity}
                        onDecimalChange={(v) => setFormData({ ...formData, canadianEquityReturnRate: v })}
                        placeholder={(ASSET_CLASS_DEFAULT_RETURNS.canadianEquity * 100).toFixed(1)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="usReturnRate" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>US Return Rate</label>
                    <div className="relative mt-1.5">
                      <PercentInput
                        id="usReturnRate"
                        decimalValue={formData.usEquityReturnRate ?? ASSET_CLASS_DEFAULT_RETURNS.usEquity}
                        onDecimalChange={(v) => setFormData({ ...formData, usEquityReturnRate: v })}
                        placeholder={(ASSET_CLASS_DEFAULT_RETURNS.usEquity * 100).toFixed(1)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="intlReturnRate" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Intl Return Rate</label>
                    <div className="relative mt-1.5">
                      <PercentInput
                        id="intlReturnRate"
                        decimalValue={formData.internationalEquityReturnRate ?? ASSET_CLASS_DEFAULT_RETURNS.internationalEquity}
                        onDecimalChange={(v) => setFormData({ ...formData, internationalEquityReturnRate: v })}
                        placeholder={(ASSET_CLASS_DEFAULT_RETURNS.internationalEquity * 100).toFixed(1)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fiReturnRate" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Fixed Income Rate</label>
                    <div className="relative mt-1.5">
                      <PercentInput
                        id="fiReturnRate"
                        decimalValue={formData.fixedIncomeReturnRate ?? ASSET_CLASS_DEFAULT_RETURNS.fixedIncome}
                        onDecimalChange={(v) => setFormData({ ...formData, fixedIncomeReturnRate: v })}
                        placeholder={(ASSET_CLASS_DEFAULT_RETURNS.fixedIncome * 100).toFixed(1)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notional Account Balances */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Notional Account Balances"
          section="balances"
          description="CDA, RDTOH, GRIP - from your T2 return"
        />

        {expandedSections.balances && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Quick: brief note */}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Leave at zero if unknown — defaults are conservative. Enter values from your T2 return for more accurate results.
            </p>

            <AdvancedToggle section="accounts" />

            {advancedOpen.accounts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <InputField
                  label="CDA Balance"
                  id="cda"
                  value={formData.cdaBalance}
                  onChange={(v) => handleNumberChange('cdaBalance', v)}
                  prefix="$"
                  hint="From your T2 Schedule 89"
                  tooltip={INPUT_TOOLTIPS.cdaBalance}
                />
                <InputField
                  label="GRIP Balance"
                  id="grip"
                  value={formData.gripBalance}
                  onChange={(v) => handleNumberChange('gripBalance', v)}
                  prefix="$"
                  hint="From your T2 Schedule 53"
                  tooltip={INPUT_TOOLTIPS.gripBalance}
                />
                <InputField
                  label="eRDTOH Balance"
                  id="erdtoh"
                  value={formData.eRDTOHBalance}
                  onChange={(v) => handleNumberChange('eRDTOHBalance', v)}
                  prefix="$"
                  hint="From your T2 Schedule 3"
                  tooltip={INPUT_TOOLTIPS.erdtohBalance}
                />
                <InputField
                  label="nRDTOH Balance"
                  id="nrdtoh"
                  value={formData.nRDTOHBalance}
                  onChange={(v) => handleNumberChange('nRDTOHBalance', v)}
                  prefix="$"
                  hint="From your T2 Schedule 3"
                  tooltip={INPUT_TOOLTIPS.nrdtohBalance}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Strategy & Options */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Compensation Strategy"
          section="strategy"
          description="How to fund your income requirements"
        />

        {expandedSections.strategy && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Quick: default note */}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Default: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Dynamic Optimizer</span> — optimizes salary/dividend mix each year to minimize tax while meeting your income target.
            </p>

            <AdvancedToggle section="strategy" />

            {advancedOpen.strategy && (
              <div className="space-y-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <InfoLabel label="Salary Strategy" tooltip={INPUT_TOOLTIPS.salaryStrategy} htmlFor="salaryStrategy" />
                  <select
                    id="salaryStrategy"
                    value={formData.salaryStrategy}
                    onChange={(e) => setFormData({ ...formData, salaryStrategy: e.target.value as UserInputs['salaryStrategy'] })}
                  >
                    <option value="dynamic">Dynamic (Optimize Automatically)</option>
                    <option value="fixed">Fixed Salary Amount</option>
                    <option value="dividends-only">Dividends Only (No Salary)</option>
                  </select>
                </div>

                {formData.salaryStrategy === 'fixed' && (
                  <InputField
                    label="Fixed Salary Amount"
                    id="fixedSalary"
                    value={formData.fixedSalaryAmount || 0}
                    onChange={(v) => handleNumberChange('fixedSalaryAmount', v)}
                    prefix="$"
                    hint="Annual salary to pay yourself"
                    tooltip={INPUT_TOOLTIPS.fixedSalaryAmount}
                  />
                )}

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.maximizeTFSA}
                      onChange={(e) => setFormData({ ...formData, maximizeTFSA: e.target.checked })}
                    />
                    <div>
                      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Maximize TFSA
                        <Tooltip content={INPUT_TOOLTIPS.maximizeTFSA} />
                      </span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Contribute ${getContributionLimitsForYear(formData.startingYear).tfsaLimit.toLocaleString('en-CA')}/year</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.contributeToRRSP}
                      onChange={(e) => setFormData({ ...formData, contributeToRRSP: e.target.checked })}
                    />
                    <div>
                      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Contribute to RRSP
                        <Tooltip content={INPUT_TOOLTIPS.contributeToRRSP} />
                      </span>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use available room</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debt Options */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Debt Management"
          section="debt"
          description={
            formData.debts && formData.debts.length > 0
              ? `${formData.debts.length} debt${formData.debts.length > 1 ? 's' : ''} — $${Math.round(
                  formData.debts.reduce((s, d) => s + d.paymentAmount * PAYMENT_FREQUENCY_MULTIPLIERS[d.paymentFrequency], 0)
                ).toLocaleString()}/yr in payments`
              : 'Add debts to model paydown in your plan'
          }
        />

        {expandedSections.debt && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Debt rows */}
            {(formData.debts ?? []).map((debt, idx) => (
              <div key={debt.id} className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Debt {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, debts: (formData.debts ?? []).filter(d => d.id !== debt.id) })
                    }
                    className="text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--text-dim)', background: 'var(--bg-elevated)' }}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
                    <input
                      type="text"
                      value={debt.label}
                      onChange={e => setFormData({ ...formData, debts: (formData.debts ?? []).map(d => d.id === debt.id ? { ...d, label: e.target.value } : d) })}
                      placeholder="e.g. Mortgage, Clinic LOC"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Outstanding Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-dim)' }}>$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={debt.balance === 0 ? '' : debt.balance}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setFormData({ ...formData, debts: (formData.debts ?? []).map(d => d.id === debt.id ? { ...d, balance: isNaN(v) ? 0 : v } : d) });
                        }}
                        placeholder="450000"
                        className="w-full pl-7 pr-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Payment Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-dim)' }}>$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={debt.paymentAmount === 0 ? '' : debt.paymentAmount}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setFormData({ ...formData, debts: (formData.debts ?? []).map(d => d.id === debt.id ? { ...d, paymentAmount: isNaN(v) ? 0 : v } : d) });
                        }}
                        placeholder="2800"
                        className="w-full pl-7 pr-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Frequency</label>
                    <select
                      value={debt.paymentFrequency}
                      onChange={e => setFormData({ ...formData, debts: (formData.debts ?? []).map(d => d.id === debt.id ? { ...d, paymentFrequency: e.target.value as PaymentFrequency } : d) })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >
                      {(Object.keys(FREQUENCY_LABELS) as PaymentFrequency[]).map(f => (
                        <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Interest Rate</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={debt.interestRate === 0 ? '' : (debt.interestRate * 100).toPrecision(4).replace(/\.?0+$/, '')}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setFormData({ ...formData, debts: (formData.debts ?? []).map(d => d.id === debt.id ? { ...d, interestRate: isNaN(v) ? 0 : v / 100 } : d) });
                        }}
                        placeholder="5.5"
                        className="w-full pr-8 pl-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-dim)' }}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add debt button */}
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  debts: [
                    ...(formData.debts ?? []),
                    {
                      id: makeDebtId(),
                      label: '',
                      balance: 0,
                      paymentAmount: 0,
                      paymentFrequency: 'monthly' as PaymentFrequency,
                      interestRate: 0.055,
                    },
                  ],
                })
              }
              className="w-full py-2 rounded-lg text-sm font-medium border-dashed border-2 transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'transparent' }}
            >
              + Add a debt
            </button>
          </div>
        )}
      </div>

      {/* IPP (Individual Pension Plan) */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="IPP Analysis"
          section="ipp"
          description="Individual Pension Plan comparison"
        />

        {expandedSections.ipp && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Include IPP toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={formData.considerIPP ?? false}
                onChange={e => setFormData({ ...formData, considerIPP: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Include IPP Analysis</span>
            </label>

            {formData.considerIPP && (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div>
                  <InfoLabel label="IPP Status" tooltip={INPUT_TOOLTIPS.ippMode} htmlFor="ippMode" />
                  <select
                    id="ippMode"
                    value={formData.ippMode ?? 'considering'}
                    onChange={e => setFormData({ ...formData, ippMode: e.target.value as 'considering' | 'existing' })}
                    className="mt-1 w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="considering">Considering starting an IPP</option>
                    <option value="existing">Already have an IPP</option>
                  </select>
                </div>

                {/* Common fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField
                    label="Your Age"
                    id="ippMemberAge"
                    value={formData.ippMemberAge ?? formData.currentAge}
                    onChange={v => handleNumberChange('ippMemberAge', v)}
                    tooltip={INPUT_TOOLTIPS.ippAge}
                  />
                  <InputField
                    label="Years of Service"
                    id="ippYearsOfService"
                    value={formData.ippYearsOfService ?? ''}
                    onChange={v => handleNumberChange('ippYearsOfService', v)}
                    tooltip={INPUT_TOOLTIPS.ippYearsOfService}
                    hint="Years employed by your corporation"
                  />
                  <InputField
                    label="Best 3-Year Avg T4 Salary"
                    id="ippBest3AvgSalary"
                    value={formData.ippBest3AvgSalary ?? ''}
                    onChange={v => handleNumberChange('ippBest3AvgSalary', v)}
                    tooltip={INPUT_TOOLTIPS.ippBest3AvgSalary}
                    prefix="$"
                    placeholder={String(formData.requiredIncome)}
                  />
                </div>

                {/* Existing IPP fields */}
                {(formData.ippMode ?? 'considering') === 'existing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="Past Service Years Credited"
                        id="ippPastServiceYears"
                        value={formData.ippPastServiceYears ?? ''}
                        onChange={v => handleNumberChange('ippPastServiceYears', v)}
                        tooltip={INPUT_TOOLTIPS.ippPastServiceYears}
                        hint="Years credited at IPP setup"
                      />
                      <InputField
                        label="Current Fund Balance (FMV)"
                        id="ippExistingFundBalance"
                        value={formData.ippExistingFundBalance ?? ''}
                        onChange={v => handleNumberChange('ippExistingFundBalance', v)}
                        tooltip={INPUT_TOOLTIPS.ippExistingFundBalance}
                        prefix="$"
                      />
                      <InputField
                        label="Last Valuation Year"
                        id="ippLastValuationYear"
                        value={formData.ippLastValuationYear ?? ''}
                        onChange={v => handleNumberChange('ippLastValuationYear', v)}
                        tooltip={INPUT_TOOLTIPS.ippLastValuationYear}
                        placeholder="2023"
                      />
                      <InputField
                        label="Actuarial Liability (from report)"
                        id="ippLastValuationLiability"
                        value={formData.ippLastValuationLiability ?? ''}
                        onChange={v => handleNumberChange('ippLastValuationLiability', v)}
                        tooltip={INPUT_TOOLTIPS.ippLastValuationLiability}
                        prefix="$"
                      />
                      <InputField
                        label="Annual Contribution (from report)"
                        id="ippLastValuationAnnualContribution"
                        value={formData.ippLastValuationAnnualContribution ?? ''}
                        onChange={v => handleNumberChange('ippLastValuationAnnualContribution', v)}
                        tooltip={INPUT_TOOLTIPS.ippLastValuationAnnualContribution}
                        prefix="$"
                      />
                    </div>

                    {/* Funding status panel — computed from ipp.ts functions */}
                    {formData.ippExistingFundBalance != null &&
                      formData.ippLastValuationYear != null &&
                      formData.ippLastValuationLiability != null &&
                      formData.ippLastValuationAnnualContribution != null && (() => {
                        const currentYear = formData.startingYear;
                        const targetLiability = estimateCurrentTargetLiability(
                          formData.ippLastValuationLiability!,
                          formData.ippLastValuationYear!,
                          formData.ippLastValuationAnnualContribution!,
                          currentYear,
                        );
                        const status = calculateFundingStatus(formData.ippExistingFundBalance!, targetLiability);
                        const totalServiceYears = (formData.ippYearsOfService ?? 0) + (formData.ippPastServiceYears ?? 0);
                        const best3Salary = formData.ippBest3AvgSalary ?? formData.requiredIncome;
                        const retirementYear = currentYear + (formData.retirementAge - formData.currentAge);
                        const projectedPension = calculateProjectedPension(totalServiceYears, best3Salary, retirementYear);
                        const yearsToRetirement = formData.retirementAge - formData.currentAge;
                        const projectedFundAtRetirement = yearsToRetirement > 0
                          ? formData.ippExistingFundBalance! *
                            Math.pow(1 + formData.investmentReturnRate, yearsToRetirement) +
                            formData.ippLastValuationAnnualContribution! *
                              ((Math.pow(1 + formData.investmentReturnRate, yearsToRetirement) - 1) /
                                formData.investmentReturnRate)
                          : formData.ippExistingFundBalance!;
                        const terminalFunding = estimateTerminalFunding(projectedFundAtRetirement, projectedPension);
                        return (
                          <div className="p-4 rounded-lg space-y-2" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-dim)' }}>Funding Estimate (between valuations)</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p style={{ color: 'var(--text-dim)' }}>Est. target liability</p>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>${Math.round(targetLiability).toLocaleString()}</p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--text-dim)' }}>Current fund (FMV)</p>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>${Math.round(formData.ippExistingFundBalance!).toLocaleString()}</p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--text-dim)' }}>{status.deficiencyLikely ? 'Funding gap ⚠' : 'Surplus'}</p>
                                <p className="font-medium" style={{ color: status.deficiencyLikely ? '#f59e0b' : '#10b981' }}>
                                  ${Math.round(status.deficiencyLikely ? status.gap : status.surplus).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--text-dim)' }}>Projected pension/yr</p>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>${Math.round(projectedPension).toLocaleString()}</p>
                              </div>
                              {terminalFunding > 0 && (
                                <div className="col-span-2">
                                  <p style={{ color: 'var(--text-dim)' }}>Est. terminal funding room at retirement</p>
                                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>~${Math.round(terminalFunding).toLocaleString()} additional deductible</p>
                                </div>
                              )}
                              {status.contributionHolidayTriggered && (
                                <div className="col-span-2 p-2 rounded" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                  <p className="text-xs" style={{ color: '#818cf8' }}>⚠ Fund may exceed the 25% surplus limit — contribution holiday may apply at next valuation.</p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs mt-3" style={{ color: 'var(--text-dim)' }}>Planning estimates only. Formal funding status determined at next actuarial valuation.</p>
                          </div>
                        );
                      })()}
                  </div>
                )}

                {/* Spouse IPP sub-section (only when both IPP and spouse are enabled) */}
                {formData.hasSpouse && (
                  <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.spouseConsiderIPP || false}
                        onChange={(e) => setFormData({ ...formData, spouseConsiderIPP: e.target.checked })}
                      />
                      <div>
                        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Spouse IPP
                          <Tooltip content={INPUT_TOOLTIPS.spouseConsiderIPP} />
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Include IPP for spouse (separate plan, same corporation)</p>
                      </div>
                    </label>

                    {formData.spouseConsiderIPP && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <InputField
                          label="Spouse Age"
                          id="spouseIPPAge"
                          value={formData.spouseIPPAge || 45}
                          onChange={(v) => handleNumberChange('spouseIPPAge', v)}
                          hint="Spouse's current age for IPP"
                          tooltip={INPUT_TOOLTIPS.spouseIPPAge}
                        />
                        <InputField
                          label="Spouse Years of Service"
                          id="spouseIPPService"
                          value={formData.spouseIPPYearsOfService || 0}
                          onChange={(v) => handleNumberChange('spouseIPPYearsOfService', v)}
                          hint="Years spouse employed by corporation"
                          tooltip={INPUT_TOOLTIPS.spouseIPPYearsOfService}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Admin costs info box */}
                <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                  IPP setup: ~$3,000–$5,000 one-time. Annual actuarial + admin: ~$2,500–$4,000/yr. Triennial valuation: ~$3,000–$5,000.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spouse / Second Shareholder */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <SectionHeader
          title="Spouse / Second Shareholder"
          section="spouse"
          description="Split compensation between two shareholders"
        />

        {expandedSections.spouse && (
          <div
            className="pt-4 mt-2 animate-fade-in space-y-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasSpouse || false}
                onChange={(e) => setFormData({ ...formData, hasSpouse: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Include Spouse / Second Shareholder
                  <Tooltip content={INPUT_TOOLTIPS.hasSpouse} />
                </span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Spouse draws salary/dividends from same CCPC
                </p>
              </div>
            </label>

            {formData.hasSpouse && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <InputField
                    label="Spouse Required After-Tax Income"
                    id="spouseRequiredIncome"
                    value={formData.spouseRequiredIncome || 50000}
                    onChange={(v) => handleNumberChange('spouseRequiredIncome', v)}
                    prefix="$"
                    step="5000"
                    hint="Annual amount spouse needs"
                    tooltip={INPUT_TOOLTIPS.spouseRequiredIncome}
                  />
                  <div>
                    <InfoLabel
                      label="Spouse Salary Strategy"
                      tooltip={INPUT_TOOLTIPS.spouseSalaryStrategy}
                      htmlFor="spouseSalaryStrategy"
                    />
                    <select
                      id="spouseSalaryStrategy"
                      value={formData.spouseSalaryStrategy || 'dynamic'}
                      onChange={(e) => setFormData({
                        ...formData,
                        spouseSalaryStrategy: e.target.value as UserInputs['spouseSalaryStrategy'],
                      })}
                      className="w-full px-3 py-2 rounded-lg mt-1.5"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="dynamic">Dynamic (Optimize Automatically)</option>
                      <option value="fixed">Fixed Salary Amount</option>
                      <option value="dividends-only">Dividends Only</option>
                    </select>
                  </div>
                </div>

                {formData.spouseSalaryStrategy === 'fixed' && (
                  <InputField
                    label="Spouse Fixed Salary"
                    id="spouseFixedSalary"
                    value={formData.spouseFixedSalaryAmount || 0}
                    onChange={(v) => handleNumberChange('spouseFixedSalaryAmount', v)}
                    prefix="$"
                    step="5000"
                    hint="Annual salary paid to spouse"
                    tooltip={INPUT_TOOLTIPS.spouseFixedSalaryAmount}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Spouse RRSP Room"
                    id="spouseRRSP"
                    value={formData.spouseRRSPRoom || 0}
                    onChange={(v) => handleNumberChange('spouseRRSPRoom', v)}
                    prefix="$"
                    step="1000"
                    hint="Available RRSP contribution room"
                    tooltip={INPUT_TOOLTIPS.spouseRRSPRoom}
                  />
                  <InputField
                    label="Spouse TFSA Room"
                    id="spouseTFSA"
                    value={formData.spouseTFSARoom || 0}
                    onChange={(v) => handleNumberChange('spouseTFSARoom', v)}
                    prefix="$"
                    step="1000"
                    hint="Available TFSA contribution room"
                    tooltip={INPUT_TOOLTIPS.spouseTFSARoom}
                  />
                </div>

                {/* Spouse Lifetime Fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField
                    label="Spouse Current Age"
                    id="spouseCurrentAge"
                    value={formData.spouseCurrentAge || 45}
                    onChange={(v) => handleNumberChange('spouseCurrentAge', v)}
                    hint="Spouse's age today"
                    tooltip={INPUT_TOOLTIPS.spouseCurrentAge}
                  />
                  <InputField
                    label="Spouse Retirement Age"
                    id="spouseRetirementAge"
                    value={formData.spouseRetirementAge || 65}
                    onChange={(v) => handleNumberChange('spouseRetirementAge', v)}
                    hint="When spouse stops working"
                    tooltip={INPUT_TOOLTIPS.spouseRetirementAge}
                  />
                  <InputField
                    label="Spouse CPP Start"
                    id="spouseCPPStartAge"
                    value={formData.spouseCPPStartAge || 65}
                    onChange={(v) => handleNumberChange('spouseCPPStartAge', v)}
                    hint="60-70"
                    tooltip={INPUT_TOOLTIPS.spouseCPPStartAge}
                  />
                  <InputField
                    label="Spouse OAS Start"
                    id="spouseOASStartAge"
                    value={formData.spouseOASStartAge || 65}
                    onChange={(v) => handleNumberChange('spouseOASStartAge', v)}
                    hint="65-70"
                    tooltip={INPUT_TOOLTIPS.spouseOASStartAge}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Spouse Actual RRSP Balance"
                    id="spouseActualRRSPBalance"
                    value={formData.spouseActualRRSPBalance || 0}
                    onChange={(v) => handleNumberChange('spouseActualRRSPBalance', v)}
                    prefix="$"
                    hint="Spouse's current RRSP/RRIF market value"
                    tooltip={INPUT_TOOLTIPS.spouseActualRRSPBalance}
                  />
                  <InputField
                    label="Spouse Actual TFSA Balance"
                    id="spouseActualTFSABalance"
                    value={formData.spouseActualTFSABalance || 0}
                    onChange={(v) => handleNumberChange('spouseActualTFSABalance', v)}
                    prefix="$"
                    hint="Spouse's current TFSA market value"
                    tooltip={INPUT_TOOLTIPS.spouseActualTFSABalance}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.spouseMaximizeTFSA || false}
                      onChange={(e) => setFormData({ ...formData, spouseMaximizeTFSA: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Spouse Maximize TFSA
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.spouseContributeToRRSP || false}
                      onChange={(e) => setFormData({ ...formData, spouseContributeToRRSP: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Spouse Contribute to RRSP
                    </span>
                  </label>
                </div>
              </>
            )}

            <div
              className="p-3 rounded-lg"
              style={{ background: 'rgba(59, 130, 246, 0.1)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                The spouse draws from the same corporate accounts (CDA, RDTOH, GRIP).
                Primary shareholder's compensation is calculated first, then the spouse draws from remaining balances.
                Each person's tax is calculated independently using their own personal brackets.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div
          className="p-4 rounded-xl mt-4"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              style={{ color: '#f87171' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-medium text-sm" style={{ color: '#f87171' }}>
                Please fix the following errors:
              </p>
              <ul className="mt-2 text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => {
            clearStoredInputs();
            setFormData(getDefaultInputs());
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">Reset</span>
        </button>

        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={!isFormValid}
          style={{
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? 'pointer' : 'not-allowed',
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Calculate Optimal Compensation
        </button>
      </div>
    </form>
  );
}
