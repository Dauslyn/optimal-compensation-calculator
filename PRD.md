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

### 🎯 Quick Wins (Low effort, High impact)

- [ ] **Print/PDF Export** - One-click professional report for accountants
- [ ] **Share link** - Generate shareable URL with encoded inputs
- [ ] **Dark/Light mode toggle**
- [ ] **Input validation & error messages**
- [ ] **Tooltips explaining each field** (hover for help)
- [ ] **"Reset to defaults" button**
- [ ] **Keyboard navigation** for power users
- [ ] **Mobile responsive layout** improvements
- [ ] **Loading states & animations**
- [ ] **Save to browser local storage**

---

### Phase 2: Multi-Province Support 🗓️

Add support for all Canadian provinces and territories:

- [ ] **Provincial tax brackets** (all 13 provinces/territories)
- [ ] **Provincial-specific nuances**
  - Quebec Pension Plan (QPP) instead of CPP
  - Quebec Parental Insurance Plan (QPIP)
  - BC employer health tax
  - Manitoba health and education levy
  - Quebec Health Services Fund
  - Different dividend tax credit rates per province
- [ ] **Provincial corporate tax rates**
  - Small business rates by province
  - General rates by province
- [ ] **UI: Province selector** in input form

---

### Phase 3: Game-Changing Features 🚀

#### Scenario Builder & Comparison

- [ ] **"What If" Scenario Builder** - Create multiple scenarios side-by-side
- [ ] **Side-by-side strategy comparison** with clear winner highlighted
- [ ] **Save/load scenarios** (local storage or user accounts)

#### Monte Carlo Analysis

- [ ] **Monte Carlo simulation** for investment returns
  - Run 1000+ simulations with variable returns
  - Show probability distribution of outcomes
  - Confidence intervals (10th, 50th, 90th percentile)
  - Risk-adjusted recommendations

#### Professional Output

- [ ] **Export to PDF** - Branded professional report
  - Summary page with key metrics
  - Year-by-year tables
  - Charts and graphs
  - Accountant-ready format
- [ ] **Email report** directly to accountant
- [ ] **White-label version** for accountants/advisors

#### AI Tax Advisor

- [ ] **Embedded AI chat** for tax questions
  - "Should I pay myself a bonus before year-end?"
  - "Explain GRIP in simple terms"
  - Context-aware recommendations based on user's data

---

### Phase 4: Exit & Succession Planning 🏠

- [ ] **Lifetime Capital Gains Exemption (LCGE)** calculator
- [ ] **Holdco structure optimization**
- [ ] **Family trust scenarios**
- [ ] **Estate freeze analysis**
- [ ] **Business succession timeline**
- [ ] **IPP (Individual Pension Plan)** analysis

---

### Phase 5: Advanced Tax Strategies 💼

- [ ] **Passive income grind** (SBD clawback calculation)
- [ ] **Tax loss harvesting** simulation
- [ ] **Family income splitting** (dividends to spouse/adult children)
- [ ] **Spousal RRSP** optimization
- [ ] **Corporate class reorganization** analysis
- [ ] **Year-end tax planning mode** ("It's November - what should I do?")

---

### Phase 6: Data Integration & Automation 🔗

- [ ] **Accounting software integration** (QuickBooks, Xero, Wave)
  - Auto-pull corporate income
  - Sync actual expenses
- [ ] **Tax slip import** (T4, T5, T3 upload)
- [ ] **CRA My Account integration** (future, if API available)
  - Real RRSP/TFSA room
  - Actual notional account balances
- [ ] **Bank integration** for real-time cash flow

---

### Phase 7: Platform & Monetization 💰

#### Advisor Platform

- [ ] **Accountant/Advisor white-label version**
  - Client management dashboard
  - Firm branding on reports
  - Multi-client scenarios
- [ ] **Subscription model** ($29/month per advisor seat)

#### Consumer Features

- [ ] **User accounts** with saved scenarios
- [ ] **Push notifications** for deadlines (RRSP, TFSA, year-end)
- [ ] **Mobile PWA** (offline capable)
- [ ] **Benchmark comparisons** ("How do you compare to similar businesses?")

---

### Phase 8: Content & Growth 📈

- [ ] **SEO optimization** for "CCPC salary vs dividend" keywords
- [ ] **Embeddable widget** for accountant blogs/websites
- [ ] **Annual "Tax Optimization Report"** (lead generation)
- [ ] **YouTube explainer series** ("Understanding GRIP in 5 minutes")
- [ ] **Integration guides** for accounting software
- [ ] **Affiliate program** for accountants/advisors

---

## The North Star Vision

> **"Connect your accounting software, and we'll tell you exactly how much less tax you'd pay with optimal compensation — in 30 seconds."**

Instant, personalized, actionable. The ultimate hook.

---

## Known Limitations

1. **Ontario only** - Currently only supports Ontario provincial rates
2. **Simplified deductions** - Does not model all possible deductions
3. **No capital gains deferral** - Assumes 50% of gains realized annually
4. **Single shareholder** - Does not model family trusts or multiple shareholders
5. **Passive income grind** - Not yet implemented (SBD clawback)
6. **Static returns** - No Monte Carlo uncertainty modeling yet

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
