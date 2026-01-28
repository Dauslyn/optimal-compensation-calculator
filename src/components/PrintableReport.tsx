/**
 * PrintableReport Component
 *
 * A print-optimized view of the projection results.
 * Uses CSS print media queries for professional PDF output.
 */

import { memo } from 'react';
import type { ProjectionSummary, UserInputs } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { PROVINCES } from '../lib/tax/provinces';

interface PrintableReportProps {
  results: ProjectionSummary;
  inputs: UserInputs;
  scenarioName?: string;
}

export const PrintableReport = memo(function PrintableReport({
  results,
  inputs,
  scenarioName = 'Compensation Analysis',
}: PrintableReportProps) {
  const currentDate = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const provinceName = PROVINCES[inputs.province]?.name || inputs.province;

  return (
    <div className="print-report">
      {/* CSS for print styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-report, .print-report * {
            visibility: visible;
          }
          .print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
          }
          .print-no-break {
            page-break-inside: avoid;
          }
          .print-page-break {
            page-break-before: always;
          }
          .print-header {
            border-bottom: 2px solid #1a365d;
            padding-bottom: 12pt;
            margin-bottom: 18pt;
          }
          .print-section {
            margin-bottom: 18pt;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #ccc;
            padding: 6pt 8pt;
            text-align: right;
          }
          .print-table th {
            background: #f0f4f8;
            font-weight: bold;
            text-align: center;
          }
          .print-table td:first-child {
            text-align: left;
            font-weight: 600;
          }
          .print-footer {
            margin-top: 24pt;
            padding-top: 12pt;
            border-top: 1px solid #ccc;
            font-size: 8pt;
            color: #666;
          }
          @page {
            margin: 0.75in;
          }
        }

        /* Screen preview styles */
        @media screen {
          .print-report {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.75in;
            background: white;
            color: black;
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          }
          .print-header {
            border-bottom: 2px solid #1a365d;
            padding-bottom: 12pt;
            margin-bottom: 18pt;
          }
          .print-section {
            margin-bottom: 18pt;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #ccc;
            padding: 6pt 8pt;
            text-align: right;
          }
          .print-table th {
            background: #f0f4f8;
            font-weight: bold;
            text-align: center;
          }
          .print-table td:first-child {
            text-align: left;
            font-weight: 600;
          }
          .print-footer {
            margin-top: 24pt;
            padding-top: 12pt;
            border-top: 1px solid #ccc;
            font-size: 8pt;
            color: #666;
          }
        }
      `}</style>

      {/* Report Header */}
      <div className="print-header print-no-break">
        <h1 style={{ margin: 0, fontSize: '18pt', color: '#1a365d' }}>
          CCPC Compensation Analysis
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8pt' }}>
          <div>
            <strong>{scenarioName}</strong>
            <br />
            <span style={{ color: '#666' }}>{provinceName} • {inputs.planningHorizon}-Year Projection</span>
          </div>
          <div style={{ textAlign: 'right', color: '#666' }}>
            Generated: {currentDate}
            <br />
            Starting Year: {inputs.startingYear}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="print-section print-no-break">
        <h2 style={{ fontSize: '14pt', color: '#1a365d', marginBottom: '8pt', borderBottom: '1px solid #ddd', paddingBottom: '4pt' }}>
          Executive Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12pt' }}>
          <div style={{ padding: '8pt', background: '#f7fafc', borderRadius: '4pt' }}>
            <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>Total Tax Paid</div>
            <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#c53030' }}>{formatCurrency(results.totalTax)}</div>
          </div>
          <div style={{ padding: '8pt', background: '#f7fafc', borderRadius: '4pt' }}>
            <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>Effective Tax Rate</div>
            <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#1a365d' }}>{formatPercent(results.effectiveTaxRate, 1)}</div>
          </div>
          <div style={{ padding: '8pt', background: '#f7fafc', borderRadius: '4pt' }}>
            <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>Final Corp Balance</div>
            <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#2f855a' }}>{formatCurrency(results.finalCorporateBalance)}</div>
          </div>
        </div>

        <div style={{ marginTop: '12pt', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8pt', fontSize: '9pt' }}>
          <div>
            <span style={{ color: '#666' }}>Total Compensation:</span><br />
            <strong>{formatCurrency(results.totalCompensation)}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>Total Salary:</span><br />
            <strong>{formatCurrency(results.totalSalary)}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>Total Dividends:</span><br />
            <strong>{formatCurrency(results.totalDividends)}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>RRSP Room Generated:</span><br />
            <strong>{formatCurrency(results.totalRRSPRoomGenerated)}</strong>
          </div>
        </div>
      </div>

      {/* Input Assumptions */}
      <div className="print-section print-no-break">
        <h2 style={{ fontSize: '14pt', color: '#1a365d', marginBottom: '8pt', borderBottom: '1px solid #ddd', paddingBottom: '4pt' }}>
          Input Assumptions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16pt', fontSize: '9pt' }}>
          <div>
            <table className="print-table" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ background: '#f7fafc' }}>Province</td>
                  <td>{provinceName}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>Required After-Tax Income</td>
                  <td>{formatCurrency(inputs.requiredIncome)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>Salary Strategy</td>
                  <td style={{ textTransform: 'capitalize' }}>{inputs.salaryStrategy.replace('-', ' ')}</td>
                </tr>
                {inputs.salaryStrategy === 'fixed' && inputs.fixedSalaryAmount && (
                  <tr>
                    <td style={{ background: '#f7fafc' }}>Fixed Salary Amount</td>
                    <td>{formatCurrency(inputs.fixedSalaryAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ background: '#f7fafc' }}>Investment Return Rate</td>
                  <td>{formatPercent(inputs.investmentReturnRate, 1)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>Expected Inflation</td>
                  <td>{formatPercent(inputs.expectedInflationRate, 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="print-table" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ background: '#f7fafc' }}>Starting Corp Balance</td>
                  <td>{formatCurrency(inputs.corporateInvestmentBalance)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>CDA Balance</td>
                  <td>{formatCurrency(inputs.cdaBalance)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>GRIP Balance</td>
                  <td>{formatCurrency(inputs.gripBalance)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>eRDTOH Balance</td>
                  <td>{formatCurrency(inputs.eRDTOHBalance)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>nRDTOH Balance</td>
                  <td>{formatCurrency(inputs.nRDTOHBalance)}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f7fafc' }}>Options</td>
                  <td>
                    {[
                      inputs.maximizeTFSA && 'Max TFSA',
                      inputs.contributeToRRSP && 'RRSP',
                      inputs.contributeToRESP && 'RESP',
                      inputs.payDownDebt && 'Debt Paydown',
                    ].filter(Boolean).join(', ') || 'None'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Year-by-Year Projection */}
      <div className="print-section">
        <h2 style={{ fontSize: '14pt', color: '#1a365d', marginBottom: '8pt', borderBottom: '1px solid #ddd', paddingBottom: '4pt' }}>
          Year-by-Year Projection
        </h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Salary</th>
              <th>Dividends</th>
              <th>Personal Tax</th>
              <th>Corp Tax</th>
              <th>Payroll</th>
              <th>Total Tax</th>
              <th>After-Tax</th>
              <th>Corp Balance</th>
            </tr>
          </thead>
          <tbody>
            {results.yearlyResults.map((year) => (
              <tr key={year.year}>
                <td style={{ textAlign: 'center' }}>{inputs.startingYear + year.year - 1}</td>
                <td>{formatCurrency(year.salary)}</td>
                <td>{formatCurrency(year.dividends.grossDividends)}</td>
                <td>{formatCurrency(year.personalTax)}</td>
                <td>{formatCurrency(year.corporateTax)}</td>
                <td>{formatCurrency(year.cpp + year.cpp2 + year.ei + year.qpip)}</td>
                <td style={{ fontWeight: 'bold' }}>{formatCurrency(year.totalTax)}</td>
                <td style={{ color: '#2f855a' }}>{formatCurrency(year.afterTaxIncome)}</td>
                <td>{formatCurrency(year.notionalAccounts.corporateInvestments)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', background: '#f7fafc' }}>
              <td>TOTAL</td>
              <td>{formatCurrency(results.totalSalary)}</td>
              <td>{formatCurrency(results.totalDividends)}</td>
              <td>{formatCurrency(results.totalPersonalTax)}</td>
              <td>{formatCurrency(results.totalCorporateTax)}</td>
              <td>{formatCurrency(results.yearlyResults.reduce((sum, y) => sum + y.cpp + y.cpp2 + y.ei + y.qpip, 0))}</td>
              <td>{formatCurrency(results.totalTax)}</td>
              <td style={{ color: '#2f855a' }}>{formatCurrency(results.yearlyResults.reduce((sum, y) => sum + y.afterTaxIncome, 0))}</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notional Accounts */}
      <div className="print-section print-no-break">
        <h2 style={{ fontSize: '14pt', color: '#1a365d', marginBottom: '8pt', borderBottom: '1px solid #ddd', paddingBottom: '4pt' }}>
          Notional Account Activity
        </h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>CDA</th>
              <th>GRIP</th>
              <th>eRDTOH</th>
              <th>nRDTOH</th>
              <th>Investment Returns</th>
            </tr>
          </thead>
          <tbody>
            {results.yearlyResults.map((year) => (
              <tr key={year.year}>
                <td style={{ textAlign: 'center' }}>{inputs.startingYear + year.year - 1}</td>
                <td>{formatCurrency(year.notionalAccounts.CDA)}</td>
                <td>{formatCurrency(year.notionalAccounts.GRIP)}</td>
                <td>{formatCurrency(year.notionalAccounts.eRDTOH)}</td>
                <td>{formatCurrency(year.notionalAccounts.nRDTOH)}</td>
                <td>{formatCurrency(year.investmentReturns.totalReturn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Disclaimer */}
      <div className="print-footer">
        <p style={{ margin: 0 }}>
          <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute financial, tax, or legal advice.
          Tax calculations are estimates based on the inputs provided and current tax rates. Actual tax obligations may differ.
          Consult a qualified accountant or tax professional before making any financial decisions.
        </p>
        <p style={{ margin: '8pt 0 0 0' }}>
          Generated by CCPC Compensation Calculator • Tax rates current as of January 2025
        </p>
      </div>
    </div>
  );
});

export default PrintableReport;
