# Optimal Compensation Calculator - PRD

## Product Overview

A web-based calculator for Canadian-Controlled Private Corporation (CCPC) owners to optimize their compensation strategy. The tool helps determine the optimal mix of salary and dividends to minimize taxes while meeting personal income needs.

**Repository**: [github.com/Dauslyn/optimal-compensation-calculator](https://github.com/Dauslyn/optimal-compensation-calculator)

---

## Current Status: MVP Complete ✅

### Core Features Completed

- [x] **Multi-year compensation projection** (3-5 year horizon)
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
  - Small business rate (12.2% ON) on active business income
  - Investment income taxation (~50.17% with refundable portion)
  - Salary deductibility
- [x] **Personal tax calculations**
  - Unified salary + dividend calculation
  - Federal and provincial brackets
  - Dividend gross-up and tax credits (eligible & non-eligible)
  - Basic personal amounts applied correctly
  - Ontario surtax on all income
  - Ontario Health Premium on all income
- [x] **Payroll deductions**
  - CPP (first tier)
  - CPP2 (second tier, 2024+)
  - EI (employee + employer portions)
- [x] **Investment portfolio modeling**
  - Canadian equity (dividend yield)
  - US equity (dividend yield)
  - International equity
  - Fixed income
- [x] **Contribution strategies**
  - RRSP (room tracking, contribution optimization)
  - TFSA (annual limit)
  - RESP
  - Debt paydown
- [x] **Year-by-year projection tables**
  - Income flow breakdown
  - Compensation breakdown
  - Notional account activity (added/used/balance)
  - RDTOH tracking
  - Corporate investment account
  - Tax breakdown detail
- [x] **Summary metrics**
  - Total tax paid
  - Effective tax rate
  - Final corporate balance
  - Total RRSP contributions

---

## Technical Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Vanilla CSS with CSS variables (dark theme)
- **Charts**: Recharts
- **State**: React useState (local state)

---

## Roadmap

### Phase 2: Multi-Province Support 🗓️

Add support for all Canadian provinces and territories with their specific:

- [ ] **Provincial tax brackets**
  - Alberta
  - British Columbia
  - Manitoba
  - New Brunswick
  - Newfoundland and Labrador
  - Northwest Territories
  - Nova Scotia
  - Nunavut
  - Prince Edward Island
  - Quebec
  - Saskatchewan
  - Yukon

- [ ] **Provincial-specific nuances**
  - Quebec Pension Plan (QPP) instead of CPP
  - Quebec Parental Insurance Plan (QPIP)
  - BC employer health tax
  - Manitoba health and education levy
  - Quebec Health Services Fund
  - Provincial capital taxes (where applicable)
  - Different dividend tax credit rates per province

- [ ] **Provincial corporate tax rates**
  - Small business rates by province
  - General rates by province
  - Manufacturing & processing credits

- [ ] **UI: Province selector** in input form

### Phase 3: Enhanced Features 🗓️

- [ ] **Tax loss harvesting** simulation
- [ ] **IPP (Individual Pension Plan)** analysis
- [ ] **Holding company** scenarios
- [ ] **Family income splitting** (dividends to family members)
- [ ] **Estate planning** integration
- [ ] **Export to PDF** report
- [ ] **Save/load scenarios** (local storage or accounts)
- [ ] **Side-by-side strategy comparison**

### Phase 4: Data & Integration 🗓️

- [ ] **Historical tax year data** (2020-2026)
- [ ] **Annual tax update workflow** for new rates
- [ ] **API for integration** with financial planning software
- [ ] **CRA integration** for RRSP/TFSA room lookup (future)

---

## Known Limitations

1. **Ontario only** - Currently only supports Ontario provincial rates
2. **Simplified deductions** - Does not model all possible deductions
3. **No capital gains deferral** - Assumes 50% of gains realized annually
4. **Single shareholder** - Does not model family trusts or multiple shareholders
5. **Passive income grind** - Not yet implemented (small business limit reduction)

---

## References

- PWL Capital research on CCPC compensation
- CRA dividend tax credit rates
- Ontario Ministry of Finance tax tables
- Canada Revenue Agency CPP/EI rates

---

## Changelog

### v1.0.0 (2026-01-24)

- Initial release
- Ontario tax support
- Full notional account tracking
- Unified personal tax calculation
- Multi-year projection
