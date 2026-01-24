import { useState, memo } from 'react';
import type { UserInputs } from '../lib/types';

interface InputFormProps {
  onCalculate: (inputs: UserInputs) => void;
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
}: InputFieldProps) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
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

export function InputFormClean({ onCalculate }: InputFormProps) {
  const [formData, setFormData] = useState<UserInputs>({
    requiredIncome: 100000,
    planningHorizon: 5 as 3 | 4 | 5,
    investmentReturnRate: 0.0431,
    canadianEquityPercent: 33.33,
    usEquityPercent: 33.33,
    internationalEquityPercent: 33.33,
    fixedIncomePercent: 0,
    annualCorporateRetainedEarnings: 50000,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
    debtPaydownAmount: 0,
    totalDebtAmount: 0,
    debtInterestRate: 0.05,
  });

  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    portfolio: true,
    balances: true,
    strategy: false,
    debt: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(formData);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <InputField
                label="Required After-Tax Income"
                id="requiredIncome"
                value={formData.requiredIncome}
                onChange={(v) => handleNumberChange('requiredIncome', v)}
                prefix="$"
                placeholder="100,000"
                step="5000"
                hint="Annual amount you need to live on"
              />

              <InputField
                label="Corporate Investment Balance"
                id="corpBalance"
                value={formData.corporateInvestmentBalance}
                onChange={(v) => handleNumberChange('corporateInvestmentBalance', v)}
                prefix="$"
                step="10000"
                hint="Current corporate investment account"
              />

              <InputField
                label="Annual Corporate Net Income"
                id="netIncome"
                value={formData.annualCorporateRetainedEarnings}
                onChange={(v) => handleNumberChange('annualCorporateRetainedEarnings', v)}
                prefix="$"
                step="5000"
                hint="Before owner compensation (salary/dividends paid from this)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label htmlFor="planningHorizon">Planning Horizon</label>
                <select
                  id="planningHorizon"
                  value={formData.planningHorizon}
                  onChange={(e) => setFormData({ ...formData, planningHorizon: parseInt(e.target.value) as 3 | 4 | 5 })}
                >
                  <option value={3}>3 years</option>
                  <option value={4}>4 years</option>
                  <option value={5}>5 years</option>
                </select>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>Projection timeframe</p>
              </div>

              <div>
                <label htmlFor="returnRate">Expected Total Return</label>
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
              />
              <InputField
                label="US Equity"
                id="usEquity"
                value={formData.usEquityPercent}
                onChange={(v) => handleNumberChange('usEquityPercent', v)}
                suffix="%"
                step="1"
                hint="Foreign income + gains"
              />
              <InputField
                label="International Equity"
                id="intlEquity"
                value={formData.internationalEquityPercent}
                onChange={(v) => handleNumberChange('internationalEquityPercent', v)}
                suffix="%"
                step="1"
                hint="Foreign income + gains"
              />
              <InputField
                label="Fixed Income"
                id="fixedIncome"
                value={formData.fixedIncomePercent}
                onChange={(v) => handleNumberChange('fixedIncomePercent', v)}
                suffix="%"
                step="1"
                hint="Interest income (fully taxable)"
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
              hint="Capital Dividend Account"
            />
            <InputField
              label="GRIP Balance"
              id="grip"
              value={formData.gripBalance}
              onChange={(v) => handleNumberChange('gripBalance', v)}
              prefix="$"
              hint="General Rate Income Pool"
            />
            <InputField
              label="eRDTOH Balance"
              id="erdtoh"
              value={formData.eRDTOHBalance}
              onChange={(v) => handleNumberChange('eRDTOHBalance', v)}
              prefix="$"
              hint="Eligible Refundable Dividend Tax"
            />
            <InputField
              label="nRDTOH Balance"
              id="nrdtoh"
              value={formData.nRDTOHBalance}
              onChange={(v) => handleNumberChange('nRDTOHBalance', v)}
              prefix="$"
              hint="Non-Eligible Refundable Dividend Tax"
            />
            <InputField
              label="Available RRSP Room"
              id="rrsp"
              value={formData.rrspBalance}
              onChange={(v) => handleNumberChange('rrspBalance', v)}
              prefix="$"
              hint="Existing contribution room"
            />
            <InputField
              label="Available TFSA Room"
              id="tfsa"
              value={formData.tfsaBalance}
              onChange={(v) => handleNumberChange('tfsaBalance', v)}
              prefix="$"
              hint="Unused contribution room"
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
              <label htmlFor="salaryStrategy">Salary Strategy</label>
              <select
                id="salaryStrategy"
                value={formData.salaryStrategy}
                onChange={(e) => setFormData({ ...formData, salaryStrategy: e.target.value as any })}
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
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Maximize TFSA</span>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Contribute $7,000/year</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contributeToRRSP}
                  onChange={(e) => setFormData({ ...formData, contributeToRRSP: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Contribute to RRSP</span>
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
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Include Debt Payments</span>
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
                />
                <InputField
                  label="Annual Debt Payment"
                  id="debtPaydown"
                  value={formData.debtPaydownAmount || 0}
                  onChange={(v) => handleNumberChange('debtPaydownAmount', v)}
                  prefix="$"
                  hint="Amount to pay down per year"
                />
                <InputField
                  label="Interest Rate"
                  id="debtRate"
                  value={((formData.debtInterestRate || 0) * 100).toFixed(2)}
                  onChange={(v) => handleNumberChange('debtInterestRate', (parseFloat(v) / 100).toString())}
                  suffix="%"
                  hint="Annual interest rate on debt"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <button type="submit" className="btn-primary w-full mt-4">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Calculate Optimal Compensation
      </button>
    </form>
  );
}
