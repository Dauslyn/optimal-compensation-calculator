import { forwardRef } from 'react';
import type { UserInputs, ProjectionSummary } from '../lib/types';
import { formatCurrency, formatPercentage } from '../lib/utils';

interface ReportTemplateProps {
    inputs: UserInputs;
    summary: ProjectionSummary;
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
    ({ inputs, summary }, ref) => {
        return (
            <div ref={ref} className="p-8 print-container font-sans text-black bg-white">
                {/* Print-specific styles */}
                <style type="text/css" media="print">
                    {`
            @page { size: auto; margin: 20mm; }
            body { -webkit-print-color-adjust: exact; }
            .print-container { background: white !important; color: black !important; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: right; }
            th { background-color: #f3f3f3 !important; font-weight: bold; text-align: center; }
            td:first-child { text-align: left; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            h3 { font-size: 14px; margin-top: 15px; margin-bottom: 5px; color: #555; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .metric-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #f9f9f9; }
            .metric-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .metric-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
            .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; text-align: center; }
          `}
                </style>

                {/* Header */}
                <div className="mb-8">
                    <h1>Optimal Compensation Report</h1>
                    <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
                </div>

                {/* Executive Summary */}
                <div className="mb-8">
                    <h2>Executive Summary</h2>
                    <div className="grid-3">
                        <div className="metric-box">
                            <div className="metric-label">Total After-Tax Income</div>
                            <div className="metric-value">{formatCurrency(summary.averageAnnualIncome * inputs.planningHorizon)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">Effective Tax Rate</div>
                            <div className="metric-value">{formatPercentage(summary.effectiveTaxRate)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">Final Corp Balance</div>
                            <div className="metric-value">{formatCurrency(summary.finalCorporateBalance)}</div>
                        </div>
                    </div>
                </div>

                {/* Strategy Parameters */}
                <div className="mb-8">
                    <h2>Strategy Parameters</h2>
                    <div className="grid-2">
                        <div>
                            <h3>Inputs</h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr><td>Required Income:</td><td>{formatCurrency(inputs.requiredIncome)}</td></tr>
                                    <tr><td>Corp Savings:</td><td>{formatCurrency(inputs.corporateInvestmentBalance)}</td></tr>
                                    <tr><td>Annual Net Income:</td><td>{formatCurrency(inputs.annualCorporateRetainedEarnings)}</td></tr>
                                    <tr><td>Horizon:</td><td>{inputs.planningHorizon} Years</td></tr>
                                    <tr><td>Expected Return:</td><td>{formatPercentage(inputs.investmentReturnRate)}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h3>Portfolio & Tax</h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr><td>Canadian Equity:</td><td>{inputs.canadianEquityPercent}%</td></tr>
                                    <tr><td>US Equity:</td><td>{inputs.usEquityPercent}%</td></tr>
                                    <tr><td>Intl Equity:</td><td>{inputs.internationalEquityPercent}%</td></tr>
                                    <tr><td>Fixed Income:</td><td>{inputs.fixedIncomePercent}%</td></tr>
                                    <tr><td>Strategy:</td><td className="capitalize">{inputs.salaryStrategy}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Year-by-Year Breakdown */}
                <div className="mb-8">
                    <h2>Year-by-Year Projection</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Salary</th>
                                <th>Dividends (Tax-Free)</th>
                                <th>Dividends (Taxable)</th>
                                <th>Total Gross</th>
                                <th>Personal Tax</th>
                                <th>Net Income</th>
                                <th>Corp Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.yearlyResults.map((year) => (
                                <tr key={year.year}>
                                    <td>Year {year.year}</td>
                                    <td>{formatCurrency(year.salary)}</td>
                                    <td>{formatCurrency(year.dividends.capitalDividends)}</td>
                                    <td>{formatCurrency(year.dividends.eligibleDividends + year.dividends.nonEligibleDividends)}</td>
                                    <td>{formatCurrency(year.salary + year.dividends.grossDividends)}</td>
                                    <td>{formatCurrency(year.totalTax)}</td>
                                    <td>{formatCurrency(year.afterTaxIncome)}</td>
                                    <td>{formatCurrency(year.notionalAccounts.corporateInvestments)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Detailed Metrics */}
                <div className="mb-8">
                    <h2>Notional Accounts Tracking</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>CDA Balance</th>
                                <th>eRDTOH Balance</th>
                                <th>nRDTOH Balance</th>
                                <th>GRIP Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.yearlyResults.map((year) => (
                                <tr key={year.year}>
                                    <td>Year {year.year}</td>
                                    <td>{formatCurrency(year.notionalAccounts.CDA)}</td>
                                    <td>{formatCurrency(year.notionalAccounts.eRDTOH)}</td>
                                    <td>{formatCurrency(year.notionalAccounts.nRDTOH)}</td>
                                    <td>{formatCurrency(year.notionalAccounts.GRIP)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Disclaimer */}
                <div className="footer">
                    <p>
                        <strong>Disclaimer:</strong> This report is for planning purposes only and does not constitute professional tax advice.
                        All calculations are based on Ontario {new Date().getFullYear()} tax rates and provided assumptions.
                        Actual tax outcomes may vary. Please consult with a designated accountant (CPA) before making compensation decisions.
                    </p>
                    <p className="mt-2">
                        Generated by Optimal Compensation Calculator &bull; https://optimal-compensation-calculator.vercel.app
                    </p>
                </div>
            </div>
        );
    }
);

ReportTemplate.displayName = 'ReportTemplate';
