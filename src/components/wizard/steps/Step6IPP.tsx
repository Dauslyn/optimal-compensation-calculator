// src/components/wizard/steps/Step6IPP.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';

export function Step6IPP({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Individual Pension Plan (IPP)</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          An IPP allows incorporated professionals to shelter significantly more than RRSP limits. You can skip this and configure it later.
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
        <input
          type="checkbox"
          checked={inputs.considerIPP ?? false}
          onChange={e => update({ considerIPP: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Include IPP in my analysis</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>I have or am considering an Individual Pension Plan</p>
        </div>
      </label>

      {inputs.considerIPP && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>IPP Status</label>
            <select
              value={inputs.ippMode ?? 'considering'}
              onChange={e => update({ ippMode: e.target.value as 'considering' | 'existing' })}
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="considering">Considering starting an IPP</option>
              <option value="existing">Already have an IPP</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Years of Service</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputs.ippYearsOfService || ''}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) update({ ippYearsOfService: v });
                }}
                placeholder="12"
                className="w-full px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Years as incorporated physician</p>
            </div>
          </div>
        </div>
      )}

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} skippable />
    </div>
  );
}
