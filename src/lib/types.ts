import type { ProvinceCode } from './tax/provinces';

// User input types
export interface UserInputs {
  // Province for tax calculations (default: ON)
  province: ProvinceCode;

  // Required after-tax income per year (Year 1 baseline)
  requiredIncome: number;

  // Planning horizon in years (computed from planningEndAge - currentAge in lifetime mode)
  planningHorizon: number;

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

  // Spouse IPP - optional
  spouseConsiderIPP?: boolean;
  spouseIPPAge?: number;
  spouseIPPYearsOfService?: number;

  // ─── Lifetime Model Fields ─────────────────────────────────────────
  currentAge: number;                    // default: 45
  retirementAge: number;                 // default: 65
  planningEndAge: number;                // default: 90
  retirementSpending: number;            // default: requiredIncome * 0.7
  lifetimeObjective: 'maximize-spending' | 'maximize-estate' | 'balanced';

  // CPP projection
  cppStartAge: number;                   // default: 65
  salaryStartAge: number;                // default: 22
  averageHistoricalSalary: number;       // default: 60000

  // OAS
  oasEligible: boolean;                  // default: true
  oasStartAge: number;                   // default: 65

  // Actual account balances (rrspBalance/tfsaBalance are contribution room)
  actualRRSPBalance: number;             // default: 0
  actualTFSABalance: number;             // default: 0

  // Spouse / second shareholder - optional
  hasSpouse?: boolean;
  spouseRequiredIncome?: number;
  spouseSalaryStrategy?: 'dynamic' | 'fixed' | 'dividends-only';
  spouseFixedSalaryAmount?: number;
  spouseRRSPRoom?: number;
  spouseTFSARoom?: number;
  spouseMaximizeTFSA?: boolean;
  spouseContributeToRRSP?: boolean;

  // Spouse lifetime fields
  spouseCurrentAge?: number;
  spouseRetirementAge?: number;
  spouseCPPStartAge?: number;
  spouseSalaryStartAge?: number;
  spouseAverageHistoricalSalary?: number;
  spouseOASEligible?: boolean;
  spouseOASStartAge?: number;
  spouseActualRRSPBalance?: number;
  spouseActualTFSABalance?: number;
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

// Retirement income breakdown for a single year
export interface RetirementIncome {
  cppIncome: number;
  oasGross: number;
  oasClawback: number;
  oasNet: number;
  rrifWithdrawal: number;
  rrifMinimum: number;
  tfsaWithdrawal: number;
  corporateDividends: number;
  ippPension: number;
  targetSpending: number;         // Inflation-adjusted spending target for this year
  spouseCPPIncome: number;        // Spouse annual CPP benefit (0 if no spouse or not yet started)
  spouseOASGross: number;         // Spouse OAS before clawback
  spouseOASNet: number;           // Spouse OAS after clawback
  spouseRRIFWithdrawal: number;   // Spouse RRIF minimum withdrawal
  totalRetirementIncome: number;
  totalTaxableIncome: number;
}

// Running balance tracking across all phases
export interface BalanceTracking {
  rrspBalance: number;
  tfsaBalance: number;
  corporateBalance: number;
  ippFundBalance: number;
}

// Estate liquidation breakdown (terminal year)
export interface EstateBreakdown {
  terminalRRIFTax: number;
  corporateWindUpTax: number;
  tfsaPassThrough: number;
  netEstateValue: number;
}

// Yearly result
export interface YearlyResult {
  year: number;
  salary: number;
  dividends: DividendFunding;
  personalTax: number;
  federalTax: number;           // Federal personal tax (after dividend tax credits)
  provincialTax: number;        // Provincial personal tax (after DTC, including surtax)
  corporateTax: number;
  corporateTaxOnActive: number;      // Tax on active business income
  corporateTaxOnPassive: number;     // Tax on passive investment income (gross, before RDTOH)
  rdtohRefundReceived: number;       // RDTOH refund from paying dividends
  cpp: number;       // CPP or QPP (Quebec)
  cpp2: number;      // CPP2 or QPP2 (Quebec)
  ei: number;        // EI (reduced rate in Quebec)
  qpip: number;      // Quebec Parental Insurance Plan (Quebec only, 0 elsewhere)
  provincialSurtax: number; // Ontario surtax, PEI surtax, etc.
  healthPremium: number; // Ontario Health Premium, Quebec Health Contribution, etc.
  totalTax: number;
  effectiveIntegratedRate: number;    // Per-year effective tax rate (corp + personal) / compensation
  afterTaxIncome: number;
  rrspRoomGenerated: number;
  rrspContribution: number;
  tfsaContribution: number;
  respContribution: number;
  debtPaydown: number;
  notionalAccounts: NotionalAccounts;
  investmentReturns: InvestmentReturns;
  passiveIncomeGrind: PassiveIncomeGrindInfo;  // SBD clawback details

