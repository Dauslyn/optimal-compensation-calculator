import { forwardRef } from 'react';
import type { UserInputs, ProjectionSummary } from '../lib/types';
import type { ComparisonResult } from '../lib/strategyComparison';
import { formatCurrency, formatPercentage } from '../lib/formatters';
import { PROVINCES } from '../lib/tax/provinces';
import { INPUT_TOOLTIPS } from './Tooltip';

interface ReportTemplateProps {
    inputs: UserInputs;
    summary: ProjectionSummary;
    clientName?: string;
    comparison?: ComparisonResult | null;
}

function formatStrategy(strategy: string): string {
    switch (strategy) {
        case 'dynamic': return 'Dynamic (Optimized)';
        case 'fixed': return 'Fixed Salary';
        case 'dividends-only': return 'Dividends Only';
        default: return strategy;
    }
}

function generateExecutiveBullets(inputs: UserInputs, summary: ProjectionSummary): string[] {
    const bullets: string[] = [];
    const provinceName = PROVINCES[inputs.province].name;

    // Recommended strategy
    const salaryPct = summary.totalCompensation > 0
        ? (summary.totalSalary / summary.totalCompensation) * 100
        : 0;
    if (inputs.salaryStrategy === 'dynamic') {
        if (salaryPct > 60) {
            bullets.push(`Recommended strategy is salary-heavy (${salaryPct.toFixed(0)}% salary / ${(100 - salaryPct).toFixed(0)}% dividends) to maximize RRSP room and CPP benefits.`);
        } else if (salaryPct < 20) {
            bullets.push(`Recommended strategy is dividend-heavy (${salaryPct.toFixed(0)}% salary / ${(100 - salaryPct).toFixed(0)}% dividends) to minimize integrated tax cost.`);
        } else {
            bullets.push(`Recommended strategy uses a blended approach (${salaryPct.toFixed(0)}% salary / ${(100 - salaryPct).toFixed(0)}% dividends) optimized for ${provinceName} tax rates.`);
        }
    } else {
        bullets.push(`Using ${formatStrategy(inputs.salaryStrategy)} strategy as specified.`);
    }

    // Total tax efficiency
    bullets.push(`Average integrated tax rate of ${formatPercentage(summary.effectiveCompensationRate)} (corporate + personal) across the ${inputs.planningHorizon}-year horizon, delivering ${formatCurrency(summary.averageAnnualIncome)}/year after-tax.`);

    // Corporate balance trajectory
    const balanceChange = summary.finalCorporateBalance - inputs.corporateInvestmentBalance;
    if (balanceChange > 0) {
        bullets.push(`Corporate investment balance grows by ${formatCurrency(balanceChange)} over the period, ending at ${formatCurrency(summary.finalCorporateBalance)}.`);
    } else if (balanceChange < 0) {
        bullets.push(`Corporate investment balance draws down by ${formatCurrency(Math.abs(balanceChange))}, ending at ${formatCurrency(summary.finalCorporateBalance)}.`);
    }

    // RRSP room
    if (summary.totalRRSPRoomGenerated > 0) {
        bullets.push(`Total RRSP room generated: ${formatCurrency(summary.totalRRSPRoomGenerated)} over ${inputs.planningHorizon} years via salary income.`);
    }

    // RDTOH refund
    if (summary.totalRdtohRefund > 0) {
        bullets.push(`${formatCurrency(summary.totalRdtohRefund)} in RDTOH refunds recovered through dividend payments, reducing effective passive income tax.`);
    }

    // IPP
    if (summary.ipp) {
        bullets.push(`Individual Pension Plan contributes ${formatCurrency(summary.ipp.totalContributions)} over the period, generating ${formatCurrency(summary.ipp.totalCorporateTaxSavings)} in corporate tax savings and a projected annual pension of ${formatCurrency(summary.ipp.projectedAnnualPensionAtEnd)}.`);
    }

    // Spouse
    if (inputs.hasSpouse && summary.spouse) {
        bullets.push(`Family compensation is split across two shareholders to utilize two sets of personal tax brackets, with spouse receiving ${formatCurrency(summary.spouse.totalAfterTaxIncome)} total after-tax over the period.`);
    }

    return bullets;
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
    ({ inputs, summary, clientName, comparison }, ref) => {
        const provinceName = PROVINCES[inputs.province].name;
        const executiveBullets = generateExecutiveBullets(inputs, summary);
        const reportDate = new Date().toLocaleDateString('en-CA', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

        return (
            <div ref={ref} className="p-8 print-container font-sans text-black bg-white" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                {/* Print-specific styles */}
                <style type="text/css" media="print">
                    {`
            @page { size: letter; margin: 18mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-container { background: white !important; color: black !important; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: right; }
            th { background-color: #f0f0f0 !important; font-weight: 600; text-align: center; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
            td:first-child { text-align: left; font-weight: 500; }
            h1 { font-size: 22px; margin-bottom: 2px; color: #111; }
            h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 4px; color: #111; }
            h3 { font-size: 12px; margin-top: 12px; margin-bottom: 4px; color: #444; font-weight: 600; }
            .report-header { border-bottom: 3px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
            .header-meta { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #555; }
            .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .metric-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa; text-align: center; }
            .metric-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .metric-value { font-size: 16px; font-weight: 700; margin-top: 2px; color: #111; }
            .assumption-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; font-size: 11px; }
            .assumption-label { color: #333; }
            .assumption-value { font-weight: 600; color: #111; }
            .assumption-note { font-size: 9px; color: #888; font-style: italic; margin-top: 1px; }
            .executive-bullet { margin-bottom: 6px; padding-left: 16px; position: relative; font-size: 11px; color: #333; }
            .executive-bullet::before { content: "\\2022"; position: absolute; left: 0; color: #333; font-weight: bold; }
            .methodology-section { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; font-size: 10px; color: #555; page-break-inside: avoid; }
            .footer { margin-top: 30px; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; text-align: center; }
            .page-break { page-break-before: always; }
          `}
                </style>

                {/* ===== HEADER ===== */}
                <div className="report-header">
                    <h1>Optimal Compensation Report</h1>
                    <div className="header-meta">
                        <div>
                            {clientName && <span style={{ fontWeight: 600 }}>Prepared for: {clientName} &bull; </span>}
                            <span>{provinceName} &bull; {inputs.startingYear}&ndash;{inputs.startingYear + inputs.planningHorizon - 1} ({inputs.planningHorizon}-Year Horizon)</span>
                        </div>
                        <div>{reportDate}</div>
                    </div>
                </div>

                {/* ===== EXECUTIVE SUMMARY ===== */}
                <div style={{ marginBottom: '20px' }}>
                    <h2>Executive Summary</h2>

                    {/* Key Metrics */}
                    <div className="grid-4" style={{ marginBottom: '16px' }}>
                        <div className="metric-box">
                            <div className="metric-label">Total After-Tax Income</div>
                            <div className="metric-value">{formatCurrency(summary.averageAnnualIncome * inputs.planningHorizon)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">Integrated Tax Rate</div>
                            <div className="metric-value">{formatPercentage(summary.effectiveCompensationRate)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">Final Corp Balance</div>
                            <div className="metric-value">{formatCurrency(summary.finalCorporateBalance)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">RRSP Room Generated</div>
                            <div className="metric-value">{formatCurrency(summary.totalRRSPRoomGenerated)}</div>
                        </div>
                    </div>

                    {/* Tax Detail */}
                    <div className="grid-3" style={{ marginBottom: '16px' }}>
                        <div className="metric-box">
                            <div className="metric-label">Total Personal Tax</div>
                            <div className="metric-value">{formatCurrency(summary.totalPersonalTax)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">Total Corporate Tax</div>
                            <div className="metric-value">{formatCurrency(summary.totalCorporateTax)}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label">RDTOH Refunds</div>
                            <div className="metric-value">{formatCurrency(summary.totalRdtohRefund)}</div>
                        </div>
                    </div>

                    {/* Bullet Points */}
                    <div>
                        {executiveBullets.map((bullet, i) => (
                            <div key={i} className="executive-bullet">{bullet}</div>
                        ))}
                    </div>
                </div>

                {/* ===== ASSUMPTIONS ===== */}
                <div style={{ marginBottom: '20px' }}>
                    <h2>Assumptions &amp; Inputs</h2>
                    <div className="grid-2">
                        {/* Left Column: Core Inputs */}
                        <div>
                            <h3>Core Parameters</h3>
                            <div className="assumption-row">
                                <span className="assumption-label">Province</span>
                                <span className="assumption-value">{provinceName}</span>
                            </div>
                            <div className="assumption-note">{INPUT_TOOLTIPS.province}</div>

                            <div className="assumption-row">
                                <span className="assumption-label">Required After-Tax Income</span>
                                <span className="assumption-value">{formatCurrency(inputs.requiredIncome)}/yr</span>
                            </div>
                            <div className="assumption-note">{INPUT_TOOLTIPS.requiredIncome}</div>

                            <div className="assumption-row">
                                <span className="assumption-label">Annual Corporate Net Income</span>
                                <span className="assumption-value">{formatCurrency(inputs.annualCorporateRetainedEarnings)}</span>
                            </div>
                            <div className="assumption-note">{INPUT_TOOLTIPS.annualCorporateRetainedEarnings}</div>

                            <div className="assumption-row">
                                <span className="assumption-label">Corporate Investment Balance</span>
                                <span className="assumption-value">{formatCurrency(inputs.corporateInvestmentBalance)}</span>
                            </div>

                            <div className="assumption-row">
                                <span className="assumption-label">Planning Horizon</span>
                                <span className="assumption-value">{inputs.planningHorizon} Years ({inputs.startingYear}&ndash;{inputs.startingYear + inputs.planningHorizon - 1})</span>
                            </div>

                            <div className="assumption-row">
                                <span className="assumption-label">Expected Investment Return</span>
                                <span className="assumption-value">{formatPercentage(inputs.investmentReturnRate)}</span>
                            </div>

                            <div className="assumption-row">
                                <span className="assumption-label">Expected Inflation Rate</span>
                                <span className="assumption-value">{formatPercentage(inputs.expectedInflationRate)}</span>
                            </div>
                            <div className="assumption-note">{INPUT_TOOLTIPS.inflationRate}</div>

                            <div className="assumption-row">
                                <span className="assumption-label">Inflate Spending Needs</span>
                                <span className="assumption-value">{inputs.inflateSpendingNeeds ? 'Yes' : 'No'}</span>
                            </div>

                            <div className="assumption-row">
                                <span className="assumption-label">Salary Strategy</span>
                                <span className="assumption-value">{formatStrategy(inputs.salaryStrategy)}</span>
                            </div>
                            <div className="assumption-note">{INPUT_TOOLTIPS.salaryStrategy}</div>

                            {inputs.salaryStrategy === 'fixed' && inputs.fixedSalaryAmount && (
                                <div className="assumption-row">
                                    <span className="assumption-label">Fixed Salary Amount</span>
                                    <span className="assumption-value">{formatCurrency(inputs.fixedSalaryAmount)}</span>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Balances & Options */}
                        <div>
                            <h3>Portfolio Composition</h3>
                            <div className="assumption-row">
                                <span className="assumption-label">Canadian Equity</span>
                                <span className="assumption-value">{inputs.canadianEquityPercent}%</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">US Equity</span>
                                <span className="assumption-value">{inputs.usEquityPercent}%</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">International Equity</span>
                                <span className="assumption-value">{inputs.internationalEquityPercent}%</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">Fixed Income</span>
                                <span className="assumption-value">{inputs.fixedIncomePercent}%</span>
                            </div>

                            <h3 style={{ marginTop: '12px' }}>Opening Notional Balances</h3>
                            <div className="assumption-row">
                                <span className="assumption-label">CDA (Capital Dividend Account)</span>
                                <span className="assumption-value">{formatCurrency(inputs.cdaBalance)}</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">GRIP (General Rate Income Pool)</span>
                                <span className="assumption-value">{formatCurrency(inputs.gripBalance)}</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">eRDTOH (Eligible)</span>
                                <span className="assumption-value">{formatCurrency(inputs.eRDTOHBalance)}</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">nRDTOH (Non-Eligible)</span>
                                <span className="assumption-value">{formatCurrency(inputs.nRDTOHBalance)}</span>
                            </div>

                            <h3 style={{ marginTop: '12px' }}>Registered Accounts &amp; Options</h3>
                            <div className="assumption-row">
                                <span className="assumption-label">RRSP Room Available</span>
                                <span className="assumption-value">{formatCurrency(inputs.rrspBalance)}</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">TFSA Room Available</span>
                                <span className="assumption-value">{formatCurrency(inputs.tfsaBalance)}</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">Maximize TFSA</span>
                                <span className="assumption-value">{inputs.maximizeTFSA ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="assumption-row">
                                <span className="assumption-label">Contribute to RRSP</span>
                                <span className="assumption-value">{inputs.contributeToRRSP ? 'Yes' : 'No'}</span>
                            </div>

                            {inputs.hasSpouse && (
                                <>
                                    <h3 style={{ marginTop: '12px' }}>Spouse / Second Shareholder</h3>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Spouse Required Income</span>
                                        <span className="assumption-value">{formatCurrency(inputs.spouseRequiredIncome || 0)}/yr</span>
                                    </div>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Spouse Salary Strategy</span>
                                        <span className="assumption-value">{formatStrategy(inputs.spouseSalaryStrategy || 'dynamic')}</span>
                                    </div>
                                    {inputs.spouseSalaryStrategy === 'fixed' && inputs.spouseFixedSalaryAmount && (
                                        <div className="assumption-row">
                                            <span className="assumption-label">Spouse Fixed Salary</span>
                                            <span className="assumption-value">{formatCurrency(inputs.spouseFixedSalaryAmount)}</span>
                                        </div>
                                    )}
                                    <div className="assumption-row">
                                        <span className="assumption-label">Spouse RRSP Room</span>
                                        <span className="assumption-value">{formatCurrency(inputs.spouseRRSPRoom || 0)}</span>
                                    </div>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Spouse TFSA Room</span>
                                        <span className="assumption-value">{formatCurrency(inputs.spouseTFSARoom || 0)}</span>
                                    </div>
                                </>
                            )}

                            {inputs.considerIPP && (
                                <>
                                    <h3 style={{ marginTop: '12px' }}>Individual Pension Plan (IPP)</h3>
                                    <div className="assumption-row">
                                        <span className="assumption-label">IPP Member Age</span>
                                        <span className="assumption-value">{inputs.ippMemberAge || 'N/A'}</span>
                                    </div>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Years of Service</span>
                                        <span className="assumption-value">{inputs.ippYearsOfService || 0}</span>
                                    </div>
                                    {inputs.hasSpouse && inputs.spouseConsiderIPP && (
                                        <>
                                            <div className="assumption-row">
                                                <span className="assumption-label">Spouse IPP Age</span>
                                                <span className="assumption-value">{inputs.spouseIPPAge || 'N/A'}</span>
                                            </div>
                                            <div className="assumption-row">
                                                <span className="assumption-label">Spouse Years of Service</span>
                                                <span className="assumption-value">{inputs.spouseIPPYearsOfService || 0}</span>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {inputs.payDownDebt && (
                                <>
                                    <h3 style={{ marginTop: '12px' }}>Debt</h3>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Total Debt</span>
                                        <span className="assumption-value">{formatCurrency(inputs.totalDebtAmount || 0)}</span>
                                    </div>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Annual Payment</span>
                                        <span className="assumption-value">{formatCurrency(inputs.debtPaydownAmount || 0)}</span>
                                    </div>
                                    <div className="assumption-row">
                                        <span className="assumption-label">Interest Rate</span>
                                        <span className="assumption-value">{formatPercentage(inputs.debtInterestRate || 0)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== YEAR-BY-YEAR: COMPENSATION ===== */}
                <div className="page-break" style={{ marginBottom: '20px' }}>
                    <h2>Year-by-Year Compensation</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Salary</th>
                                <th>Capital Div</th>
                                <th>Eligible Div</th>
                                <th>Non-Elig Div</th>
                                <th>Total Gross</th>
                                <th>Personal Tax</th>
                                <th>CPP + EI</th>
                                <th>Net Income</th>
                                <th>Eff. Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.yearlyResults.map((yr) => (
                                <tr key={yr.year}>
                                    <td>{inputs.startingYear + yr.year - 1}</td>
                                    <td>{formatCurrency(yr.salary)}</td>
                                    <td>{formatCurrency(yr.dividends.capitalDividends)}</td>
                                    <td>{formatCurrency(yr.dividends.eligibleDividends)}</td>
                                    <td>{formatCurrency(yr.dividends.nonEligibleDividends)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(yr.salary + yr.dividends.grossDividends)}</td>
                                    <td>{formatCurrency(yr.personalTax)}</td>
                                    <td>{formatCurrency(yr.cpp + yr.cpp2 + yr.ei + yr.qpip)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(yr.afterTaxIncome)}</td>
                                    <td>{formatPercentage(yr.effectiveIntegratedRate)}</td>
                                </tr>
                            ))}
                            {/* Totals Row */}
                            <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                                <td>Total</td>
                                <td>{formatCurrency(summary.totalSalary)}</td>
                                <td>{formatCurrency(summary.yearlyResults.reduce((s, y) => s + y.dividends.capitalDividends, 0))}</td>
                                <td>{formatCurrency(summary.yearlyResults.reduce((s, y) => s + y.dividends.eligibleDividends, 0))}</td>
                                <td>{formatCurrency(summary.yearlyResults.reduce((s, y) => s + y.dividends.nonEligibleDividends, 0))}</td>
                                <td>{formatCurrency(summary.totalCompensation)}</td>
                                <td>{formatCurrency(summary.totalPersonalTax)}</td>
                                <td>{formatCurrency(summary.yearlyResults.reduce((s, y) => s + y.cpp + y.cpp2 + y.ei + y.qpip, 0))}</td>
                                <td>{formatCurrency(summary.averageAnnualIncome * inputs.planningHorizon)}</td>
                                <td>{formatPercentage(summary.effectiveCompensationRate)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ===== SPOUSE COMPENSATION (if applicable) ===== */}
                {inputs.hasSpouse && summary.yearlyResults.some(yr => yr.spouse) && (
                    <div style={{ marginBottom: '20px' }}>
                        <h2>Spouse Year-by-Year Compensation</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Salary</th>
                                    <th>Capital Div</th>
                                    <th>Eligible Div</th>
                                    <th>Non-Elig Div</th>
                                    <th>Personal Tax</th>
                                    <th>CPP + EI</th>
                                    <th>Net Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.yearlyResults.map((yr) => yr.spouse && (
                                    <tr key={yr.year}>
                                        <td>{inputs.startingYear + yr.year - 1}</td>
                                        <td>{formatCurrency(yr.spouse.salary)}</td>
                                        <td>{formatCurrency(yr.spouse.dividends.capitalDividends)}</td>
                                        <td>{formatCurrency(yr.spouse.dividends.eligibleDividends)}</td>
                                        <td>{formatCurrency(yr.spouse.dividends.nonEligibleDividends)}</td>
                                        <td>{formatCurrency(yr.spouse.personalTax)}</td>
                                        <td>{formatCurrency(yr.spouse.cpp + yr.spouse.cpp2 + yr.spouse.ei + yr.spouse.qpip)}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(yr.spouse.afterTaxIncome)}</td>
                                    </tr>
                                ))}
                                {summary.spouse && (
                                    <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                                        <td>Total</td>
                                        <td>{formatCurrency(summary.spouse.totalSalary)}</td>
                                        <td colSpan={3}>{formatCurrency(summary.spouse.totalDividends)}</td>
                                        <td>{formatCurrency(summary.spouse.totalPersonalTax)}</td>
                                        <td>&mdash;</td>
                                        <td>{formatCurrency(summary.spouse.totalAfterTaxIncome)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ===== YEAR-BY-YEAR: CORPORATE ===== */}
                <div style={{ marginBottom: '20px' }}>
                    <h2>Corporate Tax &amp; Investment Balance</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Corp Tax (Active)</th>
                                <th>Corp Tax (Passive)</th>
                                <th>RDTOH Refund</th>
                                <th>SBD Grind</th>
                                <th>Investment Return</th>
                                <th>Corp Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.yearlyResults.map((yr) => (
                                <tr key={yr.year}>
                                    <td>{inputs.startingYear + yr.year - 1}</td>
                                    <td>{formatCurrency(yr.corporateTaxOnActive)}</td>
                                    <td>{formatCurrency(yr.corporateTaxOnPassive)}</td>
                                    <td>{formatCurrency(yr.rdtohRefundReceived)}</td>
                                    <td>{formatCurrency(yr.passiveIncomeGrind.additionalTaxFromGrind)}</td>
                                    <td>{formatCurrency(yr.investmentReturns.totalReturn)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(yr.notionalAccounts.corporateInvestments)}</td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                                <td>Total</td>
                                <td>{formatCurrency(summary.totalCorporateTaxOnActive)}</td>
                                <td>{formatCurrency(summary.totalCorporateTaxOnPassive)}</td>
                                <td>{formatCurrency(summary.totalRdtohRefund)}</td>
                                <td>{formatCurrency(summary.yearlyResults.reduce((s, y) => s + y.passiveIncomeGrind.additionalTaxFromGrind, 0))}</td>
                                <td>{formatCurrency(summary.yearlyResults.reduce((s, y) => s + y.investmentReturns.totalReturn, 0))}</td>
                                <td>{formatCurrency(summary.finalCorporateBalance)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ===== IPP YEAR-BY-YEAR (if applicable) ===== */}
                {summary.yearlyResults.some(yr => yr.ipp) && (
                    <div style={{ marginBottom: '20px' }}>
                        <h2>IPP Year-by-Year Contributions</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Age</th>
                                    <th>IPP Contribution</th>
                                    <th>Admin Costs</th>
                                    <th>Total Deductible</th>
                                    <th>Pension Adj (PA)</th>
                                    <th>Corp Tax Savings</th>
                                    <th>Projected Pension</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.yearlyResults.map((yr) => yr.ipp && (
                                    <tr key={yr.year}>
                                        <td>{inputs.startingYear + yr.year - 1}</td>
                                        <td>{yr.ipp.memberAge}</td>
                                        <td>{formatCurrency(yr.ipp.contribution)}</td>
                                        <td>{formatCurrency(yr.ipp.adminCosts)}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(yr.ipp.totalDeductible)}</td>
                                        <td>{formatCurrency(yr.ipp.pensionAdjustment)}</td>
                                        <td>{formatCurrency(yr.ipp.corporateTaxSavings)}</td>
                                        <td>{formatCurrency(yr.ipp.projectedAnnualPension)}</td>
                                    </tr>
                                ))}
                                {summary.ipp && (
                                    <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                                        <td>Total</td>
                                        <td>&mdash;</td>
                                        <td>{formatCurrency(summary.ipp.totalContributions)}</td>
                                        <td>{formatCurrency(summary.ipp.totalAdminCosts)}</td>
                                        <td>{formatCurrency(summary.ipp.totalContributions + summary.ipp.totalAdminCosts)}</td>
                                        <td>{formatCurrency(summary.ipp.totalPensionAdjustments)}</td>
                                        <td>{formatCurrency(summary.ipp.totalCorporateTaxSavings)}</td>
                                        <td>{formatCurrency(summary.ipp.projectedAnnualPensionAtEnd)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ===== NOTIONAL ACCOUNTS ===== */}
                <div style={{ marginBottom: '20px' }}>
                    <h2>Notional Accounts Tracking</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>CDA</th>
                                <th>eRDTOH</th>
                                <th>nRDTOH</th>
                                <th>GRIP</th>
                                <th>RRSP Contrib</th>
                                <th>TFSA Contrib</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.yearlyResults.map((yr) => (
                                <tr key={yr.year}>
                                    <td>{inputs.startingYear + yr.year - 1}</td>
                                    <td>{formatCurrency(yr.notionalAccounts.CDA)}</td>
                                    <td>{formatCurrency(yr.notionalAccounts.eRDTOH)}</td>
                                    <td>{formatCurrency(yr.notionalAccounts.nRDTOH)}</td>
                                    <td>{formatCurrency(yr.notionalAccounts.GRIP)}</td>
                                    <td>{formatCurrency(yr.rrspContribution)}</td>
                                    <td>{formatCurrency(yr.tfsaContribution)}</td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                                <td>Total</td>
                                <td>&mdash;</td>
                                <td>&mdash;</td>
                                <td>&mdash;</td>
                                <td>&mdash;</td>
                                <td>{formatCurrency(summary.totalRRSPContributions)}</td>
                                <td>{formatCurrency(summary.totalTFSAContributions)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ===== STRATEGY COMPARISON ===== */}
                {comparison && (
                    <div style={{ pageBreakBefore: 'always', marginBottom: '20px' }}>
                        <h2>Strategy Comparison</h2>
                        <p style={{ fontSize: '10px', color: '#666', marginBottom: '12px' }}>
                            Three compensation strategies evaluated using your inputs.
                            The recommended strategy balances tax efficiency (60% weight) and corporate balance growth (40% weight).
                        </p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    {comparison.strategies.map(s => (
                                        <th key={s.id} style={{
                                            background: s.id === comparison.winner.bestOverall ? '#e8f5e9' : undefined,
                                        }}>
                                            {s.label}
                                            {s.id === comparison.winner.bestOverall && ' \u2605'}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Total Tax Paid</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id} style={{
                                            fontWeight: s.id === comparison.winner.lowestTax ? 700 : 400,
                                            color: s.id === comparison.winner.lowestTax ? '#2e7d32' : undefined,
                                        }}>
                                            {formatCurrency(s.summary.totalTax)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>Integrated Tax Rate</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id}>
                                            {(s.summary.effectiveCompensationRate * 100).toFixed(1)}%
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>Avg Annual After-Tax</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id}>{formatCurrency(s.summary.averageAnnualIncome)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>Final Corp Balance</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id} style={{
                                            fontWeight: s.id === comparison.winner.highestBalance ? 700 : 400,
                                            color: s.id === comparison.winner.highestBalance ? '#2e7d32' : undefined,
                                        }}>
                                            {formatCurrency(s.summary.finalCorporateBalance)}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>RRSP Room Generated</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id}>{formatCurrency(s.summary.totalRRSPRoomGenerated)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>Total Salary</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id}>{formatCurrency(s.summary.totalSalary)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>Total Dividends</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id}>{formatCurrency(s.summary.totalDividends)}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td><strong>RDTOH Refunds</strong></td>
                                    {comparison.strategies.map(s => (
                                        <td key={s.id}>{formatCurrency(s.summary.totalRdtohRefund)}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ marginTop: '12px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '10px' }}>
                            <strong>Recommendation:</strong>{' '}
                            {(() => {
                                const best = comparison.strategies.find(s => s.id === comparison.winner.bestOverall);
                                if (!best) return '';
                                return `Based on this analysis, the ${best.label} strategy is recommended. It results in ${formatCurrency(best.summary.totalTax)} total tax over the projection period with a ${(best.summary.effectiveCompensationRate * 100).toFixed(1)}% integrated rate, leaving ${formatCurrency(best.summary.finalCorporateBalance)} in corporate investments.`;
                            })()}
                        </div>
                    </div>
                )}

                {/* ===== METHODOLOGY ===== */}
                <div className="methodology-section" style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0 }}>Methodology Notes</h3>
                    <p style={{ marginBottom: '6px' }}>
                        This calculator implements the methodology from PWL Capital&rsquo;s research paper &ldquo;Optimal Compensation, Savings, and Consumption for Owners of CCPCs&rdquo; by Ben Felix et al.
                    </p>
                    <p style={{ marginBottom: '6px' }}>
                        <strong>Tax Integration:</strong> Canada&rsquo;s system is designed so corporate + personal tax on dividends approximates the tax on equivalent salary. This calculator computes both paths and selects the optimal mix.
                    </p>
                    <p style={{ marginBottom: '6px' }}>
                        <strong>RDTOH Mechanism:</strong> Passive investment income is taxed at ~50% corporately, but ~30.67% is refundable when dividends are paid ($38.33 per $100 of dividends). This refund is tracked and applied automatically.
                    </p>
                    <p style={{ marginBottom: '6px' }}>
                        <strong>SBD Grind:</strong> When passive income exceeds $50,000, the small business deduction limit is reduced by $5 for every $1 over $50,000, eliminated entirely at $150,000. This interaction is modeled each year.
                    </p>
                    <p style={{ marginBottom: '0' }}>
                        <strong>Bracket Indexation:</strong> 2025&ndash;2026 use CRA-published bracket values. Subsequent years are projected using the specified inflation rate for bracket thresholds, CPP/EI limits, and contribution limits.
                    </p>
                </div>

                {/* ===== DISCLAIMER ===== */}
                <div className="footer">
                    <p style={{ marginBottom: '6px' }}>
                        <strong>Disclaimer:</strong> This report is for informational and planning purposes only and does not constitute professional tax, legal, or financial advice.
                        All calculations are based on {provinceName} {inputs.startingYear} tax rates and the assumptions listed above.
                        Tax law changes, personal circumstances, and other factors may materially affect actual outcomes.
                        Please consult with a Chartered Professional Accountant (CPA) before implementing any compensation strategy.
                    </p>
                    <p>
                        Generated by Optimal Compensation Calculator &bull; {reportDate} &bull; https://optimal-compensation-calculator.vercel.app
                    </p>
                </div>
            </div>
        );
    }
);

ReportTemplate.displayName = 'ReportTemplate';
