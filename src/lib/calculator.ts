import type {
  UserInputs,
  NotionalAccounts,
  YearlyResult,
  ProjectionSummary,
} from './types';
import {
  getTaxYearData,
  getContributionLimitsForYear,
  inflateAmount,
  getStartingYear,
  getDefaultInflationRate,
  getQuebecPayrollData,
  calculateQPP,
  calculateQPP2,
  calculateQPIPEmployee,
  calculateQuebecEI,
  calculatePassiveIncomeGrind,
} from './tax';
import type { TaxYearData } from './tax';
import {
  calculateInvestmentReturns,
  updateAccountsFromReturns,
  depleteAccountsWithRates,
  processSalaryPayment,
} from './notionalAccounts';

/**
 * Calculate effective dividend tax rate at a given income level
 * This is the combined federal + provincial tax on dividends minus credits
 * Used for estimating gross dividend needed to achieve target after-tax income
 */
function calculateEffectiveDividendRate(
  taxData: TaxYearData,
  dividendType: 'eligible' | 'nonEligible',
  estimatedTaxableIncome: number = 150000 // Default to mid-income estimate
): number {
  const dividendInfo = dividendType === 'eligible'
    ? taxData.dividend.eligible
    : taxData.dividend.nonEligible;

  // Get the gross-up factor
  const grossUp = dividendInfo.grossUp;

  // Get marginal rates at the estimated income level (not top rates)
  const federalBrackets = taxData.federal.brackets;
  const provincialBrackets = taxData.provincial.brackets;

  const federalRate = getMarginalRateAtIncome(federalBrackets, estimatedTaxableIncome);
  const provincialRate = getMarginalRateAtIncome(provincialBrackets, estimatedTaxableIncome);

  // Tax on grossed-up dividend
  const grossedUpTax = (1 + grossUp) * (federalRate + provincialRate);

  // Credits (as a percentage of grossed-up amount)
  const federalCredit = (1 + grossUp) * dividendInfo.federalCredit;
  const provincialCredit = (1 + grossUp) * dividendInfo.provincialCredit;

  // Net tax as percentage of actual dividend received
  const effectiveRate = grossedUpTax - federalCredit - provincialCredit;

  // Ensure non-negative (some low-bracket scenarios could have negative rates)
  return Math.max(0, effectiveRate);
}

/**
 * Get the marginal tax rate at a specific income level
 */
function getMarginalRateAtIncome(
  brackets: Array<{ threshold: number; rate: number }>,
  income: number
): number {
  let rate = brackets[0].rate;
  for (const bracket of brackets) {
    if (income > bracket.threshold) {
      rate = bracket.rate;
    } else {
      break;
    }
  }
  return rate;
}

/**
 * Calculate personal tax using year-specific rates
 */
