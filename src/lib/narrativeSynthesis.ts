/**
 * Narrative synthesis for the Recommended tab.
 *
 * Pure functions: given winner/runner data, returns a human-readable explanation
 * of why the winning strategy was chosen. Template strings only — no AI, no
 * external dependencies.
 */

import { formatCurrency } from './formatters';

export interface NarrativeInput {
  winnerId: string;
  winnerLabel: string;
  runnerId: string;
  runnerLabel: string;
  lifetimeTaxDifference: number;    // positive = winner pays less tax
  estateValueDifference: number;    // positive = winner leaves more
  rrspRoomDifference: number;       // positive = winner builds more RRSP room
  annualRetirementIncome: number;
  retirementSuccessRate: number;    // 0–1
  objective: 'maximize-spending' | 'maximize-estate' | 'balanced';
  hasSpouse?: boolean;              // if true, RRSP/RRIF rolls to spouse tax-deferred (ITA s.70(6))
}

/**
 * Build a 1–2 sentence narrative explaining why the winning strategy was chosen.
 */
export function buildRecommendationNarrative(input: NarrativeInput): string {
  const {
    winnerId, winnerLabel, runnerLabel,
    lifetimeTaxDifference, estateValueDifference, rrspRoomDifference,
    annualRetirementIncome, retirementSuccessRate, hasSpouse,
  } = input;

  // Append if a spousal rollover applies: RRSP/RRIF passes to spouse tax-deferred (ITA s.70(6))
  const spouseNote = hasSpouse
    ? ' Your RRSP/RRIF transfers to your spouse tax-deferred at death, preserving estate value.'
    : '';

  const taxSavings = Math.abs(lifetimeTaxDifference);
  const estateDiff = Math.abs(estateValueDifference);
  const rrspDiff   = Math.abs(rrspRoomDifference);
  const successPct = Math.round(retirementSuccessRate * 100);
  const income     = formatCurrency(annualRetirementIncome);

  if (winnerId === 'dynamic') {
    const parts: string[] = [];
    if (taxSavings > 10000) {
      parts.push(`reduces lifetime tax by ${formatCurrency(taxSavings)} vs. ${runnerLabel}`);
    }
    if (rrspDiff > 10000) {
      parts.push(`builds ${formatCurrency(rrspDiff)} more RRSP room`);
    }
    if (estateDiff > 10000) {
      parts.push(`leaves ${formatCurrency(estateDiff)} more at estate`);
    }
    const reason = parts.length > 0
      ? `${winnerLabel} ${parts.join(' and ')}, by optimizing salary each year to fill RRSP room without triggering higher tax brackets.`
      : `${winnerLabel} produces the best balance of tax efficiency and retirement sustainability for your inputs.`;
    return `${reason} Projected retirement income: ${income}/yr with a ${successPct}% probability of sustaining spending through your planning horizon.${spouseNote}`;
  }

  if (winnerId === 'dividends-only') {
    const estateMsg = estateDiff > 10000
      ? `leaves ${formatCurrency(estateDiff)} more at estate than ${runnerLabel}`
      : 'produces the strongest estate outcome for your inputs';
    return `With your corporate balance and investment return, avoiding CPP premiums and RRSP complexity ${estateMsg} — the simpler dividend structure wins here. Projected retirement income: ${income}/yr with a ${successPct}% success rate.${spouseNote}`;
  }

  if (winnerId === 'salary-at-ympe') {
    const rrspMsg = rrspDiff > 0
      ? `${formatCurrency(rrspDiff)} more RRSP room than ${runnerLabel}`
      : 'meaningful RRSP room';
    return `Maximizing CPP through a salary at YMPE builds guaranteed, inflation-indexed retirement income that reduces your reliance on corporate drawdown. This produces ${income}/yr in sustainable retirement spending (${successPct}% success rate) while generating ${rrspMsg}.${spouseNote}`;
  }

  // Fallback for custom/current strategy
  return `${winnerLabel} produces ${income}/yr in projected retirement income with a ${successPct}% probability of sustaining your target spending through your planning horizon.${spouseNote}`;
}
