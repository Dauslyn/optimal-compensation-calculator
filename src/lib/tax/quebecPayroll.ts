/**
 * Quebec Payroll Deductions
 *
 * Quebec has its own payroll system separate from the federal CPP/EI:
 * - QPP (Quebec Pension Plan) instead of CPP
 * - QPIP (Quebec Parental Insurance Plan) instead of federal parental benefits
 * - Quebec EI rate is lower (no QPIP component)
 *
 * Data sourced from Revenu Québec and Retraite Québec.
 */

/**
 * QPP (Quebec Pension Plan) rates and limits
 * Similar to CPP but administered by Retraite Québec
 */
export interface QPPData {
  rate: number;              // Employee contribution rate
  ympe: number;              // Year's Maximum Pensionable Earnings
  basicExemption: number;    // Basic exemption ($3,500)
  maxContribution: number;   // Maximum annual contribution
}

/**
 * QPP2 (Quebec Pension Plan - second additional contribution)
 * Similar to CPP2 but for Quebec
 */
export interface QPP2Data {
  rate: number;              // Employee contribution rate
  firstCeiling: number;      // YMPE (same as QPP)
  secondCeiling: number;     // YAMPE - Year's Additional Maximum Pensionable Earnings
  maxContribution: number;   // Maximum annual contribution
}

/**
 * QPIP (Quebec Parental Insurance Plan)
 * Quebec's own parental leave insurance program
 */
export interface QPIPData {
  employeeRate: number;      // Employee premium rate
  employerRate: number;      // Employer premium rate
  maxInsurableEarnings: number;
  maxEmployeeContribution: number;
  maxEmployerContribution: number;
}

/**
 * Quebec EI rates (different from rest of Canada)
 * Quebec residents pay reduced EI because they pay QPIP separately
 */
export interface QuebecEIData {
  rate: number;              // Employee rate (lower than ROC)
  employerMultiplier: number;
  maxInsurableEarnings: number;
  maxContribution: number;
}

/**
 * Complete Quebec payroll data for a year
 */
export interface QuebecPayrollData {
  qpp: QPPData;
  qpp2: QPP2Data;
  qpip: QPIPData;
  ei: QuebecEIData;
}

/**
 * Known Quebec payroll values by year
 */
export const QUEBEC_PAYROLL_DATA: Record<number, QuebecPayrollData> = {
  2025: {
    qpp: {
      rate: 0.064,           // 6.4% (higher than CPP's 5.95%)
      ympe: 71300,           // Same as CPP YMPE
      basicExemption: 3500,
      maxContribution: 4343.20,
    },
    qpp2: {
      rate: 0.04,            // 4% same as CPP2
      firstCeiling: 71300,   // YMPE
      secondCeiling: 81200,  // YAMPE
      maxContribution: 396.00,
    },
    qpip: {
      employeeRate: 0.00494,  // 0.494%
      employerRate: 0.00692,  // 0.692%
      maxInsurableEarnings: 98000,
      maxEmployeeContribution: 484.12,
      maxEmployerContribution: 678.16,
    },
    ei: {
      rate: 0.01278,          // 1.278% (reduced from 1.64% for Quebec)
      employerMultiplier: 1.4,
      maxInsurableEarnings: 65700,
      maxContribution: 839.64,
    },
  },
  2026: {
    qpp: {
      rate: 0.064,           // 6.4%
      ympe: 74600,           // Indexed
      basicExemption: 3500,
      maxContribution: 4550.40,
    },
    qpp2: {
      rate: 0.04,
      firstCeiling: 74600,
      secondCeiling: 85000,
      maxContribution: 416.00,
    },
    qpip: {
      employeeRate: 0.00494,
      employerRate: 0.00692,
      maxInsurableEarnings: 100000, // Indexed estimate
      maxEmployeeContribution: 494.00,
      maxEmployerContribution: 692.00,
    },
    ei: {
      rate: 0.01264,          // Estimated reduced rate for 2026
      employerMultiplier: 1.4,
      maxInsurableEarnings: 68900,
      maxContribution: 870.90,
    },
  },
};

/**
 * Get Quebec payroll data for a specific year
 * Projects forward if year is not known
 */
