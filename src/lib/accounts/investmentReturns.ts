import type { InvestmentReturns } from '../types';

// ─── Per-Asset-Class Constants ────────────────────────────────────────────────
// Empirically grounded from historical index data (XIC, VFV/S&P500, XEF/MSCI EAFE, XBB).
// Sources: iShares Canada, Vanguard Canada, PWL Capital, FTSE Russell (2025).

/** Default expected total return per asset class (used to compute blended investmentReturnRate) */
export const ASSET_CLASS_DEFAULT_RETURNS = {
  canadianEquity:      0.085,  // TSX Composite long-run total return
  usEquity:            0.095,  // S&P 500 long-run total return
  internationalEquity: 0.070,  // MSCI EAFE long-run total return
  fixedIncome:         0.040,  // Canadian bond index (yield-based)
} as const;

// Annual income rates as fraction of balance (not of return)
const CANADIAN_EQUITY_DIVIDEND_RATE   = 0.028;  // TSX ~2.8% dividend yield (XIC trailing avg)
const US_EQUITY_FOREIGN_INCOME_RATE   = 0.015;  // S&P 500 ~1.5% dividend yield (2010-2024 avg)
const INTL_EQUITY_FOREIGN_INCOME_RATE = 0.030;  // MSCI EAFE ~3.0% dividend yield (XEF/IEFA avg)

// Annual realized capital gains from ETF portfolio turnover (very low for passive index ETFs)
// ETFs use in-kind creation/redemption — negligible capital gains distributions.
const CANADIAN_EQUITY_TURNOVER_CG = 0.003;  // ~0.3% of balance/yr
const US_EQUITY_TURNOVER_CG       = 0.003;  // ~0.3% of balance/yr
const INTL_EQUITY_TURNOVER_CG     = 0.004;  // ~0.4% of balance/yr (slightly more index churn)
const FIXED_INCOME_TURNOVER_CG    = 0.000;  // bonds: zero realized CG over full rate cycle

// US/international withholding tax rate on dividends (Canada-US treaty: 15%)
const FOREIGN_WITHHOLDING_RATE = 0.15;

// nRDTOH refundable rate on passive investment income (Part I.3 tax)
const NERDTOH_RATE = 0.3067;

// eRDTOH: Part IV tax on Canadian eligible dividends received (s.186)
const ERDTOH_RATE = 0.3833;

// Capital gains inclusion rate (50% — confirmed current law, proposed 66.67% increase
// was cancelled by the Canadian government on March 21, 2025)
const CG_INCLUSION_RATE = 0.50;

/**
 * Compute the blended investment return rate from per-class allocations and default returns.
 * Call this to populate `investmentReturnRate` when user hasn't overridden it.
 */
export function computeBlendedReturnRate(
  canadianEquityPercent: number,
  usEquityPercent: number,
  internationalEquityPercent: number,
  fixedIncomePercent: number,
  canadianEquityReturnRate?: number,
  usEquityReturnRate?: number,
  internationalEquityReturnRate?: number,
  fixedIncomeReturnRate?: number,
): number {
  const w = {
    ca:   canadianEquityPercent       / 100,
    us:   usEquityPercent             / 100,
    intl: internationalEquityPercent  / 100,
    fi:   fixedIncomePercent          / 100,
  };
  return (
    w.ca   * (canadianEquityReturnRate      ?? ASSET_CLASS_DEFAULT_RETURNS.canadianEquity) +
    w.us   * (usEquityReturnRate            ?? ASSET_CLASS_DEFAULT_RETURNS.usEquity) +
    w.intl * (internationalEquityReturnRate ?? ASSET_CLASS_DEFAULT_RETURNS.internationalEquity) +
    w.fi   * (fixedIncomeReturnRate         ?? ASSET_CLASS_DEFAULT_RETURNS.fixedIncome)
  );
}

/**
 * Calculate investment returns for the corporate account.
 *
 * Uses per-asset-class income rates grounded in historical index data.
 * Realized capital gains are based on ETF portfolio turnover only (~0.3-0.4%/yr),
 * NOT on 50% of annual price appreciation — that was the old (incorrect) approach.
 *
 * Unrealized capital gains are tracked but NOT taxed until disposition (not in AAII).
 * This is correct per ITA: only realized gains are included in aggregate investment income.
 */
