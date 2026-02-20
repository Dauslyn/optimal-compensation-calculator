// src/components/wizard/steps/Step4Investments.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';
import { computeBlendedReturnRate } from '../../../lib/accounts/investmentReturns';

const ALLOCATIONS: Array<{ key: 'canadianEquityPercent' | 'usEquityPercent' | 'internationalEquityPercent' | 'fixedIncomePercent'; label: string }> = [
  { key: 'canadianEquityPercent', label: 'Canadian Equity' },
  { key: 'usEquityPercent', label: 'US Equity' },
  { key: 'internationalEquityPercent', label: 'International Equity' },
  { key: 'fixedIncomePercent', label: 'Fixed Income' },
];

export function Step4Investments({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  const canEq = inputs.canadianEquityPercent;
  const usEq = inputs.usEquityPercent;
  const intlEq = inputs.internationalEquityPercent;
  const fi = inputs.fixedIncomePercent;
  const total = canEq + usEq + intlEq + fi;

  const blended = computeBlendedReturnRate(canEq, usEq, intlEq, fi);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Portfolio Allocation</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          How is your corporate portfolio allocated? Defaults reflect a balanced growth portfolio.
        </p>
      </div>

      <div className="space-y-3">
        {ALLOCATIONS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)' }}>{inputs[key]}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputs[key]}
              onChange={e => {
                update({ [key]: parseInt(e.target.value) });
              }}
              className="w-full"
            />
          </div>
        ))}

        <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ color: total === 100 ? 'var(--text-dim)' : '#f59e0b' }}>
            Total: {total}%{total !== 100 && ' — must equal 100%'}
          </span>
          <span style={{ color: 'var(--text-primary)' }}>Blended return: ~{(blended * 100).toFixed(2)}%</span>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        Not sure? Leave the defaults — they reflect a balanced growth portfolio.
      </p>

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} />
    </div>
  );
}
