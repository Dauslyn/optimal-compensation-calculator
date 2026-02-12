/**
 * Local Storage Utility
 *
 * Handles persisting user inputs to localStorage for convenience.
 */

import type { UserInputs } from './types';
import { getStartingYear, getDefaultInflationRate } from './tax/indexation';
import { DEFAULT_PROVINCE, PROVINCES } from './tax/provinces';

const STORAGE_KEY = 'ccpc-calculator-inputs';
const STORAGE_VERSION = 1;

interface StoredData {
  version: number;
  inputs: UserInputs;
  savedAt: string;
}

/**
 * Save user inputs to localStorage
 */
export function saveInputsToStorage(inputs: UserInputs): void {
  try {
    const data: StoredData = {
      version: STORAGE_VERSION,
      inputs,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save inputs to localStorage:', error);
  }
}

/**
 * Load user inputs from localStorage
 * Returns null if no saved data exists or if data is invalid
 */
export function loadInputsFromStorage(): UserInputs | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data: StoredData = JSON.parse(stored);

    // Version check for future compatibility
    if (data.version !== STORAGE_VERSION) {
      console.warn(`Stored data version mismatch: ${data.version} vs ${STORAGE_VERSION}`);
      // Could add migration logic here
    }

    // Basic validation - ensure required fields exist
    if (!data.inputs || typeof data.inputs.requiredIncome !== 'number') {
      console.warn('Invalid stored data structure');
      return null;
    }

    // Validate province code against known provinces
    if (!data.inputs.province || !(data.inputs.province in PROVINCES)) {
      console.warn(`Invalid stored province: "${data.inputs.province}", resetting to ${DEFAULT_PROVINCE}`);
      data.inputs.province = DEFAULT_PROVINCE;
    }

    // Update dynamic defaults that may have changed
    // For example, if the stored starting year is now in the past
    const currentYear = new Date().getFullYear();
    if (data.inputs.startingYear < currentYear) {
      data.inputs.startingYear = getStartingYear();
    }

    // Normalize investmentReturnRate if stored as percentage instead of decimal
    if (data.inputs.investmentReturnRate > 1) {
      data.inputs.investmentReturnRate = data.inputs.investmentReturnRate / 100;
    }

    return data.inputs;
  } catch (error) {
    console.error('Failed to load inputs from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved inputs from localStorage
 */
export function clearStoredInputs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear stored inputs:', error);
  }
}

/**
 * Check if there are saved inputs in localStorage
 */
export function hasSavedInputs(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Get the timestamp when inputs were last saved
 */
export function getLastSavedTime(): Date | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data: StoredData = JSON.parse(stored);
    return new Date(data.savedAt);
  } catch {
    return null;
  }
}

/**
 * Get default inputs (centralized for consistency)
 */
export function getDefaultInputs(): UserInputs {
  return {
    province: DEFAULT_PROVINCE,
    requiredIncome: 100000,
    planningHorizon: 5,
    startingYear: getStartingYear(),
    expectedInflationRate: getDefaultInflationRate(),
    inflateSpendingNeeds: true,
    investmentReturnRate: 0.0431,
    canadianEquityPercent: 33.33,
    usEquityPercent: 33.33,
    internationalEquityPercent: 33.33,
    fixedIncomePercent: 0,
    annualCorporateRetainedEarnings: 50000,
    corporateInvestmentBalance: 500000,
    tfsaBalance: 0,
    rrspBalance: 0,
    cdaBalance: 0,
    eRDTOHBalance: 0,
    nRDTOHBalance: 0,
    gripBalance: 0,
    maximizeTFSA: false,
    contributeToRRSP: false,
    contributeToRESP: false,
    payDownDebt: false,
    salaryStrategy: 'dynamic',
    debtPaydownAmount: 0,
    totalDebtAmount: 0,
    debtInterestRate: 0.05,
    considerIPP: false,

    // Spouse defaults
    hasSpouse: false,
    spouseRequiredIncome: 50000,
    spouseSalaryStrategy: 'dynamic',
    spouseRRSPRoom: 0,
    spouseTFSARoom: 0,
    spouseMaximizeTFSA: false,
    spouseContributeToRRSP: false,
    spouseConsiderIPP: false,
  };
}
