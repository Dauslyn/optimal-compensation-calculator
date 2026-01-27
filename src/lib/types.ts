import type { ProvinceCode } from './tax/provinces';

// User input types
export interface UserInputs {
  // Province for tax calculations (default: ON)
  province: ProvinceCode;

  // Required after-tax income per year (Year 1 baseline)
  requiredIncome: number;

  // Planning horizon (3-10 years)
  planningHorizon: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

  // Starting year for projections (defaults to current year)
  startingYear: number;

  // Expected inflation rate for projecting future years (default: CRA indexation factor)
  expectedInflationRate: number;

  // Whether to inflate spending needs each year (default: true)
  inflateSpendingNeeds: boolean;

  // Current balances
  corporateInvestmentBalance: number;
  tfsaBalance: number;
  rrspBalance: number;
  cdaBalance: number;
  eRDTOHBalance: number;
  nRDTOHBalance: number;
  gripBalance: number;

  // Investment return rate (default 4.31%)
  investmentReturnRate: number;

  // Portfolio composition (percentages that should sum to 100)
  canadianEquityPercent: number;
  usEquityPercent: number;
  internationalEquityPercent: number;
  fixedIncomePercent: number;

  // Annual corporate retained earnings (additional cash to invest each year)
  annualCorporateRetainedEarnings: number;

  // Toggles
  maximizeTFSA: boolean;
  contributeToRRSP: boolean;
  contributeToRESP: boolean;
  payDownDebt: boolean;

  // Optional amounts
  respContributionAmount?: number;
  debtPaydownAmount?: number;
  totalDebtAmount?: number;
  debtInterestRate?: number;

  // Salary strategy
  salaryStrategy: 'dynamic' | 'fixed' | 'dividends-only';
  fixedSalaryAmount?: number;

  // IPP (Individual Pension Plan) - optional
  considerIPP?: boolean;
  ippMemberAge?: number;
  ippYearsOfService?: number;
}

// Notional account balances
export interface NotionalAccounts {
  CDA: number;
  eRDTOH: number;
  nRDTOH: number;
  GRIP: number;
  corporateInvestments: number;
}

// Dividend funding breakdown
export interface DividendFunding {
  capitalDividends: number;
  eligibleDividends: number;
  nonEligibleDividends: number;
  regularDividends: number;
  grossDividends: number;
  afterTaxIncome: number;
}

// Investment returns breakdown
export interface InvestmentReturns {
  totalReturn: number;
  canadianDividends: number;
  foreignIncome: number;
  realizedCapitalGain: number;
  unrealizedCapitalGain: number;
  CDAIncrease: number;
  nRDTOHIncrease: number;
  eRDTOHIncrease: number;
  GRIPIncrease: number;
}

// Tax calculations
export interface TaxCalculation {
  personalTax: number;
  corporateTax: number;
  cpp: number;       // CPP or QPP (Quebec)
  cpp2: number;      // CPP2 or QPP2 (Quebec)
  ei: number;        // EI (reduced rate in Quebec)
  qpip: number;      // Quebec Parental Insurance Plan (Quebec only, 0 elsewhere)
  totalTax: number;
  dividendRefund: number;
}

// Passive income grind (SBD clawback) result
export interface PassiveIncomeGrindInfo {
  totalPassiveIncome: number;      // Total AAII for the year
  reducedSBDLimit: number;         // SBD limit after grind (0-500,000)
  sbdReduction: number;            // Amount SBD was reduced
  additionalTaxFromGrind: number;  // Extra tax paid due to grind
  isFullyGrounded: boolean;        // True if SBD = $0
}

// Yearly result
export interface YearlyResult {
  year: number;
  salary: number;
  dividends: DividendFunding;
  personalTax: number;
  corporateTax: number;
  cpp: number;       // CPP or QPP (Quebec)
  cpp2: number;      // CPP2 or QPP2 (Quebec)
  ei: number;        // EI (reduced rate in Quebec)
  qpip: number;      // Quebec Parental Insurance Plan (Quebec only, 0 elsewhere)
  provincialSurtax: number; // Ontario surtax, PEI surtax, etc.
  healthPremium: number; // Ontario Health Premium, Quebec Health Contribution, etc.
  totalTax: number;
  afterTaxIncome: number;
  rrspRoomGenerated: number;
  rrspContribution: number;
  tfsaContribution: number;
  respContribution: number;
  debtPaydown: number;
  notionalAccounts: NotionalAccounts;
  investmentReturns: InvestmentReturns;
  passiveIncomeGrind: PassiveIncomeGrindInfo;  // SBD clawback details
}

// Summary of all years
export interface ProjectionSummary {
  totalCompensation: number;
  totalSalary: number;
  totalDividends: number;
  totalPersonalTax: number;
  totalCorporateTax: number;
  totalTax: number;
  effectiveTaxRate: number;
  finalCorporateBalance: number;
  totalRRSPRoomGenerated: number;
  totalRRSPContributions: number;
  totalTFSAContributions: number;
  averageAnnualIncome: number;
  yearlyResults: YearlyResult[];
}

// Tax bracket definition
export interface TaxBracket {
  threshold: number;
  rate: number;
}

// Complete tax rates structure
export interface TaxRates {
  federal: {
    brackets: TaxBracket[];
    basicPersonalAmount: number;
  };
  provincial: {
    brackets: TaxBracket[];
    basicPersonalAmount: number;
  };
  corporate: {
    smallBusiness: number;
    transition: number;
    general: number;
  };
  dividend: {
    eligible: {
      grossUp: number;
      federalCredit: number;
      provincialCredit: number;
      effectiveRate: number;
    };
    nonEligible: {
      grossUp: number;
      federalCredit: number;
      provincialCredit: number;
      effectiveRate: number;
    };
  };
  cpp: {
    rate: number;
    maximumPensionableEarnings: number;
    basicExemption: number;
    maxContribution: number;
  };
  cpp2: {
    rate: number;
    firstCeiling: number;
    secondCeiling: number;
    maxContribution: number;
  };
  ei: {
    rate: number;
    maximumInsurableEarnings: number;
    maxContribution: number;
    employerMultiplier: number;
  };
  ontarioSurtax: {
    firstThreshold: number;
    firstRate: number;
    secondThreshold: number;
    secondRate: number;
  };
  ontarioHealthPremium: {
    brackets: {
      threshold: number;
      base: number;
      rate: number;
      maxPremium: number;
    }[];
  };
  rdtoh: {
    refundRate: number;
  };
}
