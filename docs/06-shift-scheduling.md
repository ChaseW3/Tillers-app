# Module 6 — Shift Scheduling & Calendar

## Overview

Admin assigns students to shifts within jobs. Students are notified and must accept or decline. The admin calendar is the central planning view. Scheduling is entirely admin-driven — students do not request shifts.

---

## Shift Fields

| Field | Required | Notes |
|---|---|---|
| Job | Yes | Parent job |
| Student | Yes | Assigned student |
| Date | Yes | The specific day |
| Scheduled start time | Yes | |
| Scheduled end time | Yes | |
| Break (minutes) | No | Default 0; used in payroll calculation |
| Student hourly rate (snapshot) | Auto | Captured at shift creation from student's current rate |
| Employer billing rate (snapshot) | Auto | student rate × employer markup, captured at creation |
| Notes | No | Instructions for this specific shift |
| Status | Auto | See below |

### Why snapshot rates on the shift?
Rates may change over time. The shift must remember what rate applied when the work happened. This is also what Nmbrs will use for payroll calculation.

---

## Shift Status Flow

```
PENDING_ACCEPTANCE
      │
      ├──▶ ACCEPTED ──▶ IN_PROGRESS ──▶ PENDING_APPROVAL ──▶ APPROVED ──▶ PAID
      │
      └──▶ DECLINED
           └──▶ (admin re-assigns another student)

Also:
  ACCEPTED ──▶ NO_SHOW
  ACCEPTED ──▶ CANCELLED
```

| Status | Meaning |
|---|---|
| `PENDING_ACCEPTANCE` | Shift assigned, student notified, awaiting response |
| `ACCEPTED` | Student confirmed they'll work |
| `DECLINED` | Student declined — needs reassignment |
| `IN_PROGRESS` | Student has clocked in |
| `PENDING_APPROVAL` | Student clocked out, awaiting admin approval |
| `APPROVED` | Admin approved hours — counts toward payroll |
| `PAID` | Included in a processed payroll run |
| `NO_SHOW` | Student didn't show, never clocked in |
| `CANCELLED` | Shift was cancelled (employer or admin) |

---

## Accept / Decline Flow

1. Admin assigns student to a shift → status: `PENDING_ACCEPTANCE`
2. Student receives notification (email / future: WhatsApp)
3. Student opens their schedule page or notification link
4. Student clicks **Accept** or **Decline**
5. If accepted → status: `ACCEPTED`, admin sees confirmation
6. If declined → status: `DECLINED`, admin receives alert and must reassign

**Deadline:** Student must respond within 24 hours (configurable). If no response → admin is alerted.

---

## Admin Calendar View

**Library:** [FullCalendar](https://fullcalendar.io/) — open source, very mature, supports resource/timeline views.

### View modes:
| View | Description |
|---|---|
| **Month** | High-level overview of all jobs/shifts |
| **Week (timeline)** | Rows = students, columns = days. See who works when at a glance |
| **Day** | Hourly breakdown of all shifts on one day |

### Color coding:
- 🔵 PENDING_ACCEPTANCE
- 🟢 ACCEPTED / IN_PROGRESS
- 🔴 DECLINED / NO_SHOW
- 🟡 PENDING_APPROVAL
- ⚫ APPROVED / PAID
- ⬜ CANCELLED

### Filters:
- By employer
- By student
- By job
- By status

### Interactions:
- Click shift → shift detail panel (student, times, status, actions)
- Admin can create a shift directly from the calendar by clicking a time slot
- Admin can drag to reschedule (update scheduled times)

---

## Student Schedule View

Simpler calendar — student sees only their own shifts.

- Month or week view
- Color coded by status (PENDING = yellow, ACCEPTED = green, etc.)
- Click shift → show job details, location, dress code, notes
- Accept/Decline buttons on PENDING_ACCEPTANCE shifts

---

## Conflict Detection

Before saving a shift, the system checks:
- Is the student already scheduled at an overlapping time? → Warning shown to admin
- Has the student's Fase A contract expired? → Block assignment, show alert
- Has the student not yet signed their contract? → Warning

---

## Data Model

```prisma
model Shift {
  id                    String      @id @default(cuid())
  jobId                 String
  studentId             String
  date                  DateTime    // the day (date only, time = 00:00 UTC)
  scheduledStart        DateTime    // full datetime
  scheduledEnd          DateTime    // full datetime
  breakMinutes          Int         @default(0)
  studentRateSnapshot   Decimal     @db.Decimal(10, 2)  // rate at time of creation
  billingRateSnapshot   Decimal     @db.Decimal(10, 2)  // employer billing rate at creation
  status                ShiftStatus @default(PENDING_ACCEPTANCE)
  notes                 String?
  declineReason         String?     // if student declined
  acceptedAt            DateTime?
  clockInTime           DateTime?
  clockInLat            Decimal?    @db.Decimal(10, 7)
  clockInLng            Decimal?    @db.Decimal(10, 7)
  clockOutTime          DateTime?
  clockOutLat           Decimal?    @db.Decimal(10, 7)
  clockOutLng           Decimal?    @db.Decimal(10, 7)
  adminApprovedAt       DateTime?
  adminApprovedById     String?
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  job                Job     @relation(...)
  student            Student @relation(...)
}

enum ShiftStatus {
  PENDING_ACCEPTANCE
  ACCEPTED
  DECLINED
  IN_PROGRESS
  PENDING_APPROVAL
  APPROVED
  PAID
  NO_SHOW
  CANCELLED
}
```

---

## Hours Calculation

```
scheduledHours = (scheduledEnd - scheduledStart) in hours
actualHours    = (clockOutTime - clockInTime) in hours - (breakMinutes / 60)
billedHours    = actualHours (if approved), scheduledHours (if not yet clocked)
```

Payroll uses `actualHours` from approved shifts only.
