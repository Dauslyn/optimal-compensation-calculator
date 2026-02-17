import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import type { UserInputs } from '../lib/types';
import type { ProvinceCode } from '../lib/tax/provinces';
import { PROVINCES } from '../lib/tax/provinces';
import { getDefaultInflationRate } from '../lib/tax/indexation';
import { getContributionLimitsForYear } from '../lib/tax/constants';
import { validateInputs } from '../lib/validation';
import { InfoLabel, Tooltip, INPUT_TOOLTIPS } from './Tooltip';
import { saveInputsToStorage, loadInputsFromStorage, getDefaultInputs, clearStoredInputs } from '../lib/localStorage';

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
            {/* Row 1: Province, Income, Corp Balance, Corp Net Income */}
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

            {/* Row 2: Age, Retirement Age, Planning End Age, Expected Return */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <InputField
                label="Current Age"
                id="currentAge"
                value={formData.currentAge ?? 45}
                onChange={(v) => {
                  const age = parseInt(v) || 45;
                  const retAge = formData.retirementAge ?? 65;
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
                <InfoLabel label="Expected Total Return" tooltip={INPUT_TOOLTIPS.investmentReturnRate} htmlFor="returnRate" />
                <div className="relative">
                  <PercentInput
                    id="returnRate"
                    decimalValue={formData.investmentReturnRate}
                    onDecimalChange={(v) => setFormData({ ...formData, investmentReturnRate: v })}
                    placeholder="4.31"
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    %
                  </span>
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>Annual portfolio return</p>
              </div>
            </div>

            {/* Computed planning horizon info */}
            <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
              Planning: age {formData.currentAge ?? 45} → {formData.planningEndAge ?? 90} ({(formData.planningEndAge ?? 90) - (formData.currentAge ?? 45)} years: {Math.max(0, (formData.retirementAge ?? 65) - (formData.currentAge ?? 45))} accumulation + {Math.max(0, (formData.planningEndAge ?? 90) - (formData.retirementAge ?? 65))} retirement)
            </p>

            {/* Row 3: CPP Start Age, Age Started Earning, Average Historical Salary */}
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

            {/* Row 4: OAS Eligible, OAS Start Age, Retirement Spending, Lifetime Objective */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                    <Tooltip text={INPUT_TOOLTIPS.oasEligible} />
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

            {/* Row 5: RRSP Room, TFSA Room, Actual RRSP Balance, Actual TFSA Balance */}
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
        )}
      </div>

      {/* Inflation & Indexing */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Inflation & Indexing"
          section="inflation"
          description="Adjust spending needs and tax brackets for inflation"
        />

        {expandedSections.inflation && (
          <div className="pt-4 mt-2 animate-fade-in space-y-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            </div>

            <div
              className="p-3 rounded-lg text-xs"
              style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}
            >
              Tax brackets, CPP/EI limits, and contribution limits are automatically indexed using CRA values for 2025-2026, then projected forward using your expected inflation rate.
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
          </div>
        )}
      </div>

      {/* Notional Accounts */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Notional Account Balances"
          section="balances"
          description="CDA, RDTOH, GRIP - from your T2 return"
        />

        {expandedSections.balances && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-2 animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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

      {/* Strategy & Options */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Compensation Strategy"
          section="strategy"
          description="How to fund your income requirements"
        />

        {expandedSections.strategy && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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

      {/* Debt Options */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader
          title="Debt Management"
          section="debt"
          description="Optional: Factor in debt payments"
        />

        {expandedSections.debt && (
          <div className="pt-4 mt-2 animate-fade-in space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.payDownDebt}
                onChange={(e) => setFormData({ ...formData, payDownDebt: e.target.checked })}
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Include Debt Payments
                  <Tooltip content={INPUT_TOOLTIPS.includeDebt} />
                </span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add debt paydown to income requirements</p>
              </div>
            </label>

            {formData.payDownDebt && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <InputField
                  label="Total Debt Amount"
                  id="totalDebt"
                  value={formData.totalDebtAmount || 0}
                  onChange={(v) => handleNumberChange('totalDebtAmount', v)}
                  prefix="$"
                  hint="Outstanding balance"
                  tooltip={INPUT_TOOLTIPS.totalDebtAmount}
                />
                <InputField
                  label="Annual Debt Payment"
                  id="debtPaydown"
                  value={formData.debtPaydownAmount || 0}
                  onChange={(v) => handleNumberChange('debtPaydownAmount', v)}
                  prefix="$"
                  hint="Amount to pay down per year"
                  tooltip={INPUT_TOOLTIPS.annualDebtPayment}
                />
                <div>
                  <InfoLabel label="Interest Rate" tooltip={INPUT_TOOLTIPS.debtInterestRate} htmlFor="debtRate" />
                  <div className="relative">
                    <PercentInput
                      id="debtRate"
                      decimalValue={formData.debtInterestRate || 0}
                      onDecimalChange={(v) => setFormData({ ...formData, debtInterestRate: v })}
                      placeholder="5.0"
                    />
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      %
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>Annual interest rate on debt</p>
                </div>
              </div>
            )}
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
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.considerIPP || false}
                onChange={(e) => setFormData({ ...formData, considerIPP: e.target.checked })}
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Include IPP Analysis
                  <Tooltip content={INPUT_TOOLTIPS.includeIPP} />
                </span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Compare IPP contributions vs RRSP</p>
              </div>
            </label>

            {formData.considerIPP && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <InputField
                  label="Your Age"
                  id="ippAge"
                  value={formData.ippMemberAge || 45}
                  onChange={(v) => handleNumberChange('ippMemberAge', v)}
                  hint="Current age for IPP calculations"
                  tooltip={INPUT_TOOLTIPS.ippAge}
                />
                <InputField
                  label="Years of Service"
                  id="ippService"
                  value={formData.ippYearsOfService || 10}
                  onChange={(v) => handleNumberChange('ippYearsOfService', v)}
                  hint="Years employed by your corporation"
                  tooltip={INPUT_TOOLTIPS.ippYearsOfService}
                />
              </div>
            )}

            {/* Spouse IPP sub-section (only when both IPP and spouse are enabled) */}
            {formData.considerIPP && formData.hasSpouse && (
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

            <div
              className="p-3 rounded-lg"
              style={{ background: 'rgba(59, 130, 246, 0.1)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                IPP allows higher tax-deductible contributions than RRSP for older individuals (typically 40+).
                The corporation contributes directly to the IPP, providing corporate tax deductions.
                An actuary must administer the plan (adds $2,000-3,000/year in costs).
              </p>
            </div>
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
