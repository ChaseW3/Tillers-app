# Student Profiles — Design Spec

**Date:** 2026-03-27
**Module:** 1 — Student Profiles
**Status:** Approved

---

## Scope

- `/student/profile` — student views and edits their own profile (tabbed)
- `/admin/students` — admin list of all students
- `/admin/students/[id]` — admin detail view with full profile, BSN, status toggle
- `/admin/students/new` — admin creates a student account
- API routes: `/api/student/profile` (GET, PATCH), `/api/admin/students` (GET, POST), `/api/admin/students/[id]` (GET, PATCH)

### Out of Scope (deferred)

- Invite email delivery — Resend integration deferred. Invite URL is generated and returned in the POST response for manual sharing.
- Account setup page (`/setup-account?token=xxx`) — deferred. Admin sets a temporary password at creation time.
- Hourly rate per-student — deferred to the job/contract module. The `hourlyRate` field on the Student model is reserved for that module; it is not displayed or edited in this module.
- Education fields (`university`, `studyProgram`, `graduationYear`) — not surfaced in student-facing UI. Admin can still see/edit them on the detail page as raw profile data.

---

## Architecture

**Pattern:** Server Components for initial data fetch + Client Component form islands for interactivity. All mutations go through explicit API routes. Tab state lives in the URL (`?tab=personal|banking|emergency`), making tabs bookmarkable and refresh-safe.

No new dependencies required. All tooling (Prisma, Zod, NextAuth, Tailwind) is already in the stack.

---

## File Structure

```
src/
  app/
    student/
      profile/
        page.tsx                    # Server Component — fetches student, renders ProfileTabs
    admin/
      students/
        page.tsx                    # Server Component — student list table
        new/
          page.tsx                  # Server Component — create student form
        [id]/
          page.tsx                  # Server Component — student detail (profile + status)
    api/
      student/
        profile/
          route.ts                  # GET, PATCH
      admin/
        students/
          route.ts                  # GET, POST
          [id]/
            route.ts                # GET, PATCH

  components/
    ui/
      badge.tsx                     # Status badge (INVITED / PROFILE_COMPLETE / ACTIVE / INACTIVE)
      button.tsx                    # Reusable button
      input.tsx                     # Reusable labeled input
      card.tsx                      # Card wrapper (bg-white rounded-xl border border-gray-200 p-6)
    student/
      profile-tabs.tsx              # "use client" — tab shell + URL param state
      profile-form-personal.tsx     # "use client" — Personal tab form
      profile-form-banking.tsx      # "use client" — Banking tab form
      profile-form-emergency.tsx    # "use client" — Emergency + loonheffingskorting tab form
    admin/
      student-list-table.tsx        # Student table (server-renderable)
      student-status-button.tsx     # "use client" — activate/deactivate toggle
      student-detail-edit-form.tsx  # "use client" — inline profile edit for admin

  types/
    student.ts                      # StudentProfile, AdminStudentRow, AdminStudentDetail types
```

---

## API Routes

### `GET /api/student/profile`

- Auth: STUDENT role only (or ADMIN)
- Fetches `Student` joined to `User` for the authenticated `session.user.id`
- Returns safe fields only — **never** `bsnEncrypted`, `hourlyRate`, `nmbrsEmployeeId`
- Returns `null` if student record not yet created (edge case for INVITED users)

### `PATCH /api/student/profile`

- Auth: STUDENT role only
- Body: partial — one tab's fields at a time
- Allowed fields: `firstName`, `lastName`, `dateOfBirth`, `phone`, `address`, `city`, `postalCode`, `nationality`, `iban`, `ibanHolderName`, `emergencyName`, `emergencyPhone`, `loonheffingskorting`
- Validates with Zod before any DB write
- After save: checks PROFILE_COMPLETE condition and sets `status` accordingly
- Returns updated student (safe fields only)

**PROFILE_COMPLETE trigger:** set `status = PROFILE_COMPLETE` when all of the following are non-null and non-empty: `firstName`, `lastName`, `phone`, `address`, `city`, `postalCode`, `iban`, `ibanHolderName`, `emergencyName`.

### `GET /api/admin/students`

- Auth: ADMIN only
- Returns paginated list: `id`, `firstName`, `lastName`, `status`, `phone`, `createdAt`
- Optional `?status=` query param filter
- No sensitive fields (`bsnEncrypted`, `hourlyRate`)

### `POST /api/admin/students`

- Auth: ADMIN only
- Body: `firstName`, `lastName`, `email`, `temporaryPassword`
- Creates `User` (role: STUDENT, `passwordHash` = bcrypt of temp password) + linked `Student` record
- Generates signed JWT invite token (7-day expiry) as `inviteUrl` (`/setup-account?token=xxx`)
- Returns: `{ student: { id, firstName, lastName }, inviteUrl }` — **no email sent**
- The invite URL is displayed in the UI as a copyable link for manual sharing

