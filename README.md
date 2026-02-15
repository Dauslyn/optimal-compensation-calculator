# Optimal Compensation Calculator

A web-based calculator for Canadian-Controlled Private Corporation (CCPC) owners to optimize their compensation strategy — determining the ideal mix of salary and dividends to minimize taxes while meeting personal income needs.

## Features

- **Multi-year projection** (3–10 year horizon) with three salary strategies: Dynamic Optimizer, Fixed Salary, Dividends-Only
- **All 13 provinces and territories** with province-specific brackets, dividend credits, surtaxes, and corporate rates
- **Notional account tracking**: CDA, eRDTOH, nRDTOH, GRIP — depleted optimally by the dynamic strategy
- **Payroll deductions**: CPP/QPP, CPP2/QPP2, EI, QPIP (Quebec), BC Employer Health Tax, MB Health & Education Levy
- **Investment portfolio modeling** with returns affecting corporate accounts and passive income grind (SBD clawback)
- **IPP analysis**: Compare Individual Pension Plan vs RRSP contributions
- **Monte Carlo simulation** for investment return risk analysis
- **Scenario comparison**, PDF export, share links, dark/light theme

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts 3 |
| Testing | Vitest (1,400+ tests) |

## Getting Started

```bash
npm install
npm run dev       # Start dev server
npm run test:run  # Run test suite
npm run build     # Production build
```

## Tax Data

Tax constants are maintained in `src/lib/tax/`. The calculator uses official CRA values for 2025–2026 and projects future years using inflation indexation. See `indexation.ts` for the projection logic and `provincialRates.ts` for all province-specific data.

## License

Private repository.