export function calculateInvestmentReturns(
  corporateBalance: number,
  returnRate: number = computeBlendedReturnRate(33.33, 33.33, 33.34, 0),
  canadianEquityPercent: number = 33.33,
  usEquityPercent: number = 33.33,
  internationalEquityPercent: number = 33.34,
  fixedIncomePercent: number = 0,
): InvestmentReturns {
  if (corporateBalance <= 0) {
    return {
      totalReturn: 0, canadianDividends: 0, foreignIncome: 0,
      realizedCapitalGain: 0, unrealizedCapitalGain: 0,
      CDAIncrease: 0, nRDTOHIncrease: 0, eRDTOHIncrease: 0, GRIPIncrease: 0,
    };
  }

  const totalReturn = corporateBalance * returnRate;

  const wCA   = canadianEquityPercent      / 100;
  const wUS   = usEquityPercent            / 100;
  const wIntl = internationalEquityPercent / 100;
  const wFI   = fixedIncomePercent         / 100;

  // ── Income from each asset class ────────────────────────────────────────────
  const canadianDividends    = corporateBalance * wCA   * CANADIAN_EQUITY_DIVIDEND_RATE;
  const usForeignDividends   = corporateBalance * wUS   * US_EQUITY_FOREIGN_INCOME_RATE;
  const intlForeignDividends = corporateBalance * wIntl * INTL_EQUITY_FOREIGN_INCOME_RATE;

  // Fixed income: all return is interest income — treated as passive income for AAII
  const interestIncome = corporateBalance * wFI * ASSET_CLASS_DEFAULT_RETURNS.fixedIncome;

  const foreignIncome    = usForeignDividends + intlForeignDividends + interestIncome;
  const foreignDividends = usForeignDividends + intlForeignDividends;

  // ── Realized capital gains (turnover-based, NOT price-appreciation-based) ───
  const realizedCapitalGain =
    corporateBalance * wCA   * CANADIAN_EQUITY_TURNOVER_CG +
    corporateBalance * wUS   * US_EQUITY_TURNOVER_CG +
    corporateBalance * wIntl * INTL_EQUITY_TURNOVER_CG +
    corporateBalance * wFI   * FIXED_INCOME_TURNOVER_CG;

  // ── Unrealized capital gains — NOT in AAII, not taxed until disposition ─────
  const totalPriceAppreciation = totalReturn - canadianDividends - foreignIncome;
  const unrealizedCapitalGain  = Math.max(0, totalPriceAppreciation - realizedCapitalGain);

  // ── Notional account updates ─────────────────────────────────────────────────

  // CDA: non-taxable half of realized capital gains (flows to CDA, payable tax-free)
  const CDAIncrease = realizedCapitalGain * (1 - CG_INCLUSION_RATE);

  // nRDTOH: 30.67% of aggregate investment income per ITA s.129(3).
  // Aggregate investment income includes foreign passive income AND taxable capital gains.
  // Per s.126(1): the FTC for withholding reduces the nRDTOH addition —
  // 15% withholding on foreign dividends is a permanent (non-recoverable) cost.
  const taxableCapitalGain = realizedCapitalGain * CG_INCLUSION_RATE;
  const grossNRDTOH        = (foreignIncome + taxableCapitalGain) * NERDTOH_RATE;
  const withholdingCredit  = foreignDividends * FOREIGN_WITHHOLDING_RATE;
  const nRDTOHIncrease     = Math.max(0, grossNRDTOH - withholdingCredit);

  // eRDTOH: 38.33% Part IV tax on Canadian eligible dividends received (s.186)
  const eRDTOHIncrease = canadianDividends * ERDTOH_RATE;

  // GRIP: eligible dividends received add to GRIP (ITA 89(1))
  const GRIPIncrease = canadianDividends;

  return {
    totalReturn,
    canadianDividends,
    foreignIncome,
    realizedCapitalGain,
    unrealizedCapitalGain,
    CDAIncrease,
    nRDTOHIncrease,
    eRDTOHIncrease,
    GRIPIncrease,
  };
}
