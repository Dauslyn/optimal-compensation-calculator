# Optimal Compensation Calculator - PRD

## Product Overview

A web-based calculator for Canadian-Controlled Private Corporation (CCPC) owners to optimize their compensation strategy. The tool helps determine the optimal mix of salary and dividends to minimize taxes while meeting personal income needs.

**Core Question**: "How much salary vs. dividends should I pay myself for the next 5-10 years to optimize my taxes and maximize spending?"

**Repository**: [github.com/Dauslyn/optimal-compensation-calculator](https://github.com/Dauslyn/optimal-compensation-calculator)

---

## Current Status: Production Ready (v1.7.2)

### Core Features Completed

- [x] **Multi-year compensation projection** (3-10 year horizon)
- [x] **Salary/Dividend optimization strategies**
  - Dynamic (exhaust notional accounts first)
  - Fixed salary amount
  - Dividends only
- [x] **Notional account tracking**
  - CDA (Capital Dividend Account)
  - eRDTOH (Eligible Refundable Dividend Tax on Hand)
  - nRDTOH (Non-Eligible Refundable Dividend Tax on Hand)
  - GRIP (General Rate Income Pool)
- [x] **Corporate tax calculations**
  - Small business rate by province
  - Investment income taxation (~50.17% with refundable portion)
  - Salary deductibility
  - Passive income grind (SBD clawback)
- [x] **Personal tax calculations**
  - Unified salary + dividend calculation
  - Federal and provincial brackets (all 13 provinces/territories)
  - Dividend gross-up and tax credits (eligible & non-eligible)
  - Basic personal amounts
  - Provincial surtaxes (ON, PE)
  - Health premiums (ON)
- [x] **Payroll deductions**
  - CPP/QPP (first tier)
  - CPP2/QPP2 (second tier, 2024+)
  - EI (employee + employer portions)
  - QPIP (Quebec only)
- [x] **Investment portfolio modeling**
  - Canadian equity, US equity, International equity, Fixed income
  - Investment returns affect notional accounts
- [x] **RRSP room tracking** - Salary generates room, affects personal tax
- [x] **TFSA contribution planning**
- [x] **Inflation indexing** - Tax brackets, CPP/EI limits auto-indexed
- [x] **Scenario comparison** - Side-by-side "what if" analysis
- [x] **Monte Carlo simulation** - Investment return risk analysis
- [x] **PDF export** - Professional reports for accountants
- [x] **Year-end planning alerts** - Contextual guidance for year-end decisions
- [x] **IPP (Individual Pension Plan) analysis** - Compare IPP vs RRSP contributions

---

## Technical Stack

- **Frontend**: React 19 + TypeScript 5.9
- **Build**: Vite 7
- **Styling**: Tailwind CSS v4 + custom CSS variables (glassmorphism dark/light theme)
- **Charts**: Recharts 3
- **UI Primitives**: Radix UI (Select, Label)
- **State**: React useState/useMemo (local state, no external state library)
- **Tests**: Vitest (1,347 tests)
- **Linting**: ESLint 9 with TypeScript plugin

---

## Roadmap

### v1.8.0 - Spousal Income (v2 feature)

- [ ] **Spouse as employee** - Second salary in the corporation
- [ ] **Spousal RRSP** optimization
- [ ] **Income splitting** via dividends to spouse

### Future Considerations (not committed)

- Email report to accountant

---

## Out of Scope

These features don't answer "salary vs dividends" and belong in separate tools:

- LCGE (Lifetime Capital Gains Exemption) - exit planning
- Holdco structure optimization - corporate restructuring
- Family trust scenarios - estate planning
- Estate freeze analysis - succession planning
- Tax loss harvesting - investment management
- AI chatbot - scope creep
- Accounting software integration - platform play
- White-label advisor platform - B2B pivot

---

## Known Limitations

1. **Simplified deductions** - Does not model all possible deductions
2. **No capital gains deferral** - Assumes 50% of gains realized annually
3. **Monte Carlo simplification** - Uses geometric mean collapsing, losing sequence-of-returns risk

---

## References

- PWL Capital research on CCPC compensation
- CRA dividend tax credit rates
- Provincial Ministry of Finance tax tables
- Canada Revenue Agency CPP/EI rates
- Retraite Québec QPP/QPIP rates

---

## Changelog

### v1.7.2 (2025-02-11)

- **Comprehensive Math Verification Test Suite**: 1,159 new tests (188 → 1,347 total)
  - `dollarTrace.test.ts` (124 tests) — traces every dollar through the calculation pipeline, verifies accounting identities across all 13 provinces
  - `invariants.test.ts` (186 tests) — mathematical invariants: non-negativity, tax rate bounds, monotonicity, CPP/EI caps, notional account conservation
  - `yearOverYear.test.ts` (75 tests) — year-over-year behavior: bracket indexation, inflation toggle, notional account depletion timeline, dynamic strategy transitions
  - `goldenDataset.test.ts` (71 tests) — hand-verified CRA 2025 values: federal/provincial brackets, CPP/EI/RRSP/TFSA limits, corporate rates, passive income grind
  - `parameterized.test.ts` (703 tests) — full input sweep: 13 provinces x 3 strategies x 5 income levels, edge cases, inflation/horizon/balance sweeps
- **Bug Fixes**:
  - Fixed IPP panel not rendering when member age or years of service is 0 (truthiness check on numeric values)
  - Fixed Ontario Health Premium thresholds being incorrectly inflated in projected years (thresholds are not indexed per CRA)

### v1.7.1 (2025-01-28)

- **Math Accuracy Audit & Fixes**: Comprehensive verification of all tax calculations
  - Fixed effective dividend tax rates - now uses province-specific rates instead of hardcoded Ontario values
  - Added Quebec tax integration test to verify QC-specific brackets, credits, and corporate rates
  - Verified main calculator correctly uses province-aware `getTaxYearData()` for all calculations
  - Deprecated legacy functions that used hardcoded Ontario rates
- **188 Tests**: Comprehensive test coverage
  - Quebec and multi-province tax rate verification
  - All 13 provinces/territories validated
  - End-to-end calculator tests for realistic scenarios

### v1.7.0 (2025-01-27)

- **IPP (Individual Pension Plan) Analysis**: Compare IPP vs RRSP contribution limits
  - Calculate current service cost based on age and salary
  - Pension Adjustment (PA) calculation for RRSP room reduction
  - Projected annual pension at retirement
  - Corporate tax savings from IPP contributions
  - Administration cost estimates (setup + annual fees)
  - Notes and recommendations based on member age and income
- **21 IPP Tests**: Full test coverage for IPP calculations

### v1.6.0 (2025-01-27)

- **Extended Planning Horizon**: Now supports 3-10 year projections
  - Users can model longer-term compensation strategies
  - All calculations properly indexed for inflation over the extended period
- **Year-End Planning Alerts**: Contextual guidance during Q4 and RRSP season
  - Shows days until year-end when planning in October-December
  - RRSP contribution deadline awareness in January-February
  - Timing recommendations for salary bonuses vs dividend declarations
  - Quebec-specific reminders for QPP/QPIP considerations
  - Dismissible alerts that appear only during relevant periods
- **154 Tests**: Added validation tests for extended planning horizon

### v1.5.0 (2025-01-27)

- **Quebec Payroll Support**: Full QPP/QPIP implementation
  - Quebec Pension Plan (QPP) at 6.4% rate (higher than CPP's 5.95%)
  - QPP2 (second additional contribution) for earnings above YMPE
  - Quebec Parental Insurance Plan (QPIP) at 0.494% employee / 0.692% employer
  - Quebec EI rate reduced to 1.278% (vs 1.64% for rest of Canada)
  - Auto-detects Quebec province and applies correct payroll deductions
- **Passive Income Grind (SBD Clawback)**: Corporate tax optimization
  - Calculates reduced Small Business Deduction limit based on passive income
  - AAII threshold at $50,000, $5 reduction per $1 over threshold
  - SBD fully eliminated at $150,000 passive income
- **153 Tests**: Added Quebec payroll and passive income grind test suites

### v1.4.0 (2025-01-27)

- **Monte Carlo Simulation**: Risk analysis with variable investment returns
  - Run 100-10,000 simulations with configurable volatility
  - Probability distribution visualizations with confidence intervals
  - Year-by-year balance projection with confidence bands
- **PDF Export**: Professional accountant-ready reports

### v1.3.0 (2025-01-27)

- **Scenario Builder**: "What If" analysis feature
  - Create and compare multiple scenarios side-by-side
  - Preset strategies (Maximize Dividends, Balanced, CPP Maximizer, Tax Minimizer)
  - Best Overall winner badge

### v1.2.0 (2025-01-27)

- **Multi-Province Support**: All 13 Canadian provinces and territories
  - Provincial tax brackets, dividend credits, corporate rates
  - Ontario surtax and health premium, PEI surtax

### v1.1.0 (2025-01-27)

- **Inflation Indexing**: Auto-index tax brackets, CPP/EI limits
- **Input Validation**: Real-time validation with error messages
- **Legal Disclaimers**: First-visit modal + footer disclaimer
- **Mobile Responsive**: Optimized for phones and tablets
- **Share Link**: Generate shareable URLs
- **Dark/Light Mode**: Theme toggle
- **Keyboard Shortcuts**: Power user shortcuts

### v1.0.0 (2025-01-24)

- Initial release with Ontario tax support
- Full notional account tracking
- Multi-year projection (3-5 years)