function calculatePersonalTaxForYear(
  salary: number,
  eligibleDividends: number,
  nonEligibleDividends: number,
  rrspDeduction: number,
  taxData: TaxYearData
): {
  federalTax: number;
  provincialTax: number;
  provincialSurtax: number;
  healthPremium: number;
  dividendTaxCredits: number;
  totalTax: number;
} {
  // Step 1: Calculate grossed-up dividend amounts
  const eligibleGrossUp = eligibleDividends * (1 + taxData.dividend.eligible.grossUp);
  const nonEligibleGrossUp = nonEligibleDividends * (1 + taxData.dividend.nonEligible.grossUp);

  // Step 2: Calculate total taxable income (salary + grossed-up dividends - RRSP)
  const grossedUpIncome = salary + eligibleGrossUp + nonEligibleGrossUp;
  const taxableIncome = Math.max(0, grossedUpIncome - rrspDeduction);

  if (taxableIncome <= 0) {
    return {
      federalTax: 0,
      provincialTax: 0,
      provincialSurtax: 0,
      healthPremium: 0,
      dividendTaxCredits: 0,
      totalTax: 0,
    };
  }

  // Step 3: Calculate federal tax on combined income (minus BPA)
  const federalTaxableIncome = Math.max(0, taxableIncome - taxData.federal.basicPersonalAmount);
  const federalTaxBeforeCredits = calculateTaxByBrackets(federalTaxableIncome, taxData.federal.brackets);

  // Step 4: Calculate provincial tax on combined income (minus BPA)
  const provincialTaxableIncome = Math.max(0, taxableIncome - taxData.provincial.basicPersonalAmount);
  const provincialTaxBeforeCredits = calculateTaxByBrackets(provincialTaxableIncome, taxData.provincial.brackets);

  // Step 5: Calculate dividend tax credits
  const federalEligibleDTC = eligibleGrossUp * taxData.dividend.eligible.federalCredit;
  const federalNonEligibleDTC = nonEligibleGrossUp * taxData.dividend.nonEligible.federalCredit;
  const totalFederalDTC = federalEligibleDTC + federalNonEligibleDTC;

  const provincialEligibleDTC = eligibleGrossUp * taxData.dividend.eligible.provincialCredit;
  const provincialNonEligibleDTC = nonEligibleGrossUp * taxData.dividend.nonEligible.provincialCredit;
  const totalProvincialDTC = provincialEligibleDTC + provincialNonEligibleDTC;

  const dividendTaxCredits = totalFederalDTC + totalProvincialDTC;

  // Step 6: Calculate net federal and provincial tax (after credits)
  const federalTax = Math.max(0, federalTaxBeforeCredits - totalFederalDTC);
  const provincialTaxBeforeSurtax = Math.max(0, provincialTaxBeforeCredits - totalProvincialDTC);

  // Step 7: Provincial surtax on provincial tax payable (AFTER credits)
  let provincialSurtax = 0;
  if (provincialTaxBeforeSurtax > taxData.provincial.surtax.firstThreshold) {
    provincialSurtax += (provincialTaxBeforeSurtax - taxData.provincial.surtax.firstThreshold) *
      taxData.provincial.surtax.firstRate;
  }
  if (provincialTaxBeforeSurtax > taxData.provincial.surtax.secondThreshold) {
    provincialSurtax += (provincialTaxBeforeSurtax - taxData.provincial.surtax.secondThreshold) *
      taxData.provincial.surtax.secondRate;
  }

  // Step 8: Health Premium (based on actual taxable income, not grossed-up)
  const actualIncome = salary + eligibleDividends + nonEligibleDividends - rrspDeduction;
  const healthPremium = calculateHealthPremium(Math.max(0, actualIncome), taxData);

  // Total provincial tax includes surtax
  const provincialTax = provincialTaxBeforeSurtax + provincialSurtax;

  // Step 9: Total personal tax
  const totalTax = federalTax + provincialTax + healthPremium;

  return {
    federalTax,
    provincialTax,
    provincialSurtax,
    healthPremium,
    dividendTaxCredits,
    totalTax,
  };
}

/**
 * Calculate tax by brackets
 */
function calculateTaxByBrackets(
  income: number,
  brackets: Array<{ threshold: number; rate: number }>
): number {
  let tax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const nextThreshold = i < brackets.length - 1 ? brackets[i + 1].threshold : Infinity;

    if (income <= bracket.threshold) {
      break;
    }

    const taxableInThisBracket = Math.min(income, nextThreshold) - bracket.threshold;
    tax += taxableInThisBracket * bracket.rate;

    if (income <= nextThreshold) {
      break;
    }
  }

  return tax;
}

/**
 * Calculate Ontario Health Premium
 */
function calculateHealthPremium(taxableIncome: number, taxData: TaxYearData): number {
  const brackets = taxData.provincial.healthPremium.brackets;

  if (taxableIncome <= 20000) return 0;

  // Find applicable bracket
  let applicableBracket = brackets[0];
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].threshold) {
      applicableBracket = brackets[i];
      break;
    }
  }

  const premium = applicableBracket.base +
    (taxableIncome - applicableBracket.threshold) * applicableBracket.rate;

  return Math.min(premium, applicableBracket.maxPremium);
}

/**
 * Calculate CPP for year-specific limits
 */
function calculateCPPForYear(salary: number, taxData: TaxYearData): number {
  if (salary <= taxData.cpp.basicExemption) return 0;

  const pensionableEarnings = Math.min(
    salary - taxData.cpp.basicExemption,
    taxData.cpp.ympe - taxData.cpp.basicExemption
  );

  return pensionableEarnings * taxData.cpp.rate;
}

/**
 * Calculate CPP2 for year-specific limits
 */
function calculateCPP2ForYear(salary: number, taxData: TaxYearData): number {
  if (salary <= taxData.cpp2.firstCeiling) return 0;

  const cpp2Earnings = Math.min(
    salary - taxData.cpp2.firstCeiling,
    taxData.cpp2.secondCeiling - taxData.cpp2.firstCeiling
  );

  return cpp2Earnings * taxData.cpp2.rate;
}

