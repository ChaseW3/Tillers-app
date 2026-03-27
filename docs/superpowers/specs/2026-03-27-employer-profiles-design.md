# Module 2 — Employer Profiles: Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Scope

| Page / Route | Description |
|---|---|
| `/employer` | Employer dashboard — active jobs count, recent shifts |
| `/employer/profile` | Read-only company profile |
| `/admin/employers` | Admin list: all employers with name, status, markup rate |
| `/admin/employers/new` | Admin creates employer account |
| `/admin/employers/[id]` | Admin detail view + edit toggle + activate/deactivate |
| `GET /api/employer/profile` | Employer-facing profile (no financial fields) |
| `GET /api/admin/employers` | Admin employer list (full fields) |
| `POST /api/admin/employers` | Create User + Employer, email credentials via Resend |
| `GET /api/admin/employers/[id]` | Admin employer detail |
| `PATCH /api/admin/employers/[id]` | Admin update all employer fields |

**Out of scope:** schema changes, Nmbrs integration, invoice management.

---

## Architecture

All data-fetching pages are **Server Components** that call Prisma directly. Mutations (create, edit) go through **API routes** called by `"use client"` form components. No repositories, no service layer — matches the existing codebase pattern.

### New files

```
src/app/employer/layout.tsx          # new
src/app/employer/page.tsx            # update (replace invoices with shifts)
src/app/employer/profile/page.tsx    # new
src/app/admin/employers/page.tsx
src/app/admin/employers/new/page.tsx
src/app/admin/employers/[id]/page.tsx

src/app/api/employer/profile/route.ts
src/app/api/admin/employers/route.ts
src/app/api/admin/employers/[id]/route.ts

src/components/employer/profile-card.tsx
src/components/admin/employer-form.tsx
src/components/admin/employer-detail.tsx
```

---

## Data & API Design

### `GET /api/employer/profile`

- Auth: session required, role must be `EMPLOYER`
- Finds the `Employer` record via `session.user.id` → `userId`
- Returns **only** via Prisma `select`: `id`, `companyName`, `kvkNumber`, `vatNumber`, `billingAddress`, `city`, `postalCode`, `contactFirst`, `contactLast`, `phone`, `status`
- **Never returns:** `markupRate`, `paymentTermDays`, `notes`

### `GET /api/admin/employers`

- Auth: role must be `ADMIN`
- Returns all employers, full fields, ordered by `createdAt` desc
- Includes `user.email` via relation select

### `POST /api/admin/employers`

- Auth: role must be `ADMIN`
- Request body (Zod-validated):
  ```ts
  {
    email: string,
    password: string,        // min 8 chars
    companyName: string,
    kvkNumber: string,
    vatNumber: string,
    billingAddress: string,
    city: string,
    postalCode: string,
    contactFirst: string,
    contactLast: string,
    phone: string,
    markupRate: number,      // e.g. 35.00
    paymentTermDays: number, // default 14
    notes?: string,
  }
  ```
- Creates `User` (role=`EMPLOYER`, bcrypt-hashed password) + `Employer` in a single Prisma transaction
- On success: sends Resend email to the new employer's address with their email and password
- Returns the created `Employer` record with `user.email`
- On duplicate email: return `400` with `{ error: "Email already in use" }`

### `GET /api/admin/employers/[id]`

- Auth: role must be `ADMIN`
- Returns full `Employer` record + `user.email`
- 404 if not found

### `PATCH /api/admin/employers/[id]`

- Auth: role must be `ADMIN`
- All fields optional (partial update), Zod-validated
- Editable: `companyName`, `kvkNumber`, `vatNumber`, `billingAddress`, `city`, `postalCode`, `contactFirst`, `contactLast`, `phone`, `markupRate`, `paymentTermDays`, `notes`, `status`
- Returns updated `Employer` record

---

## UI Design

### Employer Layout (`/employer/layout.tsx`)

Minimal top-bar layout (no sidebar). Top bar contains:
- Left: "Tillers" brand + "Employer" badge
- Centre/right nav: "Dashboard" (`/employer`) and "Profile" (`/employer/profile`) links
- Far right: user email + sign-out link

### Employer Dashboard (`/employer`)

Server Component. Queries Prisma directly:
- Active job count (`status IN [OPEN, IN_PROGRESS]`)
- Up to 5 most recent shifts across the employer's jobs, ordered by `scheduledStart` desc, including `job.title` and `student.firstName + lastName`

Two cards:
1. **Active Jobs** — count stat + list of up to 5 jobs (title, date range, status badge)
2. **Recent Shifts** — student name, job title, date, shift status badge

### Employer Profile (`/employer/profile`)

Server Component. Fetches Prisma directly using an explicit `select` that matches the employer-facing field whitelist (no `markupRate`, `paymentTermDays`, or `notes`). Read-only — no edit controls.

Layout: two-column card grid
- **Company** section: company name, KVK number, VAT number, billing address, city, postal code
- **Contact** section: first + last name, phone
- Status badge in the page header

### Admin Employer List (`/admin/employers`)

Server Component. Fetches via Prisma directly (admin context).

Table columns: Company Name | Contact | Status | Markup Rate | Created | (View link)

- "New Employer" button top-right → `/admin/employers/new`
- Each row "View →" link → `/admin/employers/[id]`
- Status badge colours: `INVITED` → yellow, `PENDING_SIGNATURE` → blue, `ACTIVE` → green, `INACTIVE` → gray

### Admin New Employer (`/admin/employers/new`)

Client Component form. Fields:
- User section: Email, Password (min 8 chars)
- Company section: Company Name, KVK Number, VAT Number, Billing Address, City, Postal Code
- Contact section: First Name, Last Name, Phone
- Commercial section: Markup Rate (%), Payment Term Days
- Notes (optional textarea)

On submit: `POST /api/admin/employers` → on success redirect to `/admin/employers/[id]`.

### Admin Employer Detail (`/admin/employers/[id]`)

Server Component shell fetches employer data. Passes to `<EmployerDetail>` client component.

**`employer-detail.tsx`** manages view/edit toggle state:

- **View mode:** field grid showing all company + contact + commercial fields. "Edit" button top-right switches to edit mode. Separate "Deactivate" / "Activate" button (depending on current status) sends `PATCH` with `{ status: "INACTIVE" | "ACTIVE" }`.
- **Edit mode:** `<EmployerForm>` rendered with existing values pre-filled. "Save" submits `PATCH /api/admin/employers/[id]`, exits edit mode on success. "Cancel" exits without saving.

`markupRate` and `paymentTermDays` are visible and editable in admin edit mode only.

---

## Security Rules

| Field | Employer API | Admin API |
|---|---|---|
| `markupRate` | never | read/write |
| `paymentTermDays` | never | read/write |
| `notes` | never | read/write |
| All other employer fields | read own | read/write |

API routes always validate session role server-side before any DB query.

---

## Email (Resend)

Triggered on `POST /api/admin/employers` success. Plain transactional email:
- **To:** new employer's email
- **Subject:** "Your Tillers Staffing account is ready"
- **Body:** welcome message with login URL, email, and initial password

No HTML template required for this module — plain text is sufficient.

---

## Status Badge Colour Map

| Status | Colour |
|---|---|
| `INVITED` | yellow |
| `PENDING_SIGNATURE` | blue |
| `ACTIVE` | green |
| `INACTIVE` | gray |
