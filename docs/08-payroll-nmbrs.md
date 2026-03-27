# Module 8 — Payroll & Nmbrs Integration

## Overview

All payroll calculations, payslip generation, and student payouts are handled by **Nmbrs** (Dutch payroll SaaS). Tillers manages the source data (hours, rates, student details) and syncs it to Nmbrs. Nmbrs handles loonheffing, vakantiegeld, and bank transfers.

Nmbrs integration is **planned but not yet active** — no account exists yet. The app is designed so that sync can be added later with minimal changes.

---

## What Tillers Tracks

| Data | Stored in Tillers | Purpose |
|---|---|---|
| Student personal details | Yes | Pre-populate Nmbrs employee record |
| BSN number | Yes (encrypted) | Required by Nmbrs for tax |
| IBAN | Yes | Nmbrs uses for payout |
| Loonheffingskorting preference | Yes | Passed to Nmbrs |
| Hourly rate | Yes (per student, snapshotted per shift) | Basis for gross calculation |
| Approved shift hours | Yes | Input for Nmbrs wage period |
| Contract phase | Yes | Affects Nmbrs payroll rules |

## What Nmbrs Handles

- Gross wage calculation
- Loonheffing (wage tax) withholding
- Vakantiegeld (8.33%) calculation and accrual
- WW/ZW/Whk employer premiums
- Net wage calculation
- Payslip PDF generation
- Bank transfer (SEPA) to student IBAN

---

## Nmbrs API Design

Nmbrs exposes a REST API. The integration will consist of two sync directions:

### Tillers → Nmbrs (Push)

| Trigger | Data pushed |
|---|---|
| Student activated | Create employee record in Nmbrs |
| Student details updated | Update employee record |
| End of payroll period | Push worked hours (per student, per period) |

### Nmbrs → Tillers (Pull)

| Data pulled | Stored in Tillers |
|---|---|
| Payslip PDFs | Stored in Vercel Blob, linked to student |
| Nmbrs employee ID | Stored on Student.nmbrsEmployeeId |
| Payment confirmation | Update shift status to PAID |

---

## Nmbrs-Ready Data Model

All fields needed for Nmbrs sync are already present in the data model:

```prisma
model Student {
  nmbrsEmployeeId   String?   // set after first sync
  bsnEncrypted      String    // decrypted only for Nmbrs sync
  iban              String
  ibanHolderName    String
  loonheffingskorting Boolean
  hourlyRate        Decimal
  // ... rest of fields
}

model Shift {
  studentRateSnapshot  Decimal   // gross hourly rate at time of work
  date                 DateTime
  actualHours          Decimal   // calculated from clockIn/clockOut
  status               ShiftStatus  // only APPROVED shifts are synced
}

model Payslip {
  nmbrsId     String?   // Nmbrs payslip reference
  periodStart DateTime
  periodEnd   DateTime
  totalHours  Decimal
  grossAmount Decimal
  netAmount   Decimal
  status      PayslipStatus
  blobUrl     String?   // PDF from Nmbrs, stored in Vercel Blob
}
```

---

## Payroll Period

Planned cadence: **monthly** (aligns with standard Dutch payroll).

End of each month:
1. Admin triggers payroll run in Tillers UI
2. App collects all `APPROVED` shifts for the period
3. Groups by student
4. Generates a payroll export (JSON or CSV)
5. **Phase 1 (no Nmbrs yet):** Admin downloads export and manually enters in Nmbrs
6. **Phase 2 (Nmbrs integrated):** App calls Nmbrs API to push hours directly

### Payroll Export Format (for manual phase)

```csv
student_id, nmbrs_employee_id, period_start, period_end, total_hours, hourly_rate, gross_amount, loonheffingskorting
STU001, , 2026-03-01, 2026-03-31, 42.5, 13.00, 552.50, true
```

---

## Manual Phase (Before Nmbrs Account)

Until Nmbrs is active, Tillers tracks:
- All approved hours per student per period
- Gross amounts (hours × rate)
- Admin can export a report for external processing

No loonheffing or deduction calculations in Tillers — these are Nmbrs' job.

---

## Vakantiegeld Tracking

Even before Nmbrs: Tillers tracks accrued vakantiegeld per student.

```
vakantiegeld_accrued = sum(gross per period) × 0.0833
```

Displayed on admin student detail page. Actual payout via Nmbrs.

---

## NBBU CAO Payroll Rules (Reference for Nmbrs Config)

When setting up Nmbrs, configure per NBBU CAO:

| Item | Rate |
|---|---|
| Vakantiegeld | 8.33% of gross |
| Vakantiedagen | 16⅔ hours per worked month |
| Sick pay (Fase A, day 2+) | 70% of daily wage |
| Sick pay (Fase B, year 1) | 90% of wage |
| Sick pay (Fase B, year 2) | 80% of wage |
| Waiting day (Fase A) | 1 day (no pay on day 1 of illness) |
| Waiting day (Fase B) | 1 day |

---

## Implementation Steps (When Nmbrs Account Available)

1. Register Tillers agency in Nmbrs
2. Obtain API key
3. Set `NMBRS_API_KEY` and `NMBRS_API_URL` in environment variables
4. For each active student: POST to Nmbrs employee endpoint → store returned `nmbrsEmployeeId`
5. Build `/api/payroll/sync` endpoint: collects approved hours → POST to Nmbrs wage period endpoint
6. Build webhook or polling job: fetch completed payslips → download PDF → store in Vercel Blob → update Payslip record

---

## Environment Variables

```bash
# Add to .env when Nmbrs account is ready
NMBRS_API_KEY=""
NMBRS_API_URL="https://api.nmbrs.nl/soap/v3"  # or REST endpoint — confirm with Nmbrs
NMBRS_COMPANY_ID=""
```
