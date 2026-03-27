# Module 2 — Employer Profiles

## Overview

Employers are companies that hire students through Tillers. Each employer has their own portal to view jobs, shifts, and approve student hours. Admin creates employer accounts. Employers do not self-register.

---

## Profile Fields

### Company Details
| Field | Required | Notes |
|---|---|---|
| Company name | Yes | |
| KvK number | Yes | Dutch Chamber of Commerce registration |
| VAT number (BTW) | Yes | For invoicing |
| Billing address | Yes | Full address |
| City | Yes | |
| Postal code | Yes | |

### Contact Person
| Field | Required | Notes |
|---|---|---|
| Contact first name | Yes | |
| Contact last name | Yes | |
| Contact email | Yes | Login + invoice delivery |
| Contact phone | Yes | |

### Commercial Terms
| Field | Required | Notes |
|---|---|---|
| Markup rate (%) | Yes | Agency margin on top of student hourly rate. Set per employer. e.g. 30% means employer pays student rate × 1.30 |
| Payment terms (days) | Yes | Days until invoice is due. Default 14 days. |
| Notes | No | Internal notes for admin |

---

## Markup Rate

Each employer has an individual markup rate. This is the agency's margin.

**Example:**
- Student hourly rate: €13.00
- Markup rate: 35%
- Employer billing rate: €13.00 × 1.35 = **€17.55/hour**
- Agency margin: **€4.55/hour**

The employer billing rate is calculated dynamically — it is not stored separately. This way, if the student's rate changes, the billing rate updates automatically.

⚠️ If a student's hourly rate changes mid-contract, shifts already completed retain the rate at the time of work. This must be captured at the shift level (see [Shift Scheduling](./06-shift-scheduling.md)).

---

## Service Agreement

Employers sign a separate service agreement with Tillers before any students are placed. This is a B2B contract between Tillers and the employer company.

- Generated from a template in the app (separate from student contracts)
- Signed via the same simple e-sign flow (checkbox + timestamp)
- Stored in Vercel Blob, linked to the employer record
- Must be signed before the employer account is activated

### Service Agreement States
```
PENDING_SIGNATURE → SIGNED → EXPIRED
```

---

## Employer Status States
```
INVITED → PENDING_SIGNATURE → ACTIVE → INACTIVE
```

- `INVITED` — account created, not yet signed agreement
- `PENDING_SIGNATURE` — employer has reviewed their profile, awaiting signature
- `ACTIVE` — agreement signed, can receive job assignments
- `INACTIVE` — no longer working with Tillers

---

## Employer Portal Pages

| Page | Path | Description |
|---|---|---|
| Dashboard | `/employer` | Active jobs and recent shifts |
| Jobs | `/employer/jobs` | List of their jobs + shifts |
| Documents | `/employer/documents` | Service agreement, invoices (future) |

---

## Data Model

```prisma
model Employer {
  id              String         @id @default(cuid())
  userId          String         @unique
  companyName     String
  kvkNumber       String
  vatNumber       String
  billingAddress  String
  city            String
  postalCode      String
  contactFirst    String
  contactLast     String
  phone           String
  markupRate      Decimal        @db.Decimal(5, 2)  // e.g. 35.00 = 35%
  paymentTermDays Int            @default(14)
  notes           String?
  status          EmployerStatus @default(INVITED)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  user      User       @relation(...)
  jobs      Job[]
  invoices  Invoice[]  // future
  agreement Document?  // service agreement
}

enum EmployerStatus {
  INVITED
  PENDING_SIGNATURE
  ACTIVE
  INACTIVE
}
```
