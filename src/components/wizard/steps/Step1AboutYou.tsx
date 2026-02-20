// src/components/wizard/steps/Step1AboutYou.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';
import { getProvinceOptions } from '../../../lib/tax/provinces';

const PROVINCE_OPTIONS = getProvinceOptions();

export function Step1AboutYou({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>About You</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Where you practice and your age determine the tax rates and CPP projections.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Province</label>
          <select
            value={inputs.province}
            onChange={e => update({ province: e.target.value as typeof inputs.province })}
            className="w-full px-3 py-2.5 rounded-lg"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            {PROVINCE_OPTIONS.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Current Age</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.currentAge || ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v > 0) update({ currentAge: v });
              }}
              placeholder="45"
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Planned Retirement Age</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.retirementAge || ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v > 0) update({ retirementAge: v });
              }}
              placeholder="65"
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} isFirst />
    </div>
  );
}
