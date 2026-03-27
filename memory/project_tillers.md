---
name: Tillers App Project
description: Student staffing agency app — stack, decisions, and key business rules
type: project
---

Building a student staffing agency internal tool.

**Stack:** Next.js 15 (TypeScript, App Router) + Prisma + PostgreSQL (Neon) + NextAuth.js, deployed on Vercel.
**File storage:** Vercel Blob. **Email:** Resend. **Payroll:** Nmbrs (future). **CAO:** NBBU.

**Features in scope (Phase 1):** Job scheduling, shift/hour tracking, GPS clock-in, student portal, employer portal, Fase A contracts with e-signing, admin dashboard.

**Out of scope for Phase 1:** Employer invoicing, Nmbrs API sync (manual export first), WhatsApp (need SIM), Fase B/C contracts.

**Key business rules:**
- All workers are EU nationals — no work permit tracking
- NBBU CAO applies to all student contracts
- Fase A lasts 52 worked weeks; admin decides whether to offer Fase B after
- Alert admin at 46, 48, 50, and 52 worked weeks
- Employers have individual markup rates (employer billing rate = student rate × (1 + markup%))
- Rate snapshots stored on each shift (both student rate and employer billing rate)
- Hour approval: employer approves first, then admin confirms final
- GPS required for student clock-in (300m radius, Haversine formula)
- E-signing: SES (checkbox + timestamp + IP) — legally valid in NL for uitzendovereenkomst
- BSN stored AES-256 encrypted, never exposed to non-admins
- Nmbrs handles payroll calculations, payslips, payouts — Tillers exports CSV for now
- `Student.nmbrsEmployeeId` and `Payslip.nmbrsId` fields already in schema for future sync
- VAT default 21% (Dutch standard)

**Planning docs:** `/docs/` folder in project root (11 files covering all modules).
