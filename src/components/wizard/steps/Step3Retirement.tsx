// src/components/wizard/steps/Step3Retirement.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';

export function Step3Retirement({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Retirement Goals</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          How much do you want to spend in retirement, and what are your government benefit plans?
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Retirement Spending Target
          </label>
          <p className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>Annual spending in today's dollars</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-dim)' }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.retirementSpending || ''}
              onChange={e => {
                const v = parseFloat(e.target.value.replace(/,/g, ''));
                if (!isNaN(v)) update({ retirementSpending: v });
              }}
              placeholder="80000"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Lifetime Objective</label>
          <select
            value={inputs.lifetimeObjective ?? 'balanced'}
            onChange={e => update({ lifetimeObjective: e.target.value as typeof inputs.lifetimeObjective })}
            className="w-full px-3 py-2.5 rounded-lg"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            <option value="balanced">Balanced (default)</option>
            <option value="maximize-spending">Maximize Retirement Spending</option>
            <option value="maximize-estate">Maximize Estate</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CPP Start Age</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.cppStartAge || ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) update({ cppStartAge: v });
              }}
              placeholder="65"
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={inputs.oasEligible ?? true}
              onChange={e => update({ oasEligible: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span>OAS Eligible (10+ years Canadian residency)</span>
          </label>
        </div>

        {(inputs.oasEligible ?? true) && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>OAS Start Age</label>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.oasStartAge || ''}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) update({ oasStartAge: v });
              }}
              placeholder="65"
              className="w-full px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
        )}
      </div>

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} />
    </div>
  );
}