  // ─── Lifetime Model Fields (optional during accumulation phase) ─────
  phase?: 'accumulation' | 'retirement' | 'estate';
  calendarYear?: number;
  age?: number;
  spouseAge?: number;
  retirement?: RetirementIncome;
  balances?: BalanceTracking;
  estate?: EstateBreakdown;

  // IPP data (only present when considerIPP = true and salary > 0)
  ipp?: {
    memberAge: number;
    contribution: number;           // Annual IPP contribution (corporate deduction)
    pensionAdjustment: number;      // PA — reduces RRSP room
    adminCosts: number;             // Deductible admin costs
    totalDeductible: number;        // contribution + adminCosts
    projectedAnnualPension: number;
    corporateTaxSavings: number;
  };

  // Spouse compensation breakdown (only present when hasSpouse = true)
  spouse?: {
    salary: number;
    dividends: DividendFunding;
    personalTax: number;
    federalTax: number;
    provincialTax: number;
    cpp: number;
    cpp2: number;
    ei: number;
    qpip: number;
    provincialSurtax: number;
    healthPremium: number;
    afterTaxIncome: number;
    rrspRoomGenerated: number;
    rrspContribution: number;
    tfsaContribution: number;
    ipp?: {
      memberAge: number;
      contribution: number;
      pensionAdjustment: number;
      adminCosts: number;
      totalDeductible: number;
      projectedAnnualPension: number;
      corporateTaxSavings: number;
    };
  };
}

// Summary of all years
export interface ProjectionSummary {
  totalCompensation: number;
  totalSalary: number;
  totalDividends: number;
  totalPersonalTax: number;
  totalCorporateTax: number;
  totalCorporateTaxOnActive: number;   // Tax on active business income
  totalCorporateTaxOnPassive: number;  // Gross tax on passive income
  totalRdtohRefund: number;            // RDTOH refunds received
  totalTax: number;
  effectiveTaxRate: number;
  effectiveCompensationRate: number;   // Tax rate on compensation (personal + payroll)
  effectivePassiveRate: number;        // Net tax rate on passive income (after RDTOH)
  finalCorporateBalance: number;
  totalRRSPRoomGenerated: number;
  totalRRSPContributions: number;
  totalTFSAContributions: number;
  averageAnnualIncome: number;
  yearlyResults: YearlyResult[];

  // IPP totals (only present when considerIPP = true)
  ipp?: {
    totalContributions: number;
    totalAdminCosts: number;
    totalCorporateTaxSavings: number;
    totalPensionAdjustments: number;
    projectedAnnualPensionAtEnd: number;
  };

  // Spouse totals (only present when hasSpouse = true)
  spouse?: {
    totalSalary: number;
    totalDividends: number;
    totalPersonalTax: number;
    totalAfterTaxIncome: number;
    totalRRSPRoomGenerated: number;
    totalRRSPContributions: number;
    totalTFSAContributions: number;
    ipp?: {
      totalContributions: number;
      totalAdminCosts: number;
      totalPensionAdjustments: number;
    };
  };

  // Lifetime summary (populated in v3.0 lifetime mode)
  lifetime?: {
    totalAccumulationYears: number;
    totalRetirementYears: number;
    totalLifetimeSpending: number;
    totalLifetimeTax: number;
    lifetimeEffectiveRate: number;
    peakCorporateBalance: number;
    peakYear: number;
    estateValue: number;
    cppTotalReceived: number;
    oasTotalReceived: number;
    rrifTotalWithdrawn: number;
    tfsaTotalWithdrawn: number;
    spouseCPPTotalReceived: number;
    spouseOASTotalReceived: number;
  };
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
