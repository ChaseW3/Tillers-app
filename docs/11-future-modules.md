# Module 11 — Future Modules (Backlog)

Items that are explicitly out of scope for the first version but planned for later. Design decisions in Phase 1 should not block these.

---

## Employer Invoicing

**What:** Automatically generate and send invoices to employers at the end of each billing period.

**When to build:** After core scheduling and hours flow is solid.

**Key design notes:**
- Invoice model already exists in the data model
- Invoice = sum of `billingRateSnapshot × actualHours` for all `APPROVED` shifts for that employer in the period
- VAT: 21% (Dutch standard)
- Invoice numbering: sequential per year (e.g. `2026-001`, `2026-002`)
- PDF generated in-app, sent via email
- Status tracking: DRAFT → SENT → PAID → OVERDUE
- Payment reminders on overdue invoices (automated cron)
- Integration with Moneybird or Exact Online (popular Dutch accounting tools) — consider this before building a custom invoicing flow

**Dependencies:** Employer profiles, hour tracking, PDF generation (already needed for contracts)

---

## Nmbrs Full Integration

**What:** Replace the manual payroll export CSV with a direct API sync to Nmbrs.

**When to build:** When Nmbrs account is obtained.

**Steps:**
1. Create Nmbrs company + API credentials
2. POST employee records for all active students → store `nmbrsEmployeeId`
3. At payroll period end: POST worked hours per employee to Nmbrs wage period endpoint
4. Pull back payslip PDFs → store in Vercel Blob → notify students
5. Pull payment confirmations → mark shifts as `PAID`

**Already designed for:** `Student.nmbrsEmployeeId`, `Payslip.nmbrsId`, rate snapshots on shifts, `Contract.phase` for CAO rules in Nmbrs.

---

## WhatsApp Notifications

**What:** Replace or supplement email notifications with WhatsApp messages for shift reminders, clock-in alerts, etc.

**When to build:** When a SIM and WhatsApp Business account is set up.

**Approach:** Twilio WhatsApp API (recommended over unofficial APIs for reliability).

**Already designed for:** Notification service is abstracted — adding WhatsApp is adding one function to `src/lib/notifications.ts`.

**Messages to send via WhatsApp (priority order):**
1. New shift assigned (with accept/decline link)
2. Shift reminder (24h before)
3. No-show alert to admin
4. Fase A alert to admin

---

## Fase B / C Contracts

**What:** When admin decides to move a student to Fase B, generate the appropriate NBBU Fase B contract.

**When to build:** When first students approach 52 worked weeks (probably 6–12 months into operation).

**Key differences from Fase A template:**
- No uitzendbeding clause
- Notice period section added
- Better sick leave terms
- Max 6 contracts / 3 years tracking in DB

**Already designed for:** `ContractPhase` enum has `FASE_B` and `FASE_C`. Contract model supports multiple contracts per student.

---

## Student Mobile App (PWA)

**What:** Make the student-facing web app installable as a Progressive Web App for a native-like experience.

**When to build:** Once the student portal is stable.

**Scope:**
- Add `manifest.json` and service worker
- Push notifications for shift reminders
- Offline fallback page
- "Add to home screen" prompt

**Why not native:** Web app is sufficient for clock-in/GPS. No App Store needed.

---

## Employer Self-Serve Portal Enhancements

**What:** Allow employers to request new jobs directly (instead of going through admin).

**When to build:** When employer base grows and admin is a bottleneck.

**Scope:**
- Job request form in employer portal
- Admin receives request → reviews → approves/schedules
- Not full self-scheduling — admin still assigns students

---

## Auth Enhancements

**What:** Improve the current simple auth setup.

**When to build:** When security requirements grow.

**Options:**
- Magic link / passwordless login (students don't forget passwords)
- Two-factor authentication for admin
- SSO for employers (if they're large companies)
- Password reset flow (basic but needed soon)

**Already designed for:** NextAuth supports all of the above via providers/adapters.
