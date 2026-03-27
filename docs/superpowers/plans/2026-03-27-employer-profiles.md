# Employer Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Module 2 — Employer Profiles: employer dashboard, read-only profile page, and full admin CRUD for employer accounts including email credential delivery via Resend.

**Architecture:** Server Components fetch data directly via Prisma; mutations go through API routes called by `"use client"` client components. No test framework exists in the project — verification is `npm run lint` after each task and `npm run build` at the end of each section. No abstraction layers; follow the patterns in `src/app/admin/page.tsx` and `src/app/employer/page.tsx`.

**Tech Stack:** Next.js 15 App Router, Prisma + PostgreSQL, NextAuth v4 JWT, Tailwind CSS v3, Zod, bcryptjs, Resend (install in Task 1), date-fns.

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `src/app/employer/layout.tsx` | Create | Top-bar layout for all `/employer/*` pages |
| `src/app/employer/page.tsx` | Update | Replace invoices with recent shifts |
| `src/app/employer/profile/page.tsx` | Create | Read-only employer company profile |
| `src/app/admin/employers/page.tsx` | Create | Admin list of all employers |
| `src/app/admin/employers/new/page.tsx` | Create | Admin create employer page |
| `src/app/admin/employers/[id]/page.tsx` | Create | Admin detail + edit toggle page |
| `src/app/api/employer/profile/route.ts` | Create | GET — employer-safe profile fields |
| `src/app/api/admin/employers/route.ts` | Create | GET list + POST create employer |
| `src/app/api/admin/employers/[id]/route.ts` | Create | GET detail + PATCH update employer |
| `src/components/employer/profile-card.tsx` | Create | Read-only field card used on profile page |
| `src/components/admin/employer-form.tsx` | Create | Client form for creating a new employer |
| `src/components/admin/employer-detail.tsx` | Create | Client component: view/edit toggle + activate/deactivate |
| `src/types/employer.ts` | Create | Serialized employer type shared between server and client |

---

## Task 1: Install Resend and add RESEND_API_KEY

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local` (add key)

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

Expected output: `added 1 package` (or similar — no errors).

- [ ] **Step 2: Add the env var**

Open `.env.local` (create it if it doesn't exist in the project root). Add:

```
RESEND_API_KEY=re_your_api_key_here
```

Get a real key from resend.com → API Keys if deploying. For local dev you can leave the placeholder value — the email send will fail silently; the employer is still created.

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install resend for employer email delivery"
```

---

## Task 2: Employer layout (top-bar)

**Files:**
- Create: `src/app/employer/layout.tsx`

- [ ] **Step 1: Create the layout file**

```typescript
// src/app/employer/layout.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">Tillers</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                Employer
              </span>
            </div>
            <nav className="flex gap-4">
              <Link
                href="/employer"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/employer/profile"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{session.user?.email}</span>
            <Link
              href="/api/auth/signout"
              className="text-xs text-red-500 hover:underline"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/employer/layout.tsx
git commit -m "feat: add employer top-bar layout"
```

---

## Task 3: Update employer dashboard (replace invoices with shifts)

**Files:**
- Modify: `src/app/employer/page.tsx`

The current page queries `employer.invoices`. Replace that include with a separate shifts query.

- [ ] **Step 1: Rewrite the page**

```typescript
// src/app/employer/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";

const shiftStatusColors: Record<string, string> = {
  PENDING_ACCEPTANCE: "bg-yellow-50 text-yellow-700",
  ACCEPTED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  PAID: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-50 text-gray-500",
};

export default async function EmployerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;

  const employer = await prisma.employer.findUnique({
    where: { userId },
    include: {
      jobs: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { startDate: "asc" },
        take: 5,
      },
    },
  });

  if (!employer) {
    return <div className="p-8">Employer profile not found. Contact admin.</div>;
  }

  const recentShifts = await prisma.shift.findMany({
    where: { job: { employerId: employer.id } },
    orderBy: { scheduledStart: "desc" },
    take: 5,
    include: {
      job: { select: { title: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const activeJobCount = await prisma.job.count({
    where: {
      employerId: employer.id,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {employer.companyName}
      </h1>
      <p className="text-gray-500 mb-8">
        {activeJobCount} active job{activeJobCount !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Active Jobs</h2>
          {employer.jobs.length === 0 ? (
            <p className="text-sm text-gray-400">No active jobs.</p>
          ) : (
            <ul className="space-y-3">
              {employer.jobs.map((job) => (
                <li key={job.id} className="text-sm border-l-4 border-green-400 pl-3">
                  <p className="font-medium">{job.title}</p>
                  <p className="text-gray-400">
                    {format(job.startDate, "d MMM")} –{" "}
                    {format(job.endDate, "d MMM yyyy")}
                  </p>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent shifts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Recent Shifts</h2>
          {recentShifts.length === 0 ? (
            <p className="text-sm text-gray-400">No shifts yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentShifts.map((shift) => (
                <li key={shift.id} className="text-sm border-l-4 border-blue-300 pl-3">
                  <p className="font-medium">
                    {shift.student.firstName} {shift.student.lastName}
                  </p>
                  <p className="text-gray-500">{shift.job.title}</p>
                  <p className="text-gray-400">
                    {format(shift.scheduledStart, "EEE d MMM, HH:mm")}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      shiftStatusColors[shift.status] ?? "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {shift.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/employer/page.tsx
git commit -m "feat: update employer dashboard to show recent shifts"
```

