# Module 3 — Dutch Labor Contracts (Fase A/B/C)

## Governing CAO

**NBBU CAO** (Nederlandse Bond van Bemiddelings- en Uitzendondernemingen)
Applicable to all student contracts. Reviewed annually — rules below reflect 2026 state.

---

## The Phase System

### Fase A — Flexible Temporary Employment

**Duration:** Maximum **52 worked weeks**
- A "worked week" = any calendar week in which the student works at least 1 hour
- Hours worked per week are irrelevant — 1 hour or 40 hours both count as 1 week
- Weeks with paid vacation also count

**Uitzendbeding (Dismissal Clause):**
- Applies in Fase A — contract ends automatically when the employer ends the placement
- **Exception (since July 1, 2023):** Cannot be invoked during sickness — if a student is sick, the contract continues and wage must be paid
- Must be **explicitly stated** in the contract (mandatory since September 1, 2023)
- Student can terminate with **1 working day's notice**

**Interruption Rules (gap between assignments at same agency):**
| Gap length | Effect |
|---|---|
| < 13 weeks | Worked weeks keep counting |
| 13–26 weeks | Restart — but enters Fase B (not back to Fase A) |
| > 26 weeks | Restart from Fase A, week count resets to 0 |

**Payroll obligations in Fase A (NBBU CAO):**
- Vakantiegeld (holiday pay): **8.33%** of gross wage, paid monthly or annually (June)
- Vakantiedagen (vacation days): **16⅔ hours** accrued per worked month
- Loonheffing: withheld based on student's tax bracket + loonheffingskorting preference
- Sick leave: **70% of daily wage** from day 2 (1 waiting day in Fase A)

---

### Fase B — Fixed-Term Contracts

Entered after 52 worked weeks in Fase A (at admin's discretion — Tillers decides whether to offer Fase B).

**Duration:** Maximum **3 years**
**Max contracts:** **6 fixed-term contracts** within that 3-year window
**Uitzendbeding:** Does NOT apply in Fase B
**Notice period:** Standard notice period applies (can no longer terminate instantly)
**Sick leave:** 90% year 1, 80% year 2 (1 waiting day)
**Interruption:** Gap ≥ 6 months → back to Fase A

---

### Fase C — Permanent Contract

After maximum Fase B period is exhausted, a permanent (indefinite) contract is required.
For a student staffing agency, this is unlikely — most students will leave before reaching Fase C.

---

## Contract Lifecycle

```
Student ACTIVE
    │
    ▼
Fase A Contract generated
    │
    ├──▶ Sent to student for e-signing
    │
    ├──▶ Student signs → Contract ACTIVE
    │
    ├──▶ Worked weeks tracked (from approved shifts)
    │
    ├──▶ @ 46 worked weeks → Alert: "6 weeks remaining in Fase A"
    ├──▶ @ 48 worked weeks → Alert: "4 weeks remaining"
    ├──▶ @ 50 worked weeks → Alert: "2 weeks remaining"
    ├──▶ @ 52 worked weeks → Alert: "Fase A complete — decide now"
    │
    └──▶ Admin decision:
              ├── Offer Fase B → New contract generated
              └── End relationship → Contract ENDED
```

---

## Alert System

Alerts are sent to **admin** only. Student is not notified of phase limits.

| Trigger | Alert | Channel |
|---|---|---|
| 46 worked weeks | "Student X has 6 weeks remaining in Fase A" | Email (+ future: WhatsApp) |
| 48 worked weeks | "Student X has 4 weeks remaining" | Email |
| 50 worked weeks | "Student X has 2 weeks remaining" | Email |
| 52 worked weeks | "Student X has reached Fase A limit — action required" | Email (urgent) |

Alerts are recalculated every time a new shift is approved (which updates the worked weeks count).

---

## Worked Weeks Calculation

```
workedWeeks = count of distinct calendar weeks in which
              the student has at least 1 APPROVED shift
```

Calendar week = ISO week (Monday–Sunday).

Stored as a cached counter on the Contract record, recalculated on shift approval.
Full audit trail: each approved shift is linked to the contract it fell under.

---

## Contract Template (Fase A)

Built in-app from a template. Fields auto-populated from student and employer data.

**Required contract fields (NBBU CAO + Sept 2023 mandatory):**
1. Uitzendbureau name, address, KvK number
2. Uitzendkracht name, address, BSN (last 4 digits on contract, full BSN in records)
3. Inlener (employer) name and address
4. Start date (or: per-assignment basis if no fixed start)
5. Whether the **uitzendbeding applies** — must be explicit (Yes)
6. Hourly rate (gross)
7. Vakantiegeld percentage (8.33%)
8. Vakantiedagen accrual
9. Reference to NBBU CAO
10. Applicable loonheffingskorting (Yes/No per student preference)
11. Notice terms (student: 1 working day)
12. Sick leave terms (1 waiting day, 70% from day 2)

### Template Strategy
- Store contract template as a structured document in the DB (or as a `.html` template file)
- At generation time, merge student + employer + agency data into the template
- Render to PDF (using `pdf-lib` or `puppeteer` on the server)
- Store PDF in Vercel Blob
- Send signing link to student

---

## Contract States

```
DRAFT → SENT → SIGNED → ACTIVE → ENDED | SUPERSEDED
```

| State | Meaning |
|---|---|
| `DRAFT` | Generated but not yet sent |
| `SENT` | Sent to student for signature |
| `SIGNED` | Student has signed |
| `ACTIVE` | Currently in effect |
| `ENDED` | Expired or terminated |
| `SUPERSEDED` | Replaced by a new phase contract |

---

## Data Model

```prisma
model Contract {
  id            String         @id @default(cuid())
  studentId     String
  employerId    String         // the inlener this contract covers
  phase         ContractPhase
  status        ContractStatus @default(DRAFT)
  startDate     DateTime
  endDate       DateTime?      // null for open-ended Fase A
  hourlyRate    Decimal        @db.Decimal(10, 2)  // rate at time of signing
  workedWeeks   Int            @default(0)          // cached, updated on shift approval
  blobUrl       String?        // signed PDF in Vercel Blob
  signedAt      DateTime?
  signatureIp   String?
  signatureMeta String?        // JSON: user agent, timestamp
  alertsSent    Json           @default("[]")       // track which alerts have fired
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  student  Student  @relation(...)
  employer Employer @relation(...)
}

enum ContractPhase {
  FASE_A
  FASE_B
  FASE_C
}

enum ContractStatus {
  DRAFT
  SENT
  SIGNED
  ACTIVE
  ENDED
  SUPERSEDED
}
```

---

## Key Implementation Notes

- **Week counting is idempotent** — re-approving or un-approving a shift recalculates the week count from scratch each time
- **Multi-employer** — a student can have separate Fase A contracts with different employers simultaneously; weeks count independently per employer-student pair
- **Rate snapshot** — hourly rate is snapshotted on the contract at signing; changes to the student's base rate do not retroactively affect existing contracts
- **PDF generation** — use `puppeteer` (via Vercel's `@sparticuz/chromium`) or `pdf-lib` for server-side PDF generation; puppeteer gives better HTML-to-PDF fidelity
