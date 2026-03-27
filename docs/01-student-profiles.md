# Module 1 — Student Profiles & Onboarding

## Overview

Students self-register and fill in their own profile after account creation. Admin creates the account (or sends an invite link) and the student completes their details before they can be scheduled.

---

## Profile Fields

### Personal Details
| Field | Required | Notes |
|---|---|---|
| First name | Yes | |
| Last name | Yes | |
| Date of birth | Yes | For contract |
| Email | Yes | Login + comms |
| Phone number | Yes | WhatsApp (future) |
| Home address | Yes | Full address for contract |
| BSN number | Yes | Dutch citizen service number — needed for loonheffing. Stored encrypted. |
| IBAN | Yes | For payouts via Nmbrs |
| Bank account holder name | Yes | Must match IBAN |
| Profile photo | No | Optional, useful for employer recognition |

### Student Status
| Field | Required | Notes |
|---|---|---|
| University / institution | Yes | |
| Student number | No | Internal reference |
| Study program | No | |
| Expected graduation year | No | Useful for planning long-term contracts |

### Work Details
| Field | Required | Notes |
|---|---|---|
| Hourly rate | No | Set by admin — not editable by student |
| Loonheffingskorting | Yes | Does student apply their tax credit here? Yes/No. Affects loonheffing calculation. |
| Emergency contact name | Yes | |
| Emergency contact phone | Yes | |

---

## Nationality

All workers are EU nationals. No work permit tracking required. Nationality is captured for contract completeness only.

---

## Onboarding Flow

1. Admin creates a User account with role `STUDENT` and sends invite email
2. Student receives email with a one-time setup link
3. Student sets a password
4. Student fills in their profile form (all required fields)
5. Student is shown as "Pending" until admin reviews and activates them
6. Admin activates student → they can now be scheduled
7. Fase A contract is generated and sent for signing

### Student Status States
```
INVITED → PROFILE_COMPLETE → ACTIVE → INACTIVE
```

- `INVITED` — account created, profile not yet filled
- `PROFILE_COMPLETE` — filled profile, awaiting admin review
- `ACTIVE` — approved, can be scheduled, contract signed
- `INACTIVE` — no longer working with the agency

---

## BSN Security

BSN numbers are sensitive data (Dutch law: BSN may only be processed for legally required purposes — payroll qualifies).

- Store BSN encrypted at rest (AES-256)
- Only visible to ADMIN role
- Never exposed in API responses to student or employer
- Log all access to BSN data

---

## Data Model

```prisma
model Student {
  id                  String        @id @default(cuid())
  userId              String        @unique
  firstName           String
  lastName            String
  dateOfBirth         DateTime
  phone               String
  address             String
  city                String
  postalCode          String
  nationality         String
  bsnEncrypted        String        // AES-256 encrypted
  iban                String
  ibanHolderName      String
  university          String?
  studentNumber       String?
  studyProgram        String?
  graduationYear      Int?
  loonheffingskorting Boolean       @default(false)
  emergencyName       String
  emergencyPhone      String
  hourlyRate          Decimal       @db.Decimal(10, 2)
  status              StudentStatus @default(INVITED)
  nmbrsEmployeeId     String?       // for future Nmbrs sync
  active              Boolean       @default(false)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  user      User       @relation(...)
  contracts Contract[]
  shifts    Shift[]
  payslips  Payslip[]
}

enum StudentStatus {
  INVITED
  PROFILE_COMPLETE
  ACTIVE
  INACTIVE
}
```

---

## Student Portal Pages

| Page | Path | Description |
|---|---|---|
| Dashboard | `/student` | Upcoming shifts, recent payslips, contract status |
| Profile | `/student/profile` | View & edit own details |
| Schedule | `/student/schedule` | Calendar of assigned shifts |
| Hours | `/student/hours` | Clock in/out, history |
| Documents | `/student/documents` | Contracts, payslips |
| Notifications | `/student/notifications` | Shift invites to accept/decline |
