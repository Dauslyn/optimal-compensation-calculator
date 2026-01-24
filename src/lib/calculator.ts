import type {
  UserInputs,
  NotionalAccounts,
  YearlyResult,
  ProjectionSummary,
} from './types';
import {
  calculateSalaryTax,
  calculateCombinedPersonalTax,
  calculateCPP,
  calculateCPP2,
  calculateEI,
  calculateRequiredSalary,
  TFSA_ANNUAL_LIMIT,
  RRSP_CONTRIBUTION_RATE,
  RRSP_ANNUAL_LIMIT,
} from './taxRates';
import {
  calculateInvestmentReturns,
  updateAccountsFromReturns,
  depleteAccounts,
  processSalaryPayment,
} from './notionalAccounts';

/**
 * Main calculation function to project compensation over multiple years
 */
export function calculateProjection(inputs: UserInputs): ProjectionSummary {
  const yearlyResults: YearlyResult[] = [];

  // Initialize notional accounts
  let currentAccounts: NotionalAccounts = {
    CDA: inputs.cdaBalance,
    eRDTOH: inputs.eRDTOHBalance,
    nRDTOH: inputs.nRDTOHBalance,
    GRIP: inputs.gripBalance,
    corporateInvestments: inputs.corporateInvestmentBalance,
  };

  // Track RRSP room - start with user's existing room
  let availableRRSPRoom = inputs.rrspBalance || 0;

  // Track TFSA room - start with user's existing room
  let availableTFSARoom = inputs.tfsaBalance || 0;

  // Calculate each year
  for (let year = 1; year <= inputs.planningHorizon; year++) {
    const yearResult = calculateYear(
      inputs,
      currentAccounts,
      year,
      availableRRSPRoom,
      availableTFSARoom
    );

    yearlyResults.push(yearResult);

    // Update accounts for next year
    currentAccounts = yearResult.notionalAccounts;

    // Update RRSP room for next year (new room from salary minus contribution)
    availableRRSPRoom += yearResult.rrspRoomGenerated - yearResult.rrspContribution;

    // Update TFSA room for next year (annual limit minus contribution)
    availableTFSARoom += TFSA_ANNUAL_LIMIT - yearResult.tfsaContribution;
  }

  // Calculate summary statistics
  return calculateSummary(yearlyResults, inputs);
}

/**
 * Calculate a single year's compensation and taxes
 */
