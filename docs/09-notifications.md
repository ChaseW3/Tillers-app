# Module 9 — Notifications & Communications

## Overview

Phase 1: Email only via Resend.
Phase 2: WhatsApp via a dedicated SIM/number (planned).

---

## Email Provider: Resend

[Resend](https://resend.com) is purpose-built for Next.js / Vercel. Simple API, React Email for templates, free tier covers 3,000 emails/month — more than enough for this scale.

```bash
npm install resend react-email @react-email/components
```

```bash
# .env
RESEND_API_KEY=""
EMAIL_FROM="noreply@tillersstaffing.nl"
```

---

## Notification Events

### Student Notifications

| Event | Channel | Trigger |
|---|---|---|
| Account created / invite | Email | Admin creates student account |
| New shift assigned | Email (+ future WhatsApp) | Admin assigns shift |
| Shift reminder | Email (+ future WhatsApp) | 24h before scheduled start |
| Shift cancelled | Email | Admin/employer cancels shift |
| Contract sent for signing | Email | Admin sends contract |
| Contract signed confirmation | Email | After student signs |
| Payslip available | Email | Nmbrs payslip synced (future) |

### Employer Notifications

| Event | Channel | Trigger |
|---|---|---|
| Account created | Email | Admin creates employer account |
| Service agreement sent | Email | Admin sends agreement |
| Invoice sent (future) | Email | Admin sends invoice |

### Admin Notifications

| Event | Channel | Trigger |
|---|---|---|
| Student profile complete | Email | Student submits profile |
| Student declined a shift | Email | Student declines |
| Student no response (24h) | Email | No accept/decline within 24h |
| Potential no-show | Email | Student accepted but not clocked in 1h after start |
| Fase A alert — 6 weeks remaining | Email | Student hits 46 worked weeks |
| Fase A alert — 4 weeks remaining | Email | Student hits 48 worked weeks |
| Fase A alert — 2 weeks remaining | Email | Student hits 50 worked weeks |
| Fase A alert — limit reached | Email (urgent) | Student hits 52 worked weeks |

---

## Email Templates

Built with [React Email](https://react.email/) — write templates as React components, render to HTML.

```
src/emails/
  ShiftAssigned.tsx
  ShiftReminder.tsx
  ContractSigning.tsx
  HoursApprovalRequest.tsx
  FaseAAlert.tsx
  ... etc
```

All emails include:
- Tillers branding (logo, colors)
- Direct action link where relevant (e.g. "Click here to approve hours")
- Unsubscribe footer (legal requirement)

---

## Shift Reminder Scheduling

Shift reminders (24h before start) must be scheduled in advance.

Options:
1. **Vercel Cron Jobs** — run a cron every hour, query for shifts starting in ~24h, send reminder if not already sent
2. **Triggered at shift creation** — schedule a delayed job (requires a queue like Upstash QStash)

**Recommendation: Vercel Cron** (simpler, no extra dependency):
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/shift-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/fase-a-alerts",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/no-show-check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## Cron Jobs

### `/api/cron/shift-reminders`
Runs hourly. Finds all `ACCEPTED` shifts starting 23–25 hours from now with `reminderSent = false`. Sends email. Sets `reminderSent = true`.

### `/api/cron/fase-a-alerts`
Runs daily at 08:00. Checks all active Fase A contracts. For each:
- If workedWeeks ∈ {46, 48, 50, 52} and alert not yet sent → send alert
- Uses `Contract.alertsSent` JSON array to track which have fired

### `/api/cron/no-show-check`
Runs every 15 min. Finds `ACCEPTED` shifts where `scheduledStart` was >60 min ago and `clockInTime` is null. Alerts admin.

---

## WhatsApp (Future — Phase 2)

When a SIM is available:

**Option A: WhatsApp Business API** (via Meta) — enterprise, requires business verification, costs money per message.

**Option B: Twilio WhatsApp** — simpler setup, requires approved WhatsApp Business account.

**Option C: Green API / Chat API** — unofficial APIs that use a regular WhatsApp number via a SIM. Cheap, easy to set up, but against WhatsApp ToS (risk of getting number banned). Not recommended for production.

**Recommendation:** WhatsApp Business API via Twilio when ready. Start with email, keep the notification service abstracted so switching channels is a one-line change.

### Abstracted Notification Service

```typescript
// src/lib/notifications.ts
export async function sendNotification(opts: {
  userId: string
  type: NotificationType
  data: Record<string, unknown>
}) {
  await sendEmail(opts)        // always
  if (whatsappEnabled) {
    await sendWhatsApp(opts)   // when ready
  }
}
```

---

## Notification Log

Every sent notification is logged to the DB for audit and debugging:

```prisma
model NotificationLog {
  id        String   @id @default(cuid())
  userId    String
  type      String
  channel   String   // "email" | "whatsapp"
  status    String   // "sent" | "failed"
  error     String?
  sentAt    DateTime @default(now())
}
```