### `GET /api/admin/students/[id]`

- Auth: ADMIN only
- Returns full student profile including `bsn` (decrypted from `bsnEncrypted` via `decryptBsn()`), `hourlyRate` (included for future use, not displayed in UI)
- Never stores plaintext BSN — only decrypts in memory and passes through response

### `PATCH /api/admin/students/[id]`

- Auth: ADMIN only
- Accepts any student field
- If body includes `bsn`, call `encryptBsn(bsn)` and write to `bsnEncrypted` — raw BSN never written to DB
- `status` changes validated: cannot set `ACTIVE` if current status is `INVITED`; valid transitions are PROFILE_COMPLETE → ACTIVE, ACTIVE → INACTIVE, INACTIVE → ACTIVE
- Returns updated record (same shape as GET)

---

## Pages

### `/student/profile`

Server Component fetches student data directly via Prisma (no API hop). Passes data to `ProfileTabs` client component.

**Layout:**
- Status banner at top:
  - `INVITED`: blue info banner — *"Complete your profile to get started."*
  - `PROFILE_COMPLETE` / `ACTIVE`: green banner — *"Profile complete."*
  - `INACTIVE`: gray banner — *"Your account is inactive. Contact your coordinator."*
- Tab bar: Personal | Banking | Emergency
- Active tab form below

**Tab behaviour:**
- Tab selection updates `?tab=` URL param (`router.push` with `scroll: false`)
- Each tab has its own Save button
- PATCH is called with only that tab's fields
- On success: brief inline *"Saved"* confirmation; `router.refresh()` to sync server state

**Tabs and fields:**

| Tab | Fields |
|---|---|
| Personal | firstName, lastName, dateOfBirth, phone, address, city, postalCode, nationality |
| Banking | iban, ibanHolderName |
| Emergency | emergencyName, emergencyPhone, loonheffingskorting (checkbox) |

---

### `/admin/students`

Server Component. Table with columns: **Name, Status, Phone, Created**. Each row links to `/admin/students/[id]`. Status shown as a coloured badge. "New Student" button top-right.

Optional status filter dropdown above the table (filters by `StudentStatus` enum values).

---

### `/admin/students/new`

Server Component shell with a Client Component form. Fields: First Name, Last Name, Email, Temporary Password.

On success: shows the `inviteUrl` in a read-only copyable input with note: *"No email was sent. Copy this link and share it with the student."* Plus a "View Profile" link to the new student's detail page.

---

### `/admin/students/[id]`

Server Component fetches full student via `GET /api/admin/students/[id]`. Two sections on one scrollable page:

**1. Profile**
All fields displayed read-only. BSN shown in plain text (no reveal toggle — admin clearance assumed). An "Edit" button switches the section to an inline edit form (client component). On save, PATCHes `/api/admin/students/[id]` and refreshes.

**2. Account Status**
Current status badge. Activate / Deactivate button (client component):
- `ACTIVE` → shows "Deactivate" button (sets status to `INACTIVE`)
- `INACTIVE` → shows "Activate" button (sets status to `ACTIVE`)
- `PROFILE_COMPLETE` → shows "Activate" button (sets status to `ACTIVE`)
- `INVITED` → activate button disabled with tooltip: *"Student must complete their profile first"*

---

## Security & Data Rules

| Rule | Detail |
|---|---|
| Field whitelist | Student API responses use Prisma `select` — never return `bsnEncrypted`, `hourlyRate`, `nmbrsEmployeeId` |
| BSN read | Only decrypted in `GET /api/admin/students/[id]` — never in student-facing routes |
| BSN write | Raw BSN encrypted via `encryptBsn()` before any DB write |
| Role enforcement | Every route checks `session.user.role` before any DB query |
| Own-record enforcement | Student routes verify `session.user.id` resolves to the queried student record |
| Status gate | Cannot set `ACTIVE` if current status is `INVITED`; PROFILE_COMPLETE → ACTIVE is allowed |

---

## Deferred / Future Notes

- **Hourly rate** is stored on the `Student` model but is managed at the job/contract level. Do not add UI for it here. The field exists in the DB and will be wired in the job/contract module.
- **Invite email** — `inviteUrl` is generated and returned in `POST /api/admin/students`. Wire to Resend when the email module is built.
- **Account setup page** (`/setup-account?token=xxx`) — the invite token is generated but the page to consume it is not built in this module.
- **Education fields** (`university`, `studyProgram`, `graduationYear`) — not shown in student-facing UI. Admin can edit via the detail page edit form.