function calculateYear(
  inputs: UserInputs,
  startingAccounts: NotionalAccounts,
  year: number,
  availableRRSPRoom: number,
  availableTFSARoom: number
): YearlyResult {
  let accounts = { ...startingAccounts };

  // Track corporate tax on active business income (will be calculated after we know salary)
  let activeBusinessIncome = inputs.annualCorporateRetainedEarnings || 0;
  let corpTaxOnActiveIncome = 0;

  // 2. Calculate investment returns at the start of the year
  const investmentReturns = calculateInvestmentReturns(
    accounts.corporateInvestments,
    inputs.investmentReturnRate,
    inputs.canadianEquityPercent,
    inputs.usEquityPercent,
    inputs.internationalEquityPercent,
    inputs.fixedIncomePercent
  );

  // Update accounts with investment returns
  accounts = updateAccountsFromReturns(accounts, investmentReturns);

  // 3. Calculate required income (base + optional contributions)
  let requiredIncome = inputs.requiredIncome;
  let tfsaContribution = 0;
  let rrspContribution = 0;
  let respContribution = 0;
  let debtPaydown = 0;

  // TFSA contribution - use available room (carried forward) + annual limit
  if (inputs.maximizeTFSA) {
    // Can contribute up to available room (which includes any accumulated room)
    tfsaContribution = Math.min(availableTFSARoom + TFSA_ANNUAL_LIMIT, availableTFSARoom + TFSA_ANNUAL_LIMIT);
    // For now, just use annual limit for simplicity (room accumulation tracked separately)
    tfsaContribution = TFSA_ANNUAL_LIMIT;
    requiredIncome += tfsaContribution;
  }

  // RESP contribution
  if (inputs.contributeToRESP && inputs.respContributionAmount) {
    respContribution = inputs.respContributionAmount;
    requiredIncome += respContribution;
  }

  // Debt paydown
  if (inputs.payDownDebt && inputs.debtPaydownAmount) {
    debtPaydown = inputs.debtPaydownAmount;
    requiredIncome += debtPaydown;
  }

  // 4. Determine salary and dividend mix based on strategy
  let salary = 0;
  let dividendFunding = {
    capitalDividends: 0,
    eligibleDividends: 0,
    nonEligibleDividends: 0,
    regularDividends: 0,
    grossDividends: 0,
    afterTaxIncome: 0,
  };

  if (inputs.salaryStrategy === 'fixed' && inputs.fixedSalaryAmount) {
    // Fixed salary strategy
    salary = inputs.fixedSalaryAmount;
    const salaryTax = calculateSalaryTax(salary);
    const cpp = calculateCPP(salary);
    const cpp2Fixed = calculateCPP2(salary);
    const ei = calculateEI(salary);
    const salaryAfterTax = salary - salaryTax - cpp - cpp2Fixed - ei;

    // Process salary payment - employer pays CPP + CPP2 matching
    const employerCPP = cpp + cpp2Fixed; // Employer matches employee CPP + CPP2
    const employerEI = ei * 1.4; // Employer pays 1.4x employee EI
    accounts = processSalaryPayment(accounts, salary, employerCPP, employerEI);

    // Fund remaining with dividends
    const remainingNeeded = Math.max(0, requiredIncome - salaryAfterTax);
    if (remainingNeeded > 0) {
      const result = depleteAccounts(remainingNeeded, accounts);
      dividendFunding = result.funding;
      accounts = result.updatedAccounts;
    }
  } else if (inputs.salaryStrategy === 'dividends-only') {
    // Dividends only - no salary
    const result = depleteAccounts(requiredIncome, accounts);
    dividendFunding = result.funding;
    accounts = result.updatedAccounts;
  } else {
    // Dynamic strategy: deplete notional accounts first, then salary
    const result = depleteAccounts(requiredIncome, accounts);
    dividendFunding = result.funding;
    accounts = result.updatedAccounts;

    // If dividends don't cover full amount, take salary for remainder
    const remainingNeeded = requiredIncome - dividendFunding.afterTaxIncome;
    if (remainingNeeded > 1) {
      // Need salary to cover the gap
      salary = calculateRequiredSalary(remainingNeeded);

      // Process salary payment - include CPP2 in employer costs
      const cppDynamic = calculateCPP(salary);
      const cpp2Dynamic = calculateCPP2(salary);
      const eiDynamic = calculateEI(salary);
      const employerCPP = cppDynamic + cpp2Dynamic; // Employer matches CPP + CPP2
      const employerEI = eiDynamic * 1.4;
      accounts = processSalaryPayment(accounts, salary, employerCPP, employerEI);
    }
  }

  // 5. Calculate RRSP contribution first (affects tax calculation)
  // 6. RRSP contribution (if enabled and room available)
  if (inputs.contributeToRRSP && availableRRSPRoom > 0) {
    // Try to contribute up to available room (subject to annual limit)
    const maxContribution = Math.min(availableRRSPRoom, RRSP_ANNUAL_LIMIT);
    // Only contribute if we have the funds
    rrspContribution = Math.min(maxContribution, dividendFunding.afterTaxIncome * 0.1);
  }

  // 6. Calculate UNIFIED personal tax on combined salary + dividends
  // This properly applies:
  // - Basic personal amount to combined income
  // - Graduated brackets on total grossed-up income
  // - Dividend tax credits
  // - Ontario surtax on total provincial tax
  // - Ontario health premium on actual total income
  const combinedTaxResult = calculateCombinedPersonalTax(
    salary,
    dividendFunding.eligibleDividends,
    dividendFunding.nonEligibleDividends,
    rrspContribution
  );
  const personalTax = combinedTaxResult.totalTax;
  const ontarioSurtax = combinedTaxResult.ontarioSurtax;
  const ontarioHealthPremium = combinedTaxResult.ontarioHealthPremium;

  // CPP (base) and CPP2 (second tier since 2024)
  const cpp = calculateCPP(salary);
  const cpp2 = calculateCPP2(salary);
  const ei = calculateEI(salary);

  // Corporate tax calculation:
  // 1. Active business income is taxed AFTER deducting salary
  // Salary is a deductible expense, so taxable business income = Gross income - Salary
  const employerCPPCost = cpp + cpp2; // Employer matches employee CPP + CPP2
  const employerEICost = ei * 1.4; // Employer pays 1.4x employee EI
  const totalSalaryCost = salary + employerCPPCost + employerEICost;

  // Taxable corporate income from active business (after salary deduction)
  const taxableBusinessIncome = Math.max(0, activeBusinessIncome - totalSalaryCost);

  // Small business tax rate: 12.2% (9% federal + 3.2% Ontario)
  const SMALL_BUSINESS_RATE = 0.122;
  corpTaxOnActiveIncome = taxableBusinessIncome * SMALL_BUSINESS_RATE;

  // After-tax business income is what's available for retained earnings
  const afterTaxBusinessIncome = taxableBusinessIncome - corpTaxOnActiveIncome;

  // Add after-tax business income to corporate investments
  accounts.corporateInvestments += afterTaxBusinessIncome;

  // Add to GRIP: taxable income qualifies for GRIP if NOT taxed at small business rate
  // Since we're using small business rate, we don't add to GRIP here
  // GRIP is generated when income is taxed at the general rate (26.5%)

  // 2. Investment income tax
  // Foreign income + taxable capital gains: 50.17% total (26.5% non-refundable + 30.67% refundable)
  // Canadian dividends: Already taxed at source, generates 38.33% refundable credit
  const taxableCapitalGain = investmentReturns.realizedCapitalGain * 0.5;
  const taxableInvestmentIncome = investmentReturns.foreignIncome + taxableCapitalGain;
  const corpTaxOnInvestments = taxableInvestmentIncome * 0.5017;

  // Total corporate tax paid (both on active business and investment income)
  const corporateTax = corpTaxOnActiveIncome + corpTaxOnInvestments;

  // 7. Calculate RRSP room generated this year (18% of salary)
  const rrspRoomGenerated = salary * RRSP_CONTRIBUTION_RATE;

  // 8. Calculate total after-tax income
  // Total gross income = salary + actual dividends (capital dividends are tax-free)
  // personalTax now includes ALL tax on combined salary + dividends (unified calculation)
  // cpp/cpp2/ei are payroll deductions only on salary
  const totalGrossDividends = dividendFunding.capitalDividends +
    dividendFunding.eligibleDividends +
    dividendFunding.nonEligibleDividends;
  const afterTaxIncome = salary + totalGrossDividends - personalTax - cpp - cpp2 - ei;

  return {
    year,
    salary,
    dividends: dividendFunding,
    personalTax,
    corporateTax,
    cpp,
    cpp2,
    ei,
    ontarioSurtax,
    ontarioHealthPremium,
    totalTax: personalTax + corporateTax + cpp + cpp2 + ei,
    afterTaxIncome,
    rrspRoomGenerated,
    rrspContribution,
    tfsaContribution,
    respContribution,
    debtPaydown,
    notionalAccounts: accounts,
    investmentReturns,
  };
}

