# Module 5 — Job Management

## Overview

Jobs are created by admin only. A job represents an engagement from an employer — e.g., "Event catering at Venue X, April 5–7." Jobs can span multiple days, with different shifts on each day.

---

## Job Structure

```
Job (the engagement)
 └── Day 1 → Shift A (student 1), Shift B (student 2)
 └── Day 2 → Shift C (student 1), Shift D (student 3)
 └── Day 3 → Shift E (student 2)
```

A Job is the container. Shifts are the individual student-day-time assignments within it.

---

## Job Fields

| Field | Required | Notes |
|---|---|---|
| Title | Yes | e.g. "Catering - De Kuip - April 5–7" |
| Employer | Yes | Which employer is requesting |
| Description | No | Details for students |
| Location | Yes | Full address — used for GPS clock-in verification |
| Location lat/lng | Yes | Auto-geocoded from address, stored for GPS check |
| Start date | Yes | First day of the job |
| End date | Yes | Last day of the job |
| Students needed | Yes | Total headcount needed across all days |
| Required skills / tags | No | e.g. "bar", "kitchen", "hosting" |
| Dress code | No | Notes passed to students |
| Internal notes | No | Admin-only notes |
| Status | Auto | DRAFT → OPEN → IN_PROGRESS → COMPLETED → CANCELLED |

---

## Job Status Flow

```
DRAFT → OPEN → IN_PROGRESS → COMPLETED
                     └──────────────→ CANCELLED
```

| Status | Meaning |
|---|---|
| `DRAFT` | Being set up, not yet visible to employers |
| `OPEN` | Published, shifts being assigned |
| `IN_PROGRESS` | At least one shift has started |
| `COMPLETED` | All shifts done and hours approved |
| `CANCELLED` | Job called off |

---

## Geocoding

When admin enters the location address, the app geocodes it to lat/lng using a geocoding API (e.g., Google Maps Geocoding API or the free OpenStreetMap Nominatim API).

- Lat/lng stored on the Job record
- Used by student clock-in to verify GPS proximity (see [Hour Tracking](./07-hour-tracking.md))
- Admin can manually adjust the pin if geocoding is off

---

## Admin: Job Creation Flow

1. Admin fills in job form (employer, title, location, date range, headcount)
2. Address is geocoded → lat/lng stored
3. Job created as `DRAFT`
4. Admin opens the job and adds shifts (one per student per day/time block)
5. Admin publishes job → status `OPEN`
6. Students assigned to shifts are notified (accept/decline)

---

## Admin: Job List View

Filters:
- By employer
- By status
- By date range
- By student

Columns: Job name, Employer, Dates, # shifts filled / # needed, Status

---

## Data Model

```prisma
model Job {
  id             String    @id @default(cuid())
  employerId     String
  title          String
  description    String?
  location       String    // human-readable address
  locationLat    Decimal?  @db.Decimal(10, 7)
  locationLng    Decimal?  @db.Decimal(10, 7)
  startDate      DateTime
  endDate        DateTime
  studentsNeeded Int       @default(1)
  tags           String[]  // e.g. ["bar", "kitchen"]
  dresscode      String?
  internalNotes  String?
  status         JobStatus @default(DRAFT)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  employer Employer @relation(...)
  shifts   Shift[]
}

enum JobStatus {
  DRAFT
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## Admin Pages

| Page | Path | Description |
|---|---|---|
| Job list | `/admin/jobs` | All jobs with filters |
| New job | `/admin/jobs/new` | Create form |
| Job detail | `/admin/jobs/[id]` | Job info + shift management |
| Job shifts | `/admin/jobs/[id]/shifts` | Add/edit/remove shifts |
