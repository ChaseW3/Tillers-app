# Tillers App — Claude Code Guide

Internal staffing agency tool for Dutch student workers. Next.js 15 + Prisma + PostgreSQL + NextAuth.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Database | PostgreSQL via Neon |
| ORM | Prisma (`src/lib/prisma.ts`) |
| Auth | NextAuth.js v4, JWT sessions (`src/lib/auth.ts`) |
| Styling | Tailwind CSS v3 |
| Validation | Zod |
| PDF | `@react-pdf/renderer` |
| File storage | Vercel Blob |
| Email | Resend |
| Dates | `date-fns` |

---

## File & Folder Conventions

```
src/
  app/
    (public)/         # unauthenticated pages: login, sign contract
    admin/            # ADMIN only
    employer/         # EMPLOYER (+ ADMIN) only
    student/          # STUDENT (+ ADMIN) only
    api/
      auth/           # NextAuth — do not touch
      admin/          # admin API routes
      employer/       # employer API routes
      student/        # student API routes
  lib/
    auth.ts           # authOptions — do not change without review
    prisma.ts         # singleton Prisma client — do not change
  components/
    ui/               # generic, reusable: Button, Card, Badge, Input, etc.
    admin/            # admin-specific composed components
    employer/         # employer-specific composed components
    student/          # student-specific composed components
  types/              # shared TypeScript types and Zod schemas
  utils/              # pure functions: formatting, calculations, date helpers
  pdf/                # @react-pdf/renderer document components
```

New pages go in the role subfolder that matches their audience. API routes mirror the page structure.

---

## Auth Patterns

**Server Components / Route Handlers:**
```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session) redirect("/login");
```

