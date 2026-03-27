# Module 10 — Reporting & Analytics

## Overview

The reporting module gives admin a clear view of the business: who is working when, what it costs, what it earns, and who wasn't there.

---

## Reports

### 1. Planning View (Daily Schedule)

**What:** A daily/weekly overview of all shifts — who is working, where, for which employer.

**Looks like:** A timeline/Gantt view per day.

| Column | Info |
|---|---|
| Student | Name + photo |
| Job / Employer | Which engagement |
| Location | Where |
| Time | Start → End |
| Status | Accepted / In Progress / etc. |

**Filters:** Date, Employer, Student, Status

**Use case:** Admin's morning view — "who is working today and are they all confirmed?"

---

### 2. Revenue Report

**What:** How much is being billed to employers per period.

**Formula:**
```
revenue = sum(actualHours × billingRateSnapshot) for APPROVED shifts
```

**Breakdown by:**
- Per employer (which employer generates the most revenue)
- Per job
- Per month

**View:** Bar chart + table

**Export:** CSV

---

### 3. Cost Report

**What:** What Tillers is paying out to students per period.

**Formula:**
```
cost = sum(actualHours × studentRateSnapshot) for APPROVED shifts
     + accrued vakantiegeld (8.33%)
```

**Breakdown by:**
- Per student
- Per month

**Margin:**
```
margin = revenue − cost
margin% = (revenue − cost) / revenue × 100
```

Show margin per employer and overall — this tells you which clients are most profitable.

**View:** Table with revenue / cost / margin columns

**Export:** CSV

---

### 4. Absences Report

**What:** Track missed shifts and no-shows.

**Metrics:**
- NO_SHOW shifts per student (ranked)
- DECLINED shifts per student
- Late clock-ins (clocked in >15 min after scheduled start)
- Cancelled shifts (who cancelled, employer or admin)

**Use case:** Identify unreliable students. Also useful if a student disputes a worked week count.

---

### 5. Fase A Status Overview

**What:** All active students with their current Fase A countdown.

| Column | Info |
|---|---|
| Student | Name |
| Worked weeks | e.g. 44 / 52 |
| Progress bar | Visual weeks remaining |
| Alert status | 🟢 / 🟡 / 🔴 |
| Contract since | Start date |
| Estimated end | Based on current shift frequency |

**Filters:** Sort by weeks remaining (ascending — most urgent first)

**Use case:** Admin's compliance overview.

---

### 6. Hours Export (for Nmbrs)

**What:** Export approved hours per student for a payroll period. Used as input for Nmbrs (manual phase) or direct API sync (future).

**Format:** CSV

```csv
student_first, student_last, nmbrs_employee_id, bsn_last4, period_start, period_end,
total_hours, hourly_rate, gross_amount, loonheffingskorting
```

**Trigger:** Admin selects period → clicks "Export for Payroll" → downloads CSV

---

## Dashboard Widgets (Admin Home)

Quick overview cards visible on the admin dashboard:

| Widget | Shows |
|---|---|
| Today's shifts | Count + breakdown by status |
| This week's hours | Total approved hours across all students |
| Pending approvals | Employer-pending + admin-pending count |
| Revenue MTD | Month-to-date billed amount |
| Cost MTD | Month-to-date student wages |
| Margin MTD | MTD margin % |
| Fase A alerts | Students in alert zone (≥46 weeks) |
| Open shifts | Shifts still PENDING_ACCEPTANCE |

---

## Implementation

### Charting Library

**Recharts** — lightweight, React-native, works well with Next.js server components.

```bash
npm install recharts
```

### Data Fetching Strategy

Reports query the DB directly from server components (no separate API layer needed for internal reports).

For expensive reports (e.g., full-year revenue), add caching:

```typescript
// Next.js unstable_cache for report data
const getRevenueReport = unstable_cache(
  async (year: number) => { /* query */ },
  ['revenue-report'],
  { revalidate: 3600 } // 1 hour cache
)
```

---

## Admin Report Pages

| Page | Path |
|---|---|
| Planning / daily view | `/admin/reports/planning` |
| Revenue | `/admin/reports/revenue` |
| Costs & margin | `/admin/reports/costs` |
| Absences | `/admin/reports/absences` |
| Fase A status | `/admin/reports/fase-a` |
| Payroll export | `/admin/reports/payroll-export` |