/**
 * Calculate EI for year-specific limits
 */
function calculateEIForYear(salary: number, taxData: TaxYearData): number {
  if (salary <= 0) return 0;

  const insurableEarnings = Math.min(salary, taxData.ei.maxInsurableEarnings);

  return insurableEarnings * taxData.ei.rate;
}

/**
 * Calculate payroll deductions for any province
 * Returns { cpp, cpp2, ei, qpip } - uses QPP for Quebec
 */
function calculatePayrollDeductions(
  salary: number,
  taxData: TaxYearData,
  province: string,
  calendarYear: number,
  inflationRate: number
): { cpp: number; cpp2: number; ei: number; qpip: number; employerCost: number } {
  if (province === 'QC') {
    // Quebec uses QPP/QPP2/QPIP with reduced EI
    const qcData = getQuebecPayrollData(calendarYear, inflationRate);
    const cpp = calculateQPP(salary, qcData.qpp);
    const cpp2 = calculateQPP2(salary, qcData.qpp2);
    const ei = calculateQuebecEI(salary, qcData.ei);
    const qpip = calculateQPIPEmployee(salary, qcData.qpip);

    // Employer costs: matches employee for QPP/QPP2, higher rate for QPIP
    const employerQPP = cpp;
    const employerQPP2 = cpp2;
    const employerEI = ei * qcData.ei.employerMultiplier;
    const employerQPIP = salary > 0
      ? Math.min(salary, qcData.qpip.maxInsurableEarnings) * qcData.qpip.employerRate
      : 0;

    return {
      cpp,
      cpp2,
      ei,
      qpip,
      employerCost: employerQPP + employerQPP2 + employerEI + employerQPIP,
    };
  } else {
    // Rest of Canada uses CPP/CPP2/EI
    const cpp = calculateCPPForYear(salary, taxData);
    const cpp2 = calculateCPP2ForYear(salary, taxData);
    const ei = calculateEIForYear(salary, taxData);

    // Employer costs: matches employee for CPP/CPP2, multiplier for EI
    const employerCost = cpp + cpp2 + (ei * taxData.ei.employerMultiplier);

    return {
      cpp,
      cpp2,
      ei,
      qpip: 0, // No QPIP outside Quebec
      employerCost,
    };
  }
}

/**
 * Calculate required gross salary to achieve target after-tax amount
 */
function calculateRequiredSalaryForYear(
  targetAfterTax: number,
  taxData: TaxYearData,
  province: string,
  calendarYear: number,
  inflationRate: number,
  maxIterations: number = 10
): number {
  let estimatedSalary = targetAfterTax * 1.5;

  for (let i = 0; i < maxIterations; i++) {
    const taxResult = calculatePersonalTaxForYear(estimatedSalary, 0, 0, 0, taxData);
    const payroll = calculatePayrollDeductions(estimatedSalary, taxData, province, calendarYear, inflationRate);
    const totalPayroll = payroll.cpp + payroll.cpp2 + payroll.ei + payroll.qpip;
    const afterTax = estimatedSalary - taxResult.totalTax - totalPayroll;

    const difference = targetAfterTax - afterTax;

    if (Math.abs(difference) < 1) {
      return estimatedSalary;
    }

    estimatedSalary += difference * 1.4;
  }

  return estimatedSalary;
}

/**
 * Main calculation function to project compensation over multiple years
 */
