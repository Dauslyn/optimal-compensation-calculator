// src/components/wizard/SetupWizard.tsx
import { useState } from 'react';
import type { UserInputs } from '../../lib/types';
import { getDefaultInputs } from '../../lib/localStorage';
import { Step1AboutYou } from './steps/Step1AboutYou';
import { Step2YourPractice } from './steps/Step2YourPractice';
import { Step3Retirement } from './steps/Step3Retirement';
import { Step4Investments } from './steps/Step4Investments';
import { Step5Debts } from './steps/Step5Debts';
import { Step6IPP } from './steps/Step6IPP';
import { Step7Spouse } from './steps/Step7Spouse';

export interface WizardStepProps {
  inputs: UserInputs;
  update: (partial: Partial<UserInputs>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

export function WizardNav({
  onBack,
  onNext,
  onSkip,
  onFinish,
  isFirst,
  isLast,
  skippable,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onFinish?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  skippable?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between pt-4 mt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div>
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Back
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {skippable && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--text-dim)' }}
          >
            Skip
          </button>
        )}
        <button
          type="button"
          onClick={isLast ? onFinish : onNext}
          className="px-6 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          {isLast ? 'See my results →' : (nextLabel ?? 'Next →')}
        </button>
      </div>
    </div>
  );
}

const STEP_LABELS = [
  'About You',
  'Your Practice',
  'Retirement',
  'Investments',
  'Debts',
  'IPP',
  'Spouse',
];

interface SetupWizardProps {
  onComplete: (inputs: UserInputs) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<UserInputs>(getDefaultInputs());

  const update = (partial: Partial<UserInputs>) =>
    setInputs(prev => ({ ...prev, ...partial }));

  const next = () => setStep(s => Math.min(s + 1, 7));
  const back = () => setStep(s => Math.max(s - 1, 1));
  const skip = () => next();
  const finish = () => onComplete(inputs);

  const stepProps: WizardStepProps = { inputs, update, onNext: next, onBack: back, onSkip: skip, onFinish: finish };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
          <span>Step {step} of 7</span>
          <span>{STEP_LABELS[step - 1]}</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%`, background: 'var(--accent-primary)' }}
          />
        </div>
        <div className="flex gap-1 justify-center mt-1">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: i + 1 <= step ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {step === 1 && <Step1AboutYou {...stepProps} />}
        {step === 2 && <Step2YourPractice {...stepProps} />}
        {step === 3 && <Step3Retirement {...stepProps} />}
        {step === 4 && <Step4Investments {...stepProps} />}
        {step === 5 && <Step5Debts {...stepProps} />}
        {step === 6 && <Step6IPP {...stepProps} />}
        {step === 7 && <Step7Spouse {...stepProps} />}
      </div>
    </div>
  );
}
