import { useState, useEffect, useRef, memo, useMemo } from 'react';
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
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
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
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? 0 : parseFloat(value),
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
          description="Target income and time horizon"
        />

        {expandedSections.basic && (
          <div className="pt-4 mt-2 animate-fade-in space-y-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
                hint="Before owner compensation (salary/dividends paid from this)"
                tooltip={INPUT_TOOLTIPS.annualCorporateRetainedEarnings}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <InfoLabel label="Planning Horizon" tooltip={INPUT_TOOLTIPS.planningHorizon} htmlFor="planningHorizon" />
                <select
                  id="planningHorizon"
                  value={formData.planningHorizon}
                  onChange={(e) => setFormData({ ...formData, planningHorizon: parseInt(e.target.value) as 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 })}
                >
                  <option value={3}>3 years</option>
                  <option value={4}>4 years</option>
                  <option value={5}>5 years</option>
                  <option value={6}>6 years</option>
                  <option value={7}>7 years</option>
                  <option value={8}>8 years</option>
                  <option value={9}>9 years</option>
                  <option value={10}>10 years</option>
                </select>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>Projection timeframe</p>
              </div>

              <div>
                <InfoLabel label="Expected Total Return" tooltip={INPUT_TOOLTIPS.investmentReturnRate} htmlFor="returnRate" />
                <div className="relative">
                  <input
                    id="returnRate"
                    type="number"
                    value={formData.investmentReturnRate * 100}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setFormData({ ...formData, investmentReturnRate: 0 });
                      } else {
                        setFormData({ ...formData, investmentReturnRate: parseFloat(val) / 100 });
                      }
                    }}
                    placeholder="4.31"
                    step="0.01"
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
                  <input
                    id="inflationRate"
                    type="number"
                    value={(formData.expectedInflationRate * 100).toFixed(1)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setFormData({ ...formData, expectedInflationRate: 0 });
                      } else {
                        setFormData({ ...formData, expectedInflationRate: parseFloat(val) / 100 });
                      }
                    }}
                    placeholder="2.0"
                    step="0.1"
                    min="0"
                    max="10"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-2 animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
              label="Available TFSA Room"
              id="tfsa"
              value={formData.tfsaBalance}
              onChange={(v) => handleNumberChange('tfsaBalance', v)}
              prefix="$"
              hint="From CRA My Account"
              tooltip={INPUT_TOOLTIPS.tfsaRoom}
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
                <InputField
                  label="Interest Rate"
                  id="debtRate"
                  value={((formData.debtInterestRate || 0) * 100).toFixed(2)}
                  onChange={(v) => handleNumberChange('debtInterestRate', (parseFloat(v) / 100).toString())}
                  suffix="%"
                  hint="Annual interest rate on debt"
                  tooltip={INPUT_TOOLTIPS.debtInterestRate}
                />
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
              style={{ color: '#ef4444' }}
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
              <p className="font-medium text-sm" style={{ color: '#ef4444' }}>
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