---

## Task 4: GET /api/employer/profile

**Files:**
- Create: `src/app/api/employer/profile/route.ts`

Never expose `markupRate`, `paymentTermDays`, or `notes`. Use Prisma `select` to enforce this.

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/employer/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as typeof session.user & { role?: string })?.role;

  if (!session || role !== "EMPLOYER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as typeof session.user & { id: string }).id;

  const employer = await prisma.employer.findUnique({
    where: { userId },
    select: {
      id: true,
      companyName: true,
      kvkNumber: true,
      vatNumber: true,
      billingAddress: true,
      city: true,
      postalCode: true,
      contactFirst: true,
      contactLast: true,
      phone: true,
      status: true,
    },
  });

  if (!employer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(employer);
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/employer/profile/route.ts
git commit -m "feat: add GET /api/employer/profile (employer-safe fields only)"
```

---

## Task 5: Employer profile page

**Files:**
- Create: `src/components/employer/profile-card.tsx`
- Create: `src/app/employer/profile/page.tsx`

- [ ] **Step 1: Create the ProfileCard component**

```typescript
// src/components/employer/profile-card.tsx
type Field = { label: string; value: string };

function FieldRow({ label, value }: Field) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function ProfileCard({
  title,
  fields,
}: {
  title: string;
  fields: Field[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-700 mb-4">{title}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <FieldRow key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
    </div>
  );
}
```

- [ ] **Step 2: Create the profile page**

This is a Server Component. It fetches directly via Prisma using the same field whitelist as the API route — no `markupRate`, `paymentTermDays`, or `notes`.

```typescript
// src/app/employer/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileCard } from "@/components/employer/profile-card";

const statusColors = {
  INVITED: "bg-yellow-100 text-yellow-700",
  PENDING_SIGNATURE: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
} as const;

export default async function EmployerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;

  const employer = await prisma.employer.findUnique({
    where: { userId },
    select: {
      companyName: true,
      kvkNumber: true,
      vatNumber: true,
      billingAddress: true,
      city: true,
      postalCode: true,
      contactFirst: true,
      contactLast: true,
      phone: true,
      status: true,
    },
  });

  if (!employer) {
    return <div className="p-8">Profile not found. Contact admin.</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{employer.companyName}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded ${statusColors[employer.status]}`}
        >
          {employer.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfileCard
          title="Company"
          fields={[
            { label: "KVK Number", value: employer.kvkNumber },
            { label: "VAT Number", value: employer.vatNumber },
            { label: "Billing Address", value: employer.billingAddress },
            { label: "City", value: employer.city },
            { label: "Postal Code", value: employer.postalCode },
          ]}
        />
        <ProfileCard
          title="Contact"
          fields={[
            {
              label: "Name",
              value: `${employer.contactFirst} ${employer.contactLast}`,
            },
            { label: "Phone", value: employer.phone },
          ]}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/employer/profile-card.tsx src/app/employer/profile/page.tsx
git commit -m "feat: add employer profile page (read-only)"
```

---

## Task 6: Admin employer list page

**Files:**
- Create: `src/app/admin/employers/page.tsx`

Server Component; fetches employers directly via Prisma (admin context, all fields visible).

- [ ] **Step 1: Create the page**

```typescript
// src/app/admin/employers/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import type { EmployerStatus } from "@prisma/client";

const statusColors: Record<EmployerStatus, string> = {
  INVITED: "bg-yellow-100 text-yellow-700",
  PENDING_SIGNATURE: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export default async function AdminEmployersPage() {
  const employers = await prisma.employer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employers</h1>
        <Link
          href="/admin/employers/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          New Employer
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Markup</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employers.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{e.companyName}</p>
                  <p className="text-xs text-gray-400">{e.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {e.contactFirst} {e.contactLast}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${statusColors[e.status]}`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {e.markupRate.toString()}%
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {format(e.createdAt, "d MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/employers/${e.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employers.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-400">No employers yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/employers/page.tsx
git commit -m "feat: add admin employer list page"
```

---

## Task 7: Admin employer API — GET list + POST create

**Files:**
- Create: `src/app/api/admin/employers/route.ts`

POST creates a `User` (role=EMPLOYER) + `Employer` in a Prisma transaction, then sends a Resend welcome email. Duplicate email returns 400.

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/admin/employers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const createEmployerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1),
  kvkNumber: z.string().min(1),
  vatNumber: z.string().min(1),
  billingAddress: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  contactFirst: z.string().min(1),
  contactLast: z.string().min(1),
  phone: z.string().min(1),
  markupRate: z.number().min(0),
  paymentTermDays: z.number().int().min(1).default(14),
  notes: z.string().optional(),
});

function adminOnly(session: Awaited<ReturnType<typeof getServerSession>>) {
  const role = (session?.user as typeof session.user & { role?: string })?.role;
  return session && role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employers = await prisma.employer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });

  return NextResponse.json(employers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createEmployerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { email, password, ...employerFields } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const employer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: `${employerFields.contactFirst} ${employerFields.contactLast}`,
        role: "EMPLOYER",
      },
    });

    return tx.employer.create({
      data: { userId: user.id, ...employerFields },
      include: { user: { select: { email: true } } },
    });
  });

  const loginUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`;

  await resend.emails.send({
    from: "Tillers Staffing <noreply@tillers.nl>",
    to: email,
    subject: "Your Tillers Staffing account is ready",
    text: [
      "Welcome to Tillers Staffing!",
      "",
      "Your employer account has been created. Use the details below to sign in:",
      "",
      `Login page: ${loginUrl}`,
      `Email:      ${email}`,
      `Password:   ${password}`,
      "",
      "Please change your password after your first login.",
      "",
      "Tillers Staffing",
    ].join("\n"),
  });

  return NextResponse.json(employer, { status: 201 });
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/employers/route.ts
git commit -m "feat: add GET + POST /api/admin/employers with Resend welcome email"
```

---

## Task 8: Admin new employer page + form component

**Files:**
- Create: `src/components/admin/employer-form.tsx`
- Create: `src/app/admin/employers/new/page.tsx`

`employer-form.tsx` is a client component that owns state, calls `POST /api/admin/employers`, and redirects to the new employer's detail page on success.

- [ ] **Step 1: Create the form component**

```typescript
// src/components/admin/employer-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  step,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  step?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {!required && (
          <span className="ml-1 text-xs text-gray-400">(optional)</span>
        )}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        minLength={minLength}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function NewEmployerForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = new FormData(e.currentTarget);

    const body = {
      email: data.get("email") as string,
      password: data.get("password") as string,
      companyName: data.get("companyName") as string,
      kvkNumber: data.get("kvkNumber") as string,
      vatNumber: data.get("vatNumber") as string,
      billingAddress: data.get("billingAddress") as string,
      city: data.get("city") as string,
      postalCode: data.get("postalCode") as string,
      contactFirst: data.get("contactFirst") as string,
      contactLast: data.get("contactLast") as string,
      phone: data.get("phone") as string,
      markupRate: Number(data.get("markupRate")),
      paymentTermDays: Number(data.get("paymentTermDays")),
      notes: (data.get("notes") as string) || undefined,
    };

    const res = await fetch("/api/admin/employers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(
        typeof json.error === "string" ? json.error : "Something went wrong"
      );
      setLoading(false);
      return;
    }

    const employer = await res.json();
    router.push(`/admin/employers/${employer.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" />
          <Field label="Password" name="password" type="password" minLength={8} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Company
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Company Name" name="companyName" />
          </div>
          <Field label="KVK Number" name="kvkNumber" />
          <Field label="VAT Number" name="vatNumber" />
          <div className="md:col-span-2">
            <Field label="Billing Address" name="billingAddress" />
          </div>
          <Field label="City" name="city" />
          <Field label="Postal Code" name="postalCode" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" name="contactFirst" />
          <Field label="Last Name" name="contactLast" />
          <Field label="Phone" name="phone" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Commercial
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Markup Rate (%)"
            name="markupRate"
            type="number"
            step="0.01"
          />
          <Field
            label="Payment Term (days)"
            name="paymentTermDays"
            type="number"
            defaultValue={14}
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Employer"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the new employer page**

```typescript
// src/app/admin/employers/new/page.tsx
import Link from "next/link";
import { NewEmployerForm } from "@/components/admin/employer-form";

export default function AdminNewEmployerPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/employers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Employers
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">New Employer</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewEmployerForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/employer-form.tsx src/app/admin/employers/new/page.tsx
git commit -m "feat: add admin new employer page with creation form"
```

---

## Task 9: Admin employer [id] API — GET + PATCH

**Files:**
- Create: `src/app/api/admin/employers/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/admin/employers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateEmployerSchema = z.object({
  companyName: z.string().min(1).optional(),
  kvkNumber: z.string().min(1).optional(),
  vatNumber: z.string().min(1).optional(),
  billingAddress: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  contactFirst: z.string().min(1).optional(),
  contactLast: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  markupRate: z.number().min(0).optional(),
  paymentTermDays: z.number().int().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: z
    .enum(["INVITED", "PENDING_SIGNATURE", "ACTIVE", "INACTIVE"])
    .optional(),
});

function adminOnly(session: Awaited<ReturnType<typeof getServerSession>>) {
  const role = (session?.user as typeof session.user & { role?: string })?.role;
  return session && role === "ADMIN";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const employer = await prisma.employer.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });

  if (!employer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(employer);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = updateEmployerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const employer = await prisma.employer.update({
    where: { id },
    data: result.data,
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json(employer);
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/employers/[id]/route.ts
git commit -m "feat: add GET + PATCH /api/admin/employers/[id]"
```

---

## Task 10: Employer type + admin employer detail page

**Files:**
- Create: `src/types/employer.ts`
- Create: `src/components/admin/employer-detail.tsx`
- Create: `src/app/admin/employers/[id]/page.tsx`

`EmployerWithEmail` is a serialized type (Decimal → string, Date → string) safe to pass from Server Component to Client Component. The server component serializes before passing; the client component uses the serialized type.

- [ ] **Step 1: Create the shared employer type**

```typescript
// src/types/employer.ts
import type { EmployerStatus } from "@prisma/client";

export type EmployerWithEmail = {
  id: string;
  companyName: string;
  kvkNumber: string;
  vatNumber: string;
  billingAddress: string;
  city: string;
  postalCode: string;
  contactFirst: string;
  contactLast: string;
  phone: string;
  markupRate: string;        // Decimal serialized to string
  paymentTermDays: number;
  notes: string | null;
  status: EmployerStatus;
  createdAt: string;         // Date serialized to ISO string
  updatedAt: string;
  user: { email: string };
};
```

- [ ] **Step 2: Create the employer detail client component**

This component manages view/edit toggle state. In view mode it displays all fields. In edit mode it renders an inline form. The "Activate/Deactivate" button is always visible outside the toggle.

```typescript
// src/components/admin/employer-detail.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmployerWithEmail } from "@/types/employer";
import type { EmployerStatus } from "@prisma/client";

const statusColors: Record<EmployerStatus, string> = {
  INVITED: "bg-yellow-100 text-yellow-700",
  PENDING_SIGNATURE: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

function ReadField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

function EditField({
  label,
  name,
  defaultValue,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  defaultValue: string | number | null;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function EmployerDetail({ employer: initial }: { employer: EmployerWithEmail }) {
  const router = useRouter();
  const [employer, setEmployer] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData(e.currentTarget);

    const body = {
      companyName: data.get("companyName") as string,
      kvkNumber: data.get("kvkNumber") as string,
      vatNumber: data.get("vatNumber") as string,
      billingAddress: data.get("billingAddress") as string,
      city: data.get("city") as string,
      postalCode: data.get("postalCode") as string,
      contactFirst: data.get("contactFirst") as string,
      contactLast: data.get("contactLast") as string,
      phone: data.get("phone") as string,
      markupRate: Number(data.get("markupRate")),
      paymentTermDays: Number(data.get("paymentTermDays")),
      notes: (data.get("notes") as string) || null,
    };

    const res = await fetch(`/api/admin/employers/${employer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(
        typeof json.error === "string" ? json.error : "Something went wrong"
      );
      setSaving(false);
      return;
    }

    const updated = await res.json();
    setEmployer({
      ...updated,
      markupRate: updated.markupRate.toString(),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  async function handleStatusToggle() {
    setToggling(true);
    const newStatus: EmployerStatus =
      employer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const res = await fetch(`/api/admin/employers/${employer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      const updated = await res.json();
      setEmployer((prev) => ({ ...prev, status: updated.status }));
      router.refresh();
    }
    setToggling(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {employer.companyName}
          </h1>
          <span
            className={`text-xs px-2 py-0.5 rounded ${statusColors[employer.status]}`}
          >
            {employer.status}
          </span>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleStatusToggle}
            disabled={toggling}
            className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${
              employer.status === "ACTIVE"
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {toggling
              ? "Saving..."
              : employer.status === "ACTIVE"
              ? "Deactivate"
              : "Activate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Company
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <EditField
                  label="Company Name"
                  name="companyName"
                  defaultValue={employer.companyName}
                />
              </div>
              <EditField label="KVK Number" name="kvkNumber" defaultValue={employer.kvkNumber} />
              <EditField label="VAT Number" name="vatNumber" defaultValue={employer.vatNumber} />
              <div className="md:col-span-2">
                <EditField
                  label="Billing Address"
                  name="billingAddress"
                  defaultValue={employer.billingAddress}
                />
              </div>
              <EditField label="City" name="city" defaultValue={employer.city} />
              <EditField label="Postal Code" name="postalCode" defaultValue={employer.postalCode} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditField label="First Name" name="contactFirst" defaultValue={employer.contactFirst} />
              <EditField label="Last Name" name="contactLast" defaultValue={employer.contactLast} />
              <EditField label="Phone" name="phone" defaultValue={employer.phone} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Commercial
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditField
                label="Markup Rate (%)"
                name="markupRate"
                type="number"
                step="0.01"
                defaultValue={employer.markupRate}
              />
              <EditField
                label="Payment Term (days)"
                name="paymentTermDays"
                type="number"
                defaultValue={employer.paymentTermDays}
              />
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={employer.notes ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Company
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="Company Name" value={employer.companyName} />
              <ReadField label="Email" value={employer.user.email} />
              <ReadField label="KVK Number" value={employer.kvkNumber} />
              <ReadField label="VAT Number" value={employer.vatNumber} />
              <ReadField label="Billing Address" value={employer.billingAddress} />
              <ReadField label="City" value={employer.city} />
              <ReadField label="Postal Code" value={employer.postalCode} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Contact
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="First Name" value={employer.contactFirst} />
              <ReadField label="Last Name" value={employer.contactLast} />
              <ReadField label="Phone" value={employer.phone} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Commercial
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="Markup Rate" value={`${employer.markupRate}%`} />
              <ReadField
                label="Payment Term"
                value={`${employer.paymentTermDays} days`}
              />
              <div className="sm:col-span-2">
                <ReadField label="Notes" value={employer.notes} />
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the detail page (server shell)**

The server component fetches the employer, serializes Decimal and Date fields, and passes them to `<EmployerDetail>`.

```typescript
// src/app/admin/employers/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmployerDetail } from "@/components/admin/employer-detail";
import type { EmployerWithEmail } from "@/types/employer";

export default async function AdminEmployerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const raw = await prisma.employer.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });

  if (!raw) notFound();

  // Serialize non-JSON-safe fields before passing to a client component
  const employer: EmployerWithEmail = {
    ...raw,
    markupRate: raw.markupRate.toString(),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/employers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Employers
        </Link>
      </div>
      <EmployerDetail employer={employer} />
    </div>
  );
}
```

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Run a full build to confirm no type errors**

```bash
npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors. If there are type errors, fix them before committing.

- [ ] **Step 6: Commit**

```bash
git add src/types/employer.ts src/components/admin/employer-detail.tsx src/app/admin/employers/[id]/page.tsx
git commit -m "feat: add admin employer detail page with view/edit toggle"
```

---

## Done

All employer profile pages and API routes are in place. Manual verification checklist:

- [ ] Log in as employer → see top-bar layout on `/employer`
- [ ] `/employer/profile` shows company + contact info, no financial fields
- [ ] Log in as admin → `/admin/employers` shows table with markup rates
- [ ] `/admin/employers/new` creates an employer, sends email, redirects to detail page
- [ ] `/admin/employers/[id]` shows all fields; Edit button reveals inline edit form
- [ ] Deactivate/Activate button changes status immediately
- [ ] Attempting to access `/api/employer/profile` as admin returns 403
