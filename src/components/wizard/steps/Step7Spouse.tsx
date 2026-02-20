// src/components/wizard/steps/Step7Spouse.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';

export function Step7Spouse({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Spouse / Second Shareholder</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Including a spouse enables income splitting analysis. You can skip this for now.
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
        <input
          type="checkbox"
          checked={inputs.hasSpouse ?? false}
          onChange={e => update({ hasSpouse: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Include a spouse or second shareholder</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>They are a shareholder or will share in corporate income</p>
        </div>
      </label>

      {inputs.hasSpouse && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Spouse Required Income</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-dim)' }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={inputs.spouseRequiredIncome || ''}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) update({ spouseRequiredIncome: v });
                }}
                placeholder="120000"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Spouse Current Age</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.spouseCurrentAge || ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) update({ spouseCurrentAge: v });
              }}
              placeholder="43"
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Spouse Retirement Age</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.spouseRetirementAge || ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) update({ spouseRetirementAge: v });
              }}
              placeholder="65"
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      )}

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} isLast skippable />
    </div>
  );
}
