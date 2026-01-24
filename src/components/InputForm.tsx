import { useState } from 'react';
import type { UserInputs } from '../lib/types';

interface InputFormProps {
  onCalculate: (inputs: UserInputs) => void;
}

export function InputForm({ onCalculate }: InputFormProps) {
  const [formData, setFormData] = useState<UserInputs>({
    requiredIncome: 100000,
    planningHorizon: 5,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    investmentReturnRate: 0.0431,
    canadianEquityPercent: 33.33,
    usEquityPercent: 33.33,
    internationalEquityPercent: 33.33,
    fixedIncomePercent: 0,
    annualCorporateRetainedEarnings: 0,
    maximizeTFSA: true,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(formData);
  };

  const handleNumberChange = (field: keyof UserInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleCheckboxChange = (field: keyof UserInputs, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 premium-shadow">
      {/* Basic Information */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Required After-Tax Income
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.requiredIncome}
                onChange={(e) => handleNumberChange('requiredIncome', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Annual amount needed</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Planning Horizon
            </label>
            <select
              value={formData.planningHorizon}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  planningHorizon: parseInt(e.target.value) as 3 | 4 | 5,
                }))
              }
              className="w-full px-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value={3}>3 years</option>
              <option value={4}>4 years</option>
              <option value={5}>5 years</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Projection timeframe</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Investment Return Rate
            </label>
            <div className="relative">
              <input
                type="number"
                value={(formData.investmentReturnRate * 100).toFixed(2)}
                onChange={(e) =>
                  handleNumberChange('investmentReturnRate', (parseFloat(e.target.value) / 100).toString())
                }
                className="w-full pl-4 pr-10 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="0.01"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Expected annual return</p>
          </div>
        </div>
      </div>

      {/* Current Balances */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          Current Balances
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Corporate Investment Account
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.corporateInvestmentBalance}
                onChange={(e) =>
                  handleNumberChange('corporateInvestmentBalance', e.target.value)
                }
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">TFSA Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.tfsaBalance}
                onChange={(e) => handleNumberChange('tfsaBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">RRSP Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.rrspBalance}
                onChange={(e) => handleNumberChange('rrspBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">CDA Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.cdaBalance}
                onChange={(e) => handleNumberChange('cdaBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">eRDTOH Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.eRDTOHBalance}
                onChange={(e) => handleNumberChange('eRDTOHBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">nRDTOH Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.nRDTOHBalance}
                onChange={(e) => handleNumberChange('nRDTOHBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">GRIP Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={formData.gripBalance}
                onChange={(e) => handleNumberChange('gripBalance', e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                step="1000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Salary Strategy */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          Salary Strategy
        </h3>

        <div className="space-y-4">
          <label className="flex items-start space-x-3 p-4 rounded-xl border-2 border-border hover:border-primary cursor-pointer transition-all bg-card">
            <input
              type="radio"
              checked={formData.salaryStrategy === 'dynamic'}
              onChange={() =>
                setFormData((prev) => ({ ...prev, salaryStrategy: 'dynamic' }))
              }
              className="mt-1 w-5 h-5 text-primary focus:ring-primary"
            />
            <div>
              <span className="font-medium text-foreground">Dynamic Strategy</span>
              <p className="text-sm text-muted-foreground mt-1">
                Deplete notional accounts first (CDA → eRDTOH → nRDTOH → GRIP), then take salary to fill remaining gap
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-4 rounded-xl border-2 border-border hover:border-primary cursor-pointer transition-all bg-card">
            <input
              type="radio"
              checked={formData.salaryStrategy === 'fixed'}
              onChange={() =>
                setFormData((prev) => ({ ...prev, salaryStrategy: 'fixed' }))
              }
              className="mt-1 w-5 h-5 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <span className="font-medium text-foreground">Fixed Salary Amount</span>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Take a fixed salary each year, supplement with dividends if needed
              </p>
              {formData.salaryStrategy === 'fixed' && (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={formData.fixedSalaryAmount || 0}
                    onChange={(e) => handleNumberChange('fixedSalaryAmount', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter fixed salary amount"
                    step="1000"
                  />
                </div>
              )}
            </div>
          </label>

          <label className="flex items-start space-x-3 p-4 rounded-xl border-2 border-border hover:border-primary cursor-pointer transition-all bg-card">
            <input
              type="radio"
              checked={formData.salaryStrategy === 'dividends-only'}
              onChange={() =>
                setFormData((prev) => ({ ...prev, salaryStrategy: 'dividends-only' }))
              }
              className="mt-1 w-5 h-5 text-primary focus:ring-primary"
            />
            <div>
              <span className="font-medium text-foreground">Dividends Only</span>
              <p className="text-sm text-muted-foreground mt-1">
                Fund income entirely through dividends, no salary
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Optional Contributions */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          Optional Contributions
        </h3>

        <div className="space-y-4">
          <label className="flex items-center space-x-3 p-4 rounded-xl border border-border hover:border-primary cursor-pointer transition-all bg-card">
            <input
              type="checkbox"
              checked={formData.maximizeTFSA}
              onChange={(e) => handleCheckboxChange('maximizeTFSA', e.target.checked)}
              className="w-5 h-5 text-primary rounded focus:ring-primary"
            />
            <div>
              <span className="font-medium text-foreground">Maximize TFSA</span>
              <p className="text-sm text-muted-foreground">$6,500 per year</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-4 rounded-xl border border-border hover:border-primary cursor-pointer transition-all bg-card">
            <input
              type="checkbox"
              checked={formData.contributeToRRSP}
              onChange={(e) => handleCheckboxChange('contributeToRRSP', e.target.checked)}
              className="w-5 h-5 text-primary rounded focus:ring-primary"
            />
            <div>
              <span className="font-medium text-foreground">Contribute to RRSP</span>
              <p className="text-sm text-muted-foreground">If contribution room available</p>
            </div>
          </label>

          <div className="p-4 rounded-xl border border-border bg-card">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.contributeToRESP}
                onChange={(e) =>
                  handleCheckboxChange('contributeToRESP', e.target.checked)
                }
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-foreground">Contribute to RESP</span>
                <p className="text-sm text-muted-foreground">Registered Education Savings Plan</p>
              </div>
            </label>
            {formData.contributeToRESP && (
              <div className="mt-4 relative">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Annual RESP Contribution
                </label>
                <span className="absolute left-4 top-11 text-muted-foreground">$</span>
                <input
                  type="number"
                  value={formData.respContributionAmount || 0}
                  onChange={(e) =>
                    handleNumberChange('respContributionAmount', e.target.value)
                  }
                  className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter annual amount"
                  step="500"
                />
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.payDownDebt}
                onChange={(e) => handleCheckboxChange('payDownDebt', e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-foreground">Pay Down Debt</span>
                <p className="text-sm text-muted-foreground">Include debt payments in income needs</p>
              </div>
            </label>
            {formData.payDownDebt && (
              <div className="mt-4 space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Annual Debt Payment
                  </label>
                  <span className="absolute left-4 top-11 text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={formData.debtPaydownAmount || 0}
                    onChange={(e) =>
                      handleNumberChange('debtPaydownAmount', e.target.value)
                    }
                    className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Annual payment amount"
                    step="1000"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Total Debt Amount
                  </label>
                  <span className="absolute left-4 top-11 text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={formData.totalDebtAmount || 0}
                    onChange={(e) => handleNumberChange('totalDebtAmount', e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Total outstanding debt"
                    step="1000"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Debt Interest Rate
                  </label>
                  <input
                    type="number"
                    value={((formData.debtInterestRate || 0) * 100).toFixed(2)}
                    onChange={(e) =>
                      handleNumberChange('debtInterestRate', (parseFloat(e.target.value) / 100).toString())
                    }
                    className="w-full pl-4 pr-10 py-3 border border-border rounded-xl bg-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Interest rate"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-11 text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-primary to-accent text-white py-4 px-8 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all premium-shadow"
      >
        Calculate Projection
      </button>
    </form>
  );
}