export function getQuebecPayrollData(
  year: number,
  inflationRate: number = 0.02
): QuebecPayrollData {
  if (QUEBEC_PAYROLL_DATA[year]) {
    return QUEBEC_PAYROLL_DATA[year];
  }

  // Find most recent known year
  const knownYears = Object.keys(QUEBEC_PAYROLL_DATA)
    .map(Number)
    .sort((a, b) => b - a);

  const lastKnownYear = knownYears[0];
  const baseData = QUEBEC_PAYROLL_DATA[lastKnownYear];
  const yearsToProject = year - lastKnownYear;

  if (yearsToProject <= 0) {
    return QUEBEC_PAYROLL_DATA[knownYears[knownYears.length - 1]];
  }

  // Project forward
  const factor = Math.pow(1 + inflationRate, yearsToProject);

  return {
    qpp: {
      rate: baseData.qpp.rate,
      ympe: Math.round(baseData.qpp.ympe * factor),
      basicExemption: baseData.qpp.basicExemption,
      maxContribution: Math.round((baseData.qpp.ympe * factor - baseData.qpp.basicExemption) * baseData.qpp.rate * 100) / 100,
    },
    qpp2: {
      rate: baseData.qpp2.rate,
      firstCeiling: Math.round(baseData.qpp2.firstCeiling * factor),
      secondCeiling: Math.round(baseData.qpp2.secondCeiling * factor),
      maxContribution: Math.round((baseData.qpp2.secondCeiling * factor - baseData.qpp2.firstCeiling * factor) * baseData.qpp2.rate * 100) / 100,
    },
    qpip: {
      employeeRate: baseData.qpip.employeeRate,
      employerRate: baseData.qpip.employerRate,
      maxInsurableEarnings: Math.round(baseData.qpip.maxInsurableEarnings * factor),
      maxEmployeeContribution: Math.round(baseData.qpip.maxInsurableEarnings * factor * baseData.qpip.employeeRate * 100) / 100,
      maxEmployerContribution: Math.round(baseData.qpip.maxInsurableEarnings * factor * baseData.qpip.employerRate * 100) / 100,
    },
    ei: {
      rate: baseData.ei.rate,
      employerMultiplier: baseData.ei.employerMultiplier,
      maxInsurableEarnings: Math.round(baseData.ei.maxInsurableEarnings * factor),
      maxContribution: Math.round(baseData.ei.maxInsurableEarnings * factor * baseData.ei.rate * 100) / 100,
    },
  };
}

/**
 * Calculate QPP contribution for Quebec employees
 */
export function calculateQPP(salary: number, qppData: QPPData): number {
  if (salary <= qppData.basicExemption) return 0;

  const pensionableEarnings = Math.min(
    salary - qppData.basicExemption,
    qppData.ympe - qppData.basicExemption
  );

  return Math.min(pensionableEarnings * qppData.rate, qppData.maxContribution);
}

/**
 * Calculate QPP2 contribution for Quebec employees
 */
export function calculateQPP2(salary: number, qpp2Data: QPP2Data): number {
  if (salary <= qpp2Data.firstCeiling) return 0;

  const qpp2Earnings = Math.min(
    salary - qpp2Data.firstCeiling,
    qpp2Data.secondCeiling - qpp2Data.firstCeiling
  );

  return Math.min(qpp2Earnings * qpp2Data.rate, qpp2Data.maxContribution);
}

/**
 * Calculate QPIP employee contribution
 */
export function calculateQPIPEmployee(salary: number, qpipData: QPIPData): number {
  if (salary <= 0) return 0;

  const insurableEarnings = Math.min(salary, qpipData.maxInsurableEarnings);

  return Math.min(insurableEarnings * qpipData.employeeRate, qpipData.maxEmployeeContribution);
}

/**
 * Calculate QPIP employer contribution
 */
export function calculateQPIPEmployer(salary: number, qpipData: QPIPData): number {
  if (salary <= 0) return 0;

  const insurableEarnings = Math.min(salary, qpipData.maxInsurableEarnings);

  return Math.min(insurableEarnings * qpipData.employerRate, qpipData.maxEmployerContribution);
}

/**
 * Calculate Quebec EI (reduced rate)
 */
export function calculateQuebecEI(salary: number, eiData: QuebecEIData): number {
  if (salary <= 0) return 0;

  const insurableEarnings = Math.min(salary, eiData.maxInsurableEarnings);

  return Math.min(insurableEarnings * eiData.rate, eiData.maxContribution);
}

/**
 * Calculate total Quebec payroll deductions (employee portion)
 */
export function calculateQuebecPayrollDeductions(
  salary: number,
  year: number,
  inflationRate: number = 0.02
): {
  qpp: number;
  qpp2: number;
  qpip: number;
  ei: number;
  total: number;
  employerTotal: number;
} {
  const data = getQuebecPayrollData(year, inflationRate);

  const qpp = calculateQPP(salary, data.qpp);
  const qpp2 = calculateQPP2(salary, data.qpp2);
  const qpip = calculateQPIPEmployee(salary, data.qpip);
  const ei = calculateQuebecEI(salary, data.ei);

  // Employer costs
  const employerQPP = qpp; // Employer matches employee
  const employerQPP2 = qpp2; // Employer matches employee
  const employerQPIP = calculateQPIPEmployer(salary, data.qpip);
  const employerEI = ei * data.ei.employerMultiplier;

  return {
    qpp,
    qpp2,
    qpip,
    ei,
    total: qpp + qpp2 + qpip + ei,
    employerTotal: employerQPP + employerQPP2 + employerQPIP + employerEI,
  };
}
