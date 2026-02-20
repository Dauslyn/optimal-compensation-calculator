// src/components/wizard/steps/Step5Debts.tsx
import type { WizardStepProps } from '../SetupWizard';
import { WizardNav } from '../SetupWizard';
import type { DebtEntry, PaymentFrequency } from '../../../lib/types';
import { PAYMENT_FREQUENCY_MULTIPLIERS } from '../../../lib/types';

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  'semi-monthly': 'Semi-monthly',
  monthly: 'Monthly',
  annually: 'Annually',
};

function makeDebtId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString();
}

export function Step5Debts({ inputs, update, onNext, onBack, onSkip, onFinish }: WizardStepProps) {
  const debts = inputs.debts ?? [];
  const hasDebts = debts.length > 0;

  const addDebt = () => {
    update({
      debts: [...debts, {
        id: makeDebtId(),
        label: '',
        balance: 0,
        paymentAmount: 0,
        paymentFrequency: 'monthly',
        interestRate: 0.055,
      }],
    });
  };

  const removeDebt = (id: string) => {
    update({ debts: debts.filter(d => d.id !== id) });
  };

  const updateDebt = (id: string, changes: Partial<DebtEntry>) => {
    update({ debts: debts.map(d => d.id === id ? { ...d, ...changes } : d) });
  };

  // Suppress unused import warning
  void PAYMENT_FREQUENCY_MULTIPLIERS;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Debts</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Adding debts helps model the cashflow impact on your plan. You can skip this and add them later.
        </p>
      </div>

      {hasDebts ? (
        <div className="space-y-3">
          {debts.map((debt, idx) => (
            <div key={debt.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Debt {idx + 1}</span>
                <button type="button" onClick={() => removeDebt(debt.id)}
                  className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--text-dim)', background: 'var(--bg-elevated)' }}>
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="block text-xs mb-0.5" style={{ color: 'var(--text-dim)' }}>Label</label>
                  <input type="text" value={debt.label}
                    onChange={e => updateDebt(debt.id, { label: e.target.value })}
                    placeholder="Mortgage"
                    className="w-full px-2 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs mb-0.5" style={{ color: 'var(--text-dim)' }}>Balance ($)</label>
                  <input type="text" inputMode="decimal"
                    value={debt.balance || ''}
                    onChange={e => { const v = parseFloat(e.target.value); updateDebt(debt.id, { balance: isNaN(v) ? 0 : v }); }}
                    placeholder="450000"
                    className="w-full px-2 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs mb-0.5" style={{ color: 'var(--text-dim)' }}>Payment ($)</label>
                  <input type="text" inputMode="decimal"
                    value={debt.paymentAmount || ''}
                    onChange={e => { const v = parseFloat(e.target.value); updateDebt(debt.id, { paymentAmount: isNaN(v) ? 0 : v }); }}
                    placeholder="2800"
                    className="w-full px-2 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs mb-0.5" style={{ color: 'var(--text-dim)' }}>Frequency</label>
                  <select value={debt.paymentFrequency}
                    onChange={e => updateDebt(debt.id, { paymentFrequency: e.target.value as PaymentFrequency })}
                    className="w-full px-2 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                    {(Object.keys(FREQUENCY_LABELS) as PaymentFrequency[]).map(f => (
                      <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-0.5" style={{ color: 'var(--text-dim)' }}>Interest Rate (%)</label>
                  <input type="text" inputMode="decimal"
                    value={debt.interestRate === 0 ? '' : (debt.interestRate * 100).toFixed(2)}
                    onChange={e => { const v = parseFloat(e.target.value); updateDebt(debt.id, { interestRate: isNaN(v) ? 0 : v / 100 }); }}
                    placeholder="5.5"
                    className="w-full px-2 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addDebt}
            className="w-full py-2 rounded-lg text-sm border-dashed border-2"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            + Add another debt
          </button>
        </div>
      ) : (
        <button type="button" onClick={addDebt}
          className="w-full py-3 rounded-lg text-sm border-dashed border-2"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
          + Add a debt
        </button>
      )}

      <WizardNav onBack={onBack} onNext={onNext} onSkip={onSkip} onFinish={onFinish} skippable />
    </div>
  );
}
