// src/components/wizard/steps/Step2YourPractice.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';

function DollarInput({ label, value, onChange, placeholder, hint }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {hint && <p className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-dim)' }}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value || ''}
          onChange={e => {
            const v = parseFloat(e.target.value.replace(/,/g, ''));
            onChange(isNaN(v) ? 0 : v);
          }}
          placeholder={placeholder ?? '0'}
          className="w-full pl-7 pr-3 py-2.5 rounded-lg"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}

export function Step2YourPractice({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Your Practice</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Tell us about your income and corporate investments.
        </p>
      </div>

      <div className="space-y-4">
        <DollarInput
          label="Required After-Tax Income"
          value={inputs.requiredIncome}
          onChange={v => update({ requiredIncome: v })}
          placeholder="220000"
          hint="How much you need to live on each year, after personal tax"
        />
        <DollarInput
          label="Corporate Investment Balance"
          value={inputs.corporateInvestmentBalance}
          onChange={v => update({ corporateInvestmentBalance: v })}
          placeholder="500000"
          hint="Current value of investments held inside your corporation"
        />
        <DollarInput
          label="Annual Corporate Net Income"
          value={inputs.annualCorporateRetainedEarnings}
          onChange={v => update({ annualCorporateRetainedEarnings: v })}
          placeholder="150000"
          hint="Profit retained in the corporation after expenses, before owner compensation"
        />
      </div>

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} />
    </div>
  );
}
