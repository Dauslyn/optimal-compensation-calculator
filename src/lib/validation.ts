/**
 * Input Validation Module
 *
 * Validates user inputs to ensure sensible values for calculations.
 */

import type { UserInputs } from './types';

export interface ValidationError {
  field: keyof UserInputs;
  message: string;
}

/**
 * Validate all user inputs and return array of errors
 */
export function validateInputs(inputs: UserInputs): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required income validation
  if (inputs.requiredIncome <= 0) {
    errors.push({
      field: 'requiredIncome',
      message: 'Required income must be greater than $0',
    });
  } else if (inputs.requiredIncome > 10000000) {
    errors.push({
      field: 'requiredIncome',
      message: 'Required income cannot exceed $10,000,000',
    });
  }

  // Planning horizon validation
  if (![3, 4, 5, 6, 7, 8, 9, 10].includes(inputs.planningHorizon)) {
    errors.push({
      field: 'planningHorizon',
      message: 'Planning horizon must be between 3 and 10 years',
    });
  }

  // Starting year validation
  const currentYear = new Date().getFullYear();
  if (inputs.startingYear < currentYear - 1 || inputs.startingYear > currentYear + 1) {
    errors.push({
      field: 'startingYear',
      message: `Starting year should be between ${currentYear - 1} and ${currentYear + 1}`,
    });
  }

  // Inflation rate validation
  if (inputs.expectedInflationRate < 0) {
    errors.push({
      field: 'expectedInflationRate',
      message: 'Inflation rate cannot be negative',
    });
  } else if (inputs.expectedInflationRate > 0.1) {
    errors.push({
      field: 'expectedInflationRate',
      message: 'Inflation rate cannot exceed 10%',
    });
  }

  // Investment return rate validation
  if (inputs.investmentReturnRate < 0) {
    errors.push({
      field: 'investmentReturnRate',
      message: 'Investment return rate cannot be negative',
    });
  } else if (inputs.investmentReturnRate > 0.2) {
    errors.push({
      field: 'investmentReturnRate',
      message: 'Investment return rate cannot exceed 20%',
    });
  }

  // Portfolio allocation validation
  const portfolioTotal =
    inputs.canadianEquityPercent +
    inputs.usEquityPercent +
    inputs.internationalEquityPercent +
    inputs.fixedIncomePercent;

  if (Math.abs(portfolioTotal - 100) > 0.01) {
    errors.push({
      field: 'canadianEquityPercent',
      message: `Portfolio allocation must sum to 100% (currently ${portfolioTotal.toFixed(2)}%)`,
    });
  }

  // Individual portfolio percentages
  if (inputs.canadianEquityPercent < 0 || inputs.canadianEquityPercent > 100) {
    errors.push({
      field: 'canadianEquityPercent',
      message: 'Canadian equity must be between 0% and 100%',
    });
  }
  if (inputs.usEquityPercent < 0 || inputs.usEquityPercent > 100) {
    errors.push({
      field: 'usEquityPercent',
      message: 'US equity must be between 0% and 100%',
    });
  }
  if (inputs.internationalEquityPercent < 0 || inputs.internationalEquityPercent > 100) {
    errors.push({
      field: 'internationalEquityPercent',
      message: 'International equity must be between 0% and 100%',
    });
  }
  if (inputs.fixedIncomePercent < 0 || inputs.fixedIncomePercent > 100) {
    errors.push({
      field: 'fixedIncomePercent',
      message: 'Fixed income must be between 0% and 100%',
    });
  }

  // Corporate investment balance validation
  if (inputs.corporateInvestmentBalance < 0) {
    errors.push({
      field: 'corporateInvestmentBalance',
      message: 'Corporate investment balance cannot be negative',
    });
  }

  // Annual retained earnings validation
  if (inputs.annualCorporateRetainedEarnings < 0) {
    errors.push({
      field: 'annualCorporateRetainedEarnings',
      message: 'Annual retained earnings cannot be negative',
    });
  }

  // Notional accounts validation (cannot be negative)
  if (inputs.cdaBalance < 0) {
    errors.push({
      field: 'cdaBalance',
      message: 'CDA balance cannot be negative',
    });
  }
  if (inputs.eRDTOHBalance < 0) {
    errors.push({
      field: 'eRDTOHBalance',
      message: 'eRDTOH balance cannot be negative',
    });
  }
  if (inputs.nRDTOHBalance < 0) {
    errors.push({
      field: 'nRDTOHBalance',
      message: 'nRDTOH balance cannot be negative',
    });
  }
  if (inputs.gripBalance < 0) {
    errors.push({
      field: 'gripBalance',
      message: 'GRIP balance cannot be negative',
    });
  }

  // TFSA and RRSP room validation
  if (inputs.tfsaBalance < 0) {
    errors.push({
      field: 'tfsaBalance',
      message: 'TFSA room cannot be negative',
    });
  }
  if (inputs.rrspBalance < 0) {
    errors.push({
      field: 'rrspBalance',
      message: 'RRSP room cannot be negative',
    });
  }

  // Fixed salary validation
  if (inputs.salaryStrategy === 'fixed') {
    if (!inputs.fixedSalaryAmount || inputs.fixedSalaryAmount <= 0) {
      errors.push({
        field: 'fixedSalaryAmount',
        message: 'Fixed salary amount must be greater than $0 when using fixed salary strategy',
      });
    }
  }

  // Debt validation
  if (inputs.payDownDebt) {
    if (inputs.debtPaydownAmount && inputs.debtPaydownAmount < 0) {
      errors.push({
        field: 'debtPaydownAmount',
        message: 'Debt paydown amount cannot be negative',
      });
    }
    if (inputs.totalDebtAmount && inputs.totalDebtAmount < 0) {
      errors.push({
        field: 'totalDebtAmount',
        message: 'Total debt amount cannot be negative',
      });
    }
    if (inputs.debtInterestRate !== undefined) {
      if (inputs.debtInterestRate < 0) {
        errors.push({
          field: 'debtInterestRate',
          message: 'Debt interest rate cannot be negative',
        });
      } else if (inputs.debtInterestRate > 0.3) {
        errors.push({
          field: 'debtInterestRate',
          message: 'Debt interest rate cannot exceed 30%',
        });
      }
    }
  }

  // Spouse validation
  if (inputs.hasSpouse) {
    if (!inputs.spouseRequiredIncome || inputs.spouseRequiredIncome <= 0) {
      errors.push({
        field: 'spouseRequiredIncome',
        message: "Spouse's required income must be greater than $0 when spouse is enabled",
      });
    } else if (inputs.spouseRequiredIncome > 10000000) {
      errors.push({
        field: 'spouseRequiredIncome',
        message: "Spouse's required income cannot exceed $10,000,000",
      });
    }
    if (inputs.spouseSalaryStrategy === 'fixed') {
      if (!inputs.spouseFixedSalaryAmount || inputs.spouseFixedSalaryAmount <= 0) {
        errors.push({
          field: 'spouseFixedSalaryAmount',
          message: "Spouse's fixed salary must be greater than $0",
        });
      }
    }
    if (inputs.spouseRRSPRoom !== undefined && inputs.spouseRRSPRoom < 0) {
      errors.push({
        field: 'spouseRRSPRoom',
        message: "Spouse's RRSP room cannot be negative",
      });
    }
    if (inputs.spouseTFSARoom !== undefined && inputs.spouseTFSARoom < 0) {
      errors.push({
        field: 'spouseTFSARoom',
        message: "Spouse's TFSA room cannot be negative",
      });
    }
  }

  // IPP validation
  if (inputs.considerIPP) {
    if (inputs.ippMemberAge !== undefined && (inputs.ippMemberAge < 18 || inputs.ippMemberAge > 71)) {
      errors.push({
        field: 'ippMemberAge',
        message: 'IPP member age must be between 18 and 71',
      });
    }
    if (inputs.ippYearsOfService !== undefined && inputs.ippYearsOfService < 0) {
      errors.push({
        field: 'ippYearsOfService',
        message: 'IPP years of service cannot be negative',
      });
    }
  }

  // Spouse IPP validation
  if (inputs.hasSpouse && inputs.spouseConsiderIPP) {
    if (inputs.spouseIPPAge !== undefined && (inputs.spouseIPPAge < 18 || inputs.spouseIPPAge > 71)) {
      errors.push({
        field: 'spouseIPPAge',
        message: "Spouse's IPP age must be between 18 and 71",
      });
    }
    if (inputs.spouseIPPYearsOfService !== undefined && inputs.spouseIPPYearsOfService < 0) {
      errors.push({
        field: 'spouseIPPYearsOfService',
        message: "Spouse's IPP years of service cannot be negative",
      });
    }
  }

  return errors;
}

/**
 * Check if inputs are valid (no errors)
 */
export function isValid(inputs: UserInputs): boolean {
  return validateInputs(inputs).length === 0;
}

/**
 * Get errors for a specific field
 */
export function getFieldErrors(
  errors: ValidationError[],
  field: keyof UserInputs
): string[] {
  return errors.filter((e) => e.field === field).map((e) => e.message);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  return errors.map((e) => `• ${e.message}`).join('\n');
}