**Client Components:**
```ts
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

**In API routes, always validate role server-side** — never trust the client:
```ts
if (session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

The `session.user` object contains `id`, `email`, `name`, and `role` — these are typed via the NextAuth JWT callback in `src/lib/auth.ts`.

---

## API Route Pattern

All API routes use the App Router conventions:

```ts
// src/app/api/admin/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ...
}
```

Always:
- Auth check first, before any DB query
- Validate request bodies with Zod before touching the DB
- Return `{ error: string }` on failure with appropriate HTTP status
- Return the created/updated resource on success (not just `{ ok: true }`)

---

## Data Access Rules

| Resource | ADMIN | EMPLOYER | STUDENT |
|---|---|---|---|
| Student hourly rate (`hourlyRate`) | read/write | **never expose** | read own |
| Billing rate (`billingRateSnapshot`) | read/write | read own jobs | never expose |
| BSN (`bsnEncrypted`) | read/write | never | never |
| Other student profile fields | read/write | never | read/write own |
| Shift details for their jobs | read/write | read only | read own |
| Payslips | read/write | never | read own |
| Invoices | read/write | read own | never |

**Never return `hourlyRate`, `bsnEncrypted`, or payslip financial details to employer or student API responses.** Use Prisma `select` to explicitly whitelist fields returned to non-admin callers.

---

## Database / Prisma

- Singleton client is at `src/lib/prisma.ts` — import from there, never instantiate `PrismaClient` directly.
- Schema is at `prisma/schema.prisma`.
- **Schema changes must be done one at a time and merged before another agent modifies the schema.** Never have two branches with schema changes in flight simultaneously.
- Run migrations: `npm run db:migrate` (dev) — this generates a migration file.
- After schema changes: `npm run db:generate` to regenerate the client.
- Prefer `prisma.model.findUnique` / `findFirst` over `findMany` when fetching a single record.
- Always use `select` or `omit` when the query result will be sent to a client — don't return entire records.

---

## Business Rules

### Roles & Route Protection
Middleware at `src/middleware.ts` protects `/admin/*`, `/employer/*`, `/student/*` by role. Do not add role checks inside middleware — keep them in API routes so they're explicit.

### Fase System (NBBU CAO)
- Fase A: first 52 worked weeks. `uitzendbeding` applies (employer can end contract without notice).
- Fase B: weeks 53–78. Fixed-term contracts.
- Fase C: permanent.
- **The app records fase data — it does not enforce CAO minimums or calculate overtime.** Admin decides when to progress a student between fasen.
- `workedWeeks` on Contract is recalculated each time a shift is approved.

### GPS Clock-in
- Valid clock-in radius: **2,500 metres** from job location (`locationLat` / `locationLng`).
- Store result in `clockInDistanceM`. Reject clock-in if distance > 2500m (return error to student, allow admin manual override).
- Haversine formula for distance calculation — put this in `src/utils/geo.ts`.

### E-signing (Contracts)
- No third-party service. Click-to-accept flow.
- On student acceptance: record `signedAt` (timestamp), `signatureIp` (request IP), `signatureMeta` (JSON: user agent, screen resolution, viewport).
- One-time `signingToken` (JWT) is emailed to the student. Invalidate after use.
- Update contract `status` → `SIGNED` and then `ACTIVE`.

### PDF Generation
- Use `@react-pdf/renderer` for contract and payslip PDFs.
- PDF components live in `src/pdf/`.
- Generate server-side in API routes, upload to Vercel Blob, store URL in `blobUrl`.

### Invoice Numbering
- Format: `TILL-YYYY-NNN` (e.g., `TILL-2026-001`).
- Sequence resets each calendar year. Query the highest invoice number for the current year to determine next sequence number.

### VAT
- Default VAT rate: **21%** (Dutch standard). Always use the value stored on the Invoice record, not a hardcoded constant, in case it changes.

### Payroll / Nmbrs
- Phase 2 — Nmbrs integration is blocked. Do not build Nmbrs API calls.
- Fields `nmbrsEmployeeId` (Student) and `nmbrsId` (Payslip) exist but are unused until Phase 2.
- Payslip records can be created manually by admin in the meantime.

---

## Shared / High-Conflict Files

**Coordinate before editing these** — multiple agents touching them causes merge conflicts:

| File | Risk |
|---|---|
| `prisma/schema.prisma` | Schema changes must be serialized |
| `src/middleware.ts` | Route protection — touch only for new top-level route groups |
| `src/lib/auth.ts` | Auth config — rarely needs changes |
| `src/lib/prisma.ts` | Never modify |
| `src/app/layout.tsx` | Root layout — avoid unless adding global providers |
| `package.json` | Coordinate new dependency installs |

---

## Naming Conventions

- **Files:** `kebab-case` for all files and folders.
- **Components:** `PascalCase` named exports. One component per file for anything reused; co-located components are fine for page-specific ones.
- **API routes:** `route.ts` — export named functions `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **Zod schemas:** suffix with `Schema`, e.g., `createShiftSchema`.
- **Types:** suffix with the model name, e.g., `StudentWithContracts`.
- **Utilities:** verb-first, e.g., `formatCurrency`, `calculateGrossAmount`, `getHaversineDistance`.

---

## TypeScript

- Strict mode is on (`tsconfig.json`). Do not use `any`.
- Prefer `type` over `interface` for data shapes. Use `interface` only when extending.
- Import Prisma-generated types from `@prisma/client` — don't re-declare them.
- Extend NextAuth types in `src/types/next-auth.d.ts` (create if needed).

---

## Styling

- Tailwind only. No CSS modules, no inline `style` props except for dynamic values Tailwind can't express.
- Colour palette: neutral grays for structure, `blue-600` as primary action colour, `red-*` for destructive/alert, `green-*` for success/approved states.
- Responsive by default — use `md:` and `lg:` breakpoints. Mobile-first.
- Card pattern: `bg-white rounded-xl border border-gray-200 p-6`.

---

## What NOT to Do

- Do not add `console.log` for debugging — use the Prisma query log (already configured for dev).
- Do not add error handling for impossible states — trust Prisma constraints and Zod validation.
- Do not create abstraction layers (repositories, services) — call Prisma directly in route handlers and Server Components.
- Do not add `"use client"` to a component unless it needs interactivity or browser APIs — keep as much server-rendered as possible.
- Do not expose financial fields (`hourlyRate`, `bsnEncrypted`, payslip amounts) to non-admin API responses.
- Do not write migration files manually — always use `prisma migrate dev`.
- Do not install new dependencies without checking if something already in the stack covers it.

---

## Seed Script

Located at `prisma/seed.ts`. Run with `npx prisma db seed`.

Creates:
- 1 admin user (`admin@tillers.nl` / `admin123` — dev only)
- 2 sample employers
- 3 sample students with Fase A contracts

---

## Module Status

| Module | Status |
|---|---|
| Auth + middleware | Done |
| Student profiles | Planned |
| Employer profiles | Planned |
| Contracts (Fase A/B/C) + e-sign | Planned |
| Document storage | Planned |
| Job management | Planned |
| Shift scheduling | Planned |
| Hour tracking + approval | Planned |
| Payroll (manual) | Planned |
| Nmbrs sync | Blocked (Phase 2) |
| Notifications (email) | Planned |
| Invoicing | Planned |
| Reporting | Planned |