/**
 * Calculate summary statistics from yearly results
 */
function calculateSummary(
  yearlyResults: YearlyResult[],
  _inputs: UserInputs
): ProjectionSummary {
  let totalSalary = 0;
  let totalDividends = 0;
  let totalPersonalTax = 0;
  let totalCorporateTax = 0;
  let totalRRSPRoomGenerated = 0;
  let totalRRSPContributions = 0;
  let totalTFSAContributions = 0;

  for (const year of yearlyResults) {
    totalSalary += year.salary;
    totalDividends += year.dividends.grossDividends;
    totalPersonalTax += year.personalTax;
    totalCorporateTax += year.corporateTax;
    totalRRSPRoomGenerated += year.rrspRoomGenerated;
    totalRRSPContributions += year.rrspContribution;
    totalTFSAContributions += year.tfsaContribution;
  }

  const totalCompensation = totalSalary + totalDividends;
  const totalTax = totalPersonalTax + totalCorporateTax;
  const effectiveTaxRate = totalCompensation > 0 ? totalTax / totalCompensation : 0;
  const finalCorporateBalance =
    yearlyResults[yearlyResults.length - 1].notionalAccounts.corporateInvestments;
  const averageAnnualIncome = totalCompensation / yearlyResults.length;

  return {
    totalCompensation,
    totalSalary,
    totalDividends,
    totalPersonalTax,
    totalCorporateTax,
    totalTax,
    effectiveTaxRate,
    finalCorporateBalance,
    totalRRSPRoomGenerated,
    totalRRSPContributions,
    totalTFSAContributions,
    averageAnnualIncome,
    yearlyResults,
  };
}

/**
 * Compare two strategies side-by-side
 */
export function compareStrategies(
  inputs1: UserInputs,
  inputs2: UserInputs
): {
  strategy1: ProjectionSummary;
  strategy2: ProjectionSummary;
  comparison: {
    taxSavings: number;
    finalBalanceDifference: number;
    rrspRoomDifference: number;
  };
} {
  const strategy1 = calculateProjection(inputs1);
  const strategy2 = calculateProjection(inputs2);

  return {
    strategy1,
    strategy2,
    comparison: {
      taxSavings: strategy2.totalTax - strategy1.totalTax,
      finalBalanceDifference:
        strategy1.finalCorporateBalance - strategy2.finalCorporateBalance,
      rrspRoomDifference:
        strategy1.totalRRSPRoomGenerated - strategy2.totalRRSPRoomGenerated,
    },
  };
}

// Prevent unused warning
export const __unused = compareStrategies;
