# Phase 9 — Reports & history (V2)

Read `CLAUDE.md` first. Show me a plan first.

## Reports (staff only, filter by property/house/date range)
- Monthly and yearly rent: expected, collected, pending, overdue.
- EB: billed, paid by tenant, paid by owner, reimbursed, outstanding.
- Expenses by category and house.
- Deposits held, deductions, refunds.
- Net income per house = rent collected − expenses.
- Export CSV and PDF (en-IN number format, rupees). Simple charts (bar/line) on screen.
- Build with SQL views/RPC; all amounts summed in paise, formatted only in the UI.

## History
- Full house timeline: tenancies (move-in/out), rent revisions, agreements, deposit settlements, major repairs (expenses over a threshold, default ₹5,000).
- Current tenants never see previous tenants' data (test it).
- Meter-reading history per house with a units-per-period chart.

## Acceptance
- [ ] Report totals match the sum of the underlying charges/payments in test data (write tests).
- [ ] CSV opens correctly in Excel/Google Sheets, including Tamil/Hindi/Malayalam names (UTF-8 with BOM).