export function calculateProjection(inputs: UserInputs): ProjectionSummary {
  const yearlyResults: YearlyResult[] = [];

  // Get starting year and inflation rate (with defaults for backward compatibility)
  const startingYear = inputs.startingYear || getStartingYear();
  const inflationRate = inputs.expectedInflationRate ?? getDefaultInflationRate();
  const inflateSpending = inputs.inflateSpendingNeeds ?? true;

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
  for (let yearIndex = 0; yearIndex < inputs.planningHorizon; yearIndex++) {
    const calendarYear = startingYear + yearIndex;

    // Get tax data for this specific year and province
    const taxData = getTaxYearData(calendarYear, inflationRate, inputs.province);
    const contributionLimits = getContributionLimitsForYear(calendarYear, inflationRate);

    // Calculate inflation-adjusted spending needs
    const inflatedRequiredIncome = inflateSpending
      ? inflateAmount(inputs.requiredIncome, yearIndex, inflationRate)
      : inputs.requiredIncome;

    const yearResult = calculateYear(
      inputs,
      currentAccounts,
      yearIndex + 1, // Display year (1-indexed)
      calendarYear,
      availableRRSPRoom,
      availableTFSARoom,
      inflatedRequiredIncome,
      taxData,
      contributionLimits,
      inflationRate
    );

    yearlyResults.push(yearResult);

    // Update accounts for next year
    currentAccounts = yearResult.notionalAccounts;

    // Update RRSP room for next year (new room from salary minus contribution)
    availableRRSPRoom += yearResult.rrspRoomGenerated - yearResult.rrspContribution;

    // Update TFSA room for next year (annual limit minus contribution)
    availableTFSARoom += contributionLimits.tfsaLimit - yearResult.tfsaContribution;
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
  displayYear: number,
  calendarYear: number,
  availableRRSPRoom: number,
  _availableTFSARoom: number, // TODO: Implement TFSA contribution logic
  inflatedRequiredIncome: number,
  taxData: TaxYearData,
  contributionLimits: { tfsaLimit: number; rrspLimit: number; rrspRate: number },
  inflationRate: number
): YearlyResult {
  let accounts = { ...startingAccounts };
  const province = inputs.province;

  // Track corporate tax on active business income (will be calculated after we know salary)
  const activeBusinessIncome = inputs.annualCorporateRetainedEarnings || 0;
  let corpTaxOnActiveIncome = 0;

  // Calculate investment returns at the start of the year
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

  // Calculate required income (base + optional contributions)
  let requiredIncome = inflatedRequiredIncome;
  let tfsaContribution = 0;
  let rrspContribution = 0;
  let respContribution = 0;
  let debtPaydown = 0;

  // TFSA contribution
  if (inputs.maximizeTFSA) {
    tfsaContribution = contributionLimits.tfsaLimit;
    requiredIncome += tfsaContribution;
  }

  // RESP contribution (may also be inflated)
  if (inputs.contributeToRESP && inputs.respContributionAmount) {
    respContribution = inputs.inflateSpendingNeeds
      ? inflateAmount(inputs.respContributionAmount, displayYear - 1, inflationRate)
      : inputs.respContributionAmount;
    requiredIncome += respContribution;
  }

  // Debt paydown (typically NOT inflated - it's a fixed nominal amount)
  if (inputs.payDownDebt && inputs.debtPaydownAmount) {
    debtPaydown = inputs.debtPaydownAmount;
    requiredIncome += debtPaydown;
  }

  // Determine salary and dividend mix based on strategy
  let salary = 0;
  let dividendFunding = {
    capitalDividends: 0,
    eligibleDividends: 0,
    nonEligibleDividends: 0,
    regularDividends: 0,
    grossDividends: 0,
    afterTaxIncome: 0,
  };
  let rdtohRefundReceived = 0;

  // Effective dividend tax rates based on province-specific rates at estimated income level
  // Estimate taxable income as ~1.5x required after-tax (rough gross-up)
  const estimatedTaxableIncome = inflatedRequiredIncome * 1.5;
  const eligibleEffectiveRate = calculateEffectiveDividendRate(taxData, 'eligible', estimatedTaxableIncome);
  const nonEligibleEffectiveRate = calculateEffectiveDividendRate(taxData, 'nonEligible', estimatedTaxableIncome);

  if (inputs.salaryStrategy === 'fixed' && inputs.fixedSalaryAmount) {
    // Fixed salary strategy - may also want to inflate the fixed amount
    const fixedSalary = inputs.inflateSpendingNeeds
      ? inflateAmount(inputs.fixedSalaryAmount, displayYear - 1, inflationRate)
      : inputs.fixedSalaryAmount;

    salary = fixedSalary;
    const salaryTaxResult = calculatePersonalTaxForYear(salary, 0, 0, 0, taxData);
    const payroll = calculatePayrollDeductions(salary, taxData, province, calendarYear, inflationRate);
    const salaryAfterTax = salary - salaryTaxResult.totalTax - payroll.cpp - payroll.cpp2 - payroll.ei - payroll.qpip;

    // Process salary payment - employer pays matching contributions
    accounts = processSalaryPayment(accounts, salary, payroll.employerCost - payroll.cpp - payroll.cpp2, payroll.cpp + payroll.cpp2);

    // Fund remaining with dividends
    const remainingNeeded = Math.max(0, requiredIncome - salaryAfterTax);
    if (remainingNeeded > 0) {
      const result = depleteAccountsWithRates(
        remainingNeeded,
        accounts,
        taxData.rdtoh.refundRate,
        eligibleEffectiveRate,
        nonEligibleEffectiveRate
      );
      dividendFunding = result.funding;
      accounts = result.updatedAccounts;
      rdtohRefundReceived = result.rdtohRefund;
    }
  } else if (inputs.salaryStrategy === 'dividends-only') {
    // Dividends only - no salary
    const result = depleteAccountsWithRates(
      requiredIncome,
      accounts,
      taxData.rdtoh.refundRate,
      eligibleEffectiveRate,
      nonEligibleEffectiveRate
    );
    dividendFunding = result.funding;
    accounts = result.updatedAccounts;
    rdtohRefundReceived = result.rdtohRefund;
  } else {
    // Dynamic strategy: deplete notional accounts first, then salary
    const result = depleteAccountsWithRates(
      requiredIncome,
      accounts,
      taxData.rdtoh.refundRate,
      eligibleEffectiveRate,
      nonEligibleEffectiveRate
    );
    dividendFunding = result.funding;
    accounts = result.updatedAccounts;
    rdtohRefundReceived = result.rdtohRefund;

    // If dividends don't cover full amount, take salary for remainder
    const remainingNeeded = requiredIncome - dividendFunding.afterTaxIncome;
    if (remainingNeeded > 1) {
      salary = calculateRequiredSalaryForYear(remainingNeeded, taxData, province, calendarYear, inflationRate);

      // Process salary payment
      const payrollDynamic = calculatePayrollDeductions(salary, taxData, province, calendarYear, inflationRate);
      accounts = processSalaryPayment(accounts, salary, payrollDynamic.employerCost - payrollDynamic.cpp - payrollDynamic.cpp2, payrollDynamic.cpp + payrollDynamic.cpp2);
    }
  }

  // RRSP contribution (if enabled and room available)
  if (inputs.contributeToRRSP && availableRRSPRoom > 0) {
    const maxContribution = Math.min(availableRRSPRoom, contributionLimits.rrspLimit);
    rrspContribution = Math.min(maxContribution, dividendFunding.afterTaxIncome * 0.1);
  }

  // Calculate UNIFIED personal tax on combined salary + dividends
  const combinedTaxResult = calculatePersonalTaxForYear(
    salary,
    dividendFunding.eligibleDividends,
    dividendFunding.nonEligibleDividends,
    rrspContribution,
    taxData
  );
  const personalTax = combinedTaxResult.totalTax;
  const provincialSurtax = combinedTaxResult.provincialSurtax;
  const healthPremium = combinedTaxResult.healthPremium;

  // Payroll deductions (uses QPP/QPIP for Quebec, CPP/EI for others)
  const payroll = calculatePayrollDeductions(salary, taxData, province, calendarYear, inflationRate);
  const cpp = payroll.cpp;
  const cpp2 = payroll.cpp2;
  const ei = payroll.ei;
  const qpip = payroll.qpip;

  // Corporate tax calculation with passive income grind (SBD clawback)
  const totalSalaryCost = salary + payroll.employerCost;

  // Calculate passive income for SBD grind
  // AAII = interest + foreign income + 50% of capital gains
  const taxableCapitalGain = investmentReturns.realizedCapitalGain * 0.5;
  const totalPassiveIncome = investmentReturns.foreignIncome + taxableCapitalGain;

  // Calculate the passive income grind and its impact on SBD
  const grindResult = calculatePassiveIncomeGrind(
    totalPassiveIncome,
    Math.max(0, activeBusinessIncome - totalSalaryCost),
    taxData.corporate.smallBusiness,
    taxData.corporate.general
  );

  // Calculate corporate tax on active business income with grind applied
  const taxableBusinessIncome = Math.max(0, activeBusinessIncome - totalSalaryCost);

  // If SBD is reduced, some income gets taxed at general rate instead
  const sbdIncome = Math.min(taxableBusinessIncome, grindResult.reducedSBDLimit);
  const generalIncome = Math.max(0, taxableBusinessIncome - grindResult.reducedSBDLimit);

  corpTaxOnActiveIncome = (sbdIncome * taxData.corporate.smallBusiness) +
                          (generalIncome * taxData.corporate.general);

  const afterTaxBusinessIncome = taxableBusinessIncome - corpTaxOnActiveIncome;
  accounts.corporateInvestments += afterTaxBusinessIncome;

  // Investment income tax (passive income is taxed at higher rate with RDTOH refund mechanism)
  const taxableInvestmentIncome = investmentReturns.foreignIncome + taxableCapitalGain;
  const corpTaxOnInvestments = taxableInvestmentIncome * 0.5017;

  const corporateTax = corpTaxOnActiveIncome + corpTaxOnInvestments;

  // Store passive income grind info for reporting
  const passiveIncomeGrind = {
    totalPassiveIncome,
    reducedSBDLimit: grindResult.reducedSBDLimit,
    sbdReduction: grindResult.sbdReduction,
    additionalTaxFromGrind: grindResult.additionalTaxFromGrind,
    isFullyGrounded: grindResult.isFullyGrounded,
  };

  // RRSP room generated this year
  const rrspRoomGenerated = salary * contributionLimits.rrspRate;

  // Total after-tax income (include QPIP for Quebec)
  const totalGrossDividends = dividendFunding.capitalDividends +
    dividendFunding.eligibleDividends +
    dividendFunding.nonEligibleDividends;
  const afterTaxIncome = salary + totalGrossDividends - personalTax - cpp - cpp2 - ei - qpip;

  return {
    year: displayYear,
    salary,
    dividends: dividendFunding,
    personalTax,
    corporateTax,
    corporateTaxOnActive: corpTaxOnActiveIncome,
    corporateTaxOnPassive: corpTaxOnInvestments,
    rdtohRefundReceived,
    cpp,
    cpp2,
    ei,
    qpip,
    provincialSurtax,
    healthPremium,
    totalTax: personalTax + corporateTax + cpp + cpp2 + ei + qpip,
    afterTaxIncome,
    rrspRoomGenerated,
    rrspContribution,
    tfsaContribution,
    respContribution,
    debtPaydown,
    notionalAccounts: accounts,
    investmentReturns,
    passiveIncomeGrind,
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
  let totalCorporateTaxOnActive = 0;
  let totalCorporateTaxOnPassive = 0;
  let totalRdtohRefund = 0;
  let totalRRSPRoomGenerated = 0;
  let totalRRSPContributions = 0;
  let totalTFSAContributions = 0;
  let totalCpp = 0;
  let totalPassiveIncome = 0;

  for (const year of yearlyResults) {
    totalSalary += year.salary;
    totalDividends += year.dividends.grossDividends;
    totalPersonalTax += year.personalTax;
    totalCorporateTax += year.corporateTax;
    totalCorporateTaxOnActive += year.corporateTaxOnActive;
    totalCorporateTaxOnPassive += year.corporateTaxOnPassive;
    totalRdtohRefund += year.rdtohRefundReceived;
    totalRRSPRoomGenerated += year.rrspRoomGenerated;
    totalRRSPContributions += year.rrspContribution;
    totalTFSAContributions += year.tfsaContribution;
    totalCpp += year.cpp + year.cpp2 + year.ei + year.qpip;
    totalPassiveIncome += year.investmentReturns.totalReturn;
  }

  const totalCompensation = totalSalary + totalDividends;
  const totalTax = totalPersonalTax + totalCorporateTax;
  const effectiveTaxRate = totalCompensation > 0 ? totalTax / totalCompensation : 0;

  // Effective INTEGRATED rate on compensation
  // This includes:
  // - Personal tax on salary and dividends
  // - Payroll taxes (CPP/EI)
  // - Corporate tax on active income (since dividends are paid from after-tax corp funds)
  // This shows the TRUE cost of extracting money from the corp
  const effectiveCompensationRate = totalCompensation > 0
    ? (totalPersonalTax + totalCpp + totalCorporateTaxOnActive) / totalCompensation
    : 0;

  // Net effective rate on passive investment income (gross tax - RDTOH refund)
  const netPassiveTax = totalCorporateTaxOnPassive - totalRdtohRefund;
  const effectivePassiveRate = totalPassiveIncome > 0
    ? netPassiveTax / totalPassiveIncome
    : 0;

  const finalCorporateBalance =
    yearlyResults[yearlyResults.length - 1].notionalAccounts.corporateInvestments;
  const averageAnnualIncome = totalCompensation / yearlyResults.length;

  return {
    totalCompensation,
    totalSalary,
    totalDividends,
    totalPersonalTax,
    totalCorporateTax,
    totalCorporateTaxOnActive,
    totalCorporateTaxOnPassive,
    totalRdtohRefund,
    totalTax,
    effectiveTaxRate,
    effectiveCompensationRate,
    effectivePassiveRate,
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
