# Student Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Module 1 — Student Profiles: student self-service tabbed profile editor, admin student list/create/detail pages, and all supporting API routes with strict role-based field access.

**Architecture:** Server Components fetch initial data directly via Prisma (no internal API hops). Client Component islands handle interactive forms and URL-based tab state (`?tab=`). All mutations (from client) go through explicit API routes that enforce role checks before any DB query. BSN is decrypted only in the admin GET route and admin server component — never exposed to students.

**Tech Stack:** Next.js 15 App Router, Prisma (`@prisma/client`), NextAuth v4, Zod, Tailwind CSS v3, Vitest (unit tests), bcryptjs, `next-auth/jwt` (invite token signing)

---

## File Map

| File | Role |
|---|---|
| `src/types/student.ts` | Shared TypeScript types for API responses |
| `src/utils/student.ts` | `isProfileComplete()` pure function |
| `src/utils/__tests__/student.test.ts` | Unit tests for above |
| `src/components/ui/badge.tsx` | `StatusBadge` — coloured pill for StudentStatus |
| `src/components/ui/button.tsx` | `Button` — variant-aware button primitive |
| `src/components/ui/input.tsx` | `Input` — labeled input with error state |
| `src/components/ui/card.tsx` | `Card` — white rounded card wrapper |
| `src/components/student/profile-tabs.tsx` | `"use client"` tab shell, reads/writes `?tab=` param |
| `src/components/student/profile-form-personal.tsx` | `"use client"` Personal tab form |
| `src/components/student/profile-form-banking.tsx` | `"use client"` Banking tab form |
| `src/components/student/profile-form-emergency.tsx` | `"use client"` Emergency + loonheffingskorting tab form |
| `src/components/admin/student-list-table.tsx` | Server-renderable student table |
| `src/components/admin/student-status-button.tsx` | `"use client"` activate/deactivate toggle |
| `src/components/admin/student-detail-edit-form.tsx` | `"use client"` inline profile edit for admin |
| `src/app/api/student/profile/route.ts` | GET + PATCH student's own profile |
| `src/app/api/admin/students/route.ts` | GET list + POST create student |
| `src/app/api/admin/students/[id]/route.ts` | GET detail + PATCH update |
| `src/app/student/profile/page.tsx` | Student profile page (Server Component) |
| `src/app/admin/students/page.tsx` | Admin student list page (Server Component) |
| `src/app/admin/students/new/page.tsx` | Admin create student page (Server Component) |
| `src/app/admin/students/[id]/page.tsx` | Admin student detail page (Server Component) |

---

## Task 1: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add scripts + devDependencies)

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

Expected: `vitest` appears in `package.json` devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```typescript
// src/test/setup.ts
// Placeholder for global test setup (env vars, mocks)
```

- [ ] **Step 4: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify Vitest runs**

```bash
npm test
```

Expected output: `No test files found` (or similar — no errors, no crashes).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json package-lock.json
git commit -m "chore: add Vitest for unit testing"
```

---

## Task 2: Types and `isProfileComplete` utility

**Files:**
- Create: `src/types/student.ts`
- Create: `src/utils/student.ts`
- Create: `src/utils/__tests__/student.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/student.test.ts
import { describe, it, expect } from 'vitest'
import { isProfileComplete } from '../student'

const complete = {
  firstName: 'Jan',
  lastName: 'De Vries',
  phone: '+31612345678',
  address: 'Hoofdstraat 1',
  city: 'Amsterdam',
  postalCode: '1011 AB',
  iban: 'NL91ABNA0417164300',
  ibanHolderName: 'J. de Vries',
  emergencyName: 'Piet de Vries',
}

describe('isProfileComplete', () => {
  it('returns true when all required fields are present and non-empty', () => {
    expect(isProfileComplete(complete)).toBe(true)
  })

  it('returns false when firstName is null', () => {
    expect(isProfileComplete({ ...complete, firstName: null })).toBe(false)
  })

  it('returns false when iban is undefined', () => {
    expect(isProfileComplete({ ...complete, iban: undefined })).toBe(false)
  })

  it('returns false when emergencyName is an empty string', () => {
    expect(isProfileComplete({ ...complete, emergencyName: '' })).toBe(false)
  })

  it('returns false when phone is whitespace only', () => {
    expect(isProfileComplete({ ...complete, phone: '   ' })).toBe(false)
  })

  it('returns false when fields object is empty', () => {
    expect(isProfileComplete({})).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../student'`

- [ ] **Step 3: Create `src/utils/student.ts`**

```typescript
// src/utils/student.ts

type ProfileCompletionFields = {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  iban?: string | null
  ibanHolderName?: string | null
  emergencyName?: string | null
}

/**
 * Returns true when all fields required for PROFILE_COMPLETE status are
 * non-null, non-undefined, and non-empty (after trimming).
 */
export function isProfileComplete(fields: ProfileCompletionFields): boolean {
  return [
    fields.firstName,
    fields.lastName,
    fields.phone,
    fields.address,
    fields.city,
    fields.postalCode,
    fields.iban,
    fields.ibanHolderName,
    fields.emergencyName,
  ].every((f) => typeof f === 'string' && f.trim().length > 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 6 tests pass.

- [ ] **Step 5: Create `src/types/student.ts`**

```typescript
// src/types/student.ts
import type { StudentStatus } from '@prisma/client'

export type { StudentStatus }

/** Safe student fields returned to the student themselves. Never includes
 *  bsnEncrypted, hourlyRate, or nmbrsEmployeeId. */
export type StudentProfile = {
  id: string
  firstName: string | null
  lastName: string | null
  dateOfBirth: Date | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  nationality: string
  iban: string | null
  ibanHolderName: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  loonheffingskorting: boolean
  status: StudentStatus
  user: {
    email: string
    name: string | null
  }
}

/** Row shape used in the admin student list table. */
export type AdminStudentRow = {
  id: string
  firstName: string | null
  lastName: string | null
  status: StudentStatus
  phone: string | null
  createdAt: Date
}

/** Full student shape returned to admin. Includes decrypted BSN as `bsn`
 *  and hourlyRate (reserved for job/contract module — not displayed here). */
export type AdminStudentDetail = {
  id: string
  firstName: string | null
  lastName: string | null
  dateOfBirth: Date | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  nationality: string
  /** Decrypted BSN — only present in admin GET /api/admin/students/[id] */
  bsn: string | null
  iban: string | null
  ibanHolderName: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  loonheffingskorting: boolean
  status: StudentStatus
  university: string | null
  studyProgram: string | null
  graduationYear: number | null
  /** Reserved for job/contract module. Do not display in student profiles UI. */
  hourlyRate: string | null
  createdAt: Date
  user: {
    email: string
    name: string | null
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/student.ts src/utils/__tests__/student.test.ts src/types/student.ts
git commit -m "feat: add isProfileComplete utility and student types"
```

---

## Task 3: UI primitives

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/badge.tsx`

These are pure Tailwind components with no business logic — no tests required.

- [ ] **Step 1: Create `src/components/ui/card.tsx`**

```typescript
// src/components/ui/card.tsx
type CardProps = {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/ui/button.tsx`**

```typescript
// src/components/ui/button.tsx
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
}

export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Create `src/components/ui/input.tsx`**

```typescript
// src/components/ui/input.tsx
import { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/ui/badge.tsx`**

```typescript
// src/components/ui/badge.tsx
import type { StudentStatus } from '@prisma/client'

const statusConfig: Record<StudentStatus, { label: string; className: string }> = {
  INVITED: { label: 'Invited', className: 'bg-blue-100 text-blue-700' },
  PROFILE_COMPLETE: { label: 'Profile Complete', className: 'bg-yellow-100 text-yellow-700' },
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-gray-600' },
}

export function StatusBadge({ status }: { status: StudentStatus }) {
  const { label, className } = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI primitives (Card, Button, Input, StatusBadge)"
```

---

## Task 4: API route — `/api/student/profile` (GET + PATCH)

**Files:**
- Create: `src/app/api/student/profile/route.ts`

The Zod schema is defined inside this file. Auth check happens before any DB query.
`dateOfBirth` is accepted as an ISO date string (`"YYYY-MM-DD"`) and stored as a Prisma DateTime.

- [ ] **Step 1: Create `src/app/api/student/profile/route.ts`**

```typescript
// src/app/api/student/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isProfileComplete } from '@/utils/student'

/** Fields safe to return to the student — never bsnEncrypted, hourlyRate, nmbrsEmployeeId */
const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  nationality: true,
  iban: true,
  ibanHolderName: true,
  emergencyName: true,
  emergencyPhone: true,
  loonheffingskorting: true,
  status: true,
  user: {
    select: {
      email: true,
      name: true,
    },
  },
} as const

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: studentSelect,
  })

  return NextResponse.json(student)
}

const patchProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  nationality: z.string().min(1).optional(),
  iban: z.string().nullable().optional(),
  ibanHolderName: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  loonheffingskorting: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      iban: true,
      ibanHolderName: true,
      emergencyName: true,
      status: true,
    },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  }

  const merged = { ...existing, ...parsed.data }
  const shouldComplete =
    existing.status === 'INVITED' && isProfileComplete(merged)

  const updated = await prisma.student.update({
    where: { userId: session.user.id },
    data: {
      ...parsed.data,
      // Convert date string to Date object if provided
      ...(parsed.data.dateOfBirth !== undefined
        ? { dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null }
        : {}),
      ...(shouldComplete ? { status: 'PROFILE_COMPLETE' } : {}),
    },
    select: studentSelect,
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
npm run dev
```

In another terminal:
```bash
# Should return 401 (not logged in)
curl -s http://localhost:3000/api/student/profile | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/student/profile/route.ts
git commit -m "feat: add GET and PATCH /api/student/profile"
```

---

## Task 5: API route — `/api/admin/students` (GET + POST)

**Files:**
- Create: `src/app/api/admin/students/route.ts`

POST creates a User (role: STUDENT) + Student record. Generates an invite token using `next-auth/jwt` encode (no new dependency — already in stack). Returns `inviteUrl` in response; no email is sent.

- [ ] **Step 1: Create `src/app/api/admin/students/route.ts`**

```typescript
// src/app/api/admin/students/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { StudentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status') as StudentStatus | null

  const students = await prisma.student.findMany({
    where: statusParam ? { status: statusParam } : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(students)
}

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  temporaryPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createStudentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { firstName, lastName, email, temporaryPassword } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 12)

  const user = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      passwordHash,
      role: 'STUDENT',
      student: {
        create: {
          firstName,
          lastName,
        },
      },
    },
    select: {
      id: true,
      student: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  // Generate invite token using the same secret as NextAuth.
  // The /setup-account page (built in a future module) will consume this.
  const inviteToken = await encode({
    token: { sub: user.id, type: 'invite' },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
  const inviteUrl = `${process.env.NEXTAUTH_URL}/setup-account?token=${inviteToken}`

  return NextResponse.json(
    { student: user.student, inviteUrl },
    { status: 201 }
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/students/route.ts
git commit -m "feat: add GET and POST /api/admin/students"
```

---

## Task 6: API route — `/api/admin/students/[id]` (GET + PATCH)

**Files:**
- Create: `src/app/api/admin/students/[id]/route.ts`

GET decrypts BSN via `decryptBsn` and returns it as `bsn`. PATCH encrypts incoming raw BSN via `encryptBsn`. Status transition rule: cannot set `ACTIVE` if current status is `INVITED`.

Note: In Next.js 15, `params` in route handlers is a `Promise` — must be awaited.

- [ ] **Step 1: Create `src/app/api/admin/students/[id]/route.ts`**

```typescript
// src/app/api/admin/students/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { encryptBsn, decryptBsn } from '@/utils/crypto'
import { StudentStatus } from '@prisma/client'

/** All student fields admin can read, including sensitive ones */
const adminStudentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  nationality: true,
  bsnEncrypted: true,
  iban: true,
  ibanHolderName: true,
  emergencyName: true,
  emergencyPhone: true,
  loonheffingskorting: true,
  status: true,
  university: true,
  studyProgram: true,
  graduationYear: true,
  hourlyRate: true,
  createdAt: true,
  user: {
    select: { email: true, name: true },
  },
} as const

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    select: adminStudentSelect,
  })

  if (!student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { bsnEncrypted, ...rest } = student
  return NextResponse.json({
    ...rest,
    bsn: bsnEncrypted ? decryptBsn(bsnEncrypted) : null,
  })
}

const patchAdminStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  nationality: z.string().min(1).optional(),
  /** Raw BSN — will be encrypted before writing to bsnEncrypted */
  bsn: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  ibanHolderName: z.string().nullable().optional(),
  emergencyName: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  loonheffingskorting: z.boolean().optional(),
  university: z.string().nullable().optional(),
  studyProgram: z.string().nullable().optional(),
  graduationYear: z.number().int().nullable().optional(),
  status: z.enum(['INVITED', 'PROFILE_COMPLETE', 'ACTIVE', 'INACTIVE']).optional(),
})

const ALLOWED_STATUS_TRANSITIONS: Partial<Record<StudentStatus, StudentStatus[]>> = {
  INVITED: [],
  PROFILE_COMPLETE: ['ACTIVE'],
  ACTIVE: ['INACTIVE'],
  INACTIVE: ['ACTIVE'],
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const body = await req.json()
  const parsed = patchAdminStudentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { bsn, status: newStatus, dateOfBirth, ...rest } = parsed.data

  // Validate status transition
  if (newStatus) {
    const current = await prisma.student.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${newStatus}` },
        { status: 422 }
      )
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...rest,
      ...(dateOfBirth !== undefined
        ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
        : {}),
      ...(bsn !== undefined
        ? { bsnEncrypted: bsn ? encryptBsn(bsn) : null }
        : {}),
      ...(newStatus ? { status: newStatus } : {}),
    },
    select: adminStudentSelect,
  })

  const { bsnEncrypted, ...updatedRest } = updated
  return NextResponse.json({
    ...updatedRest,
    bsn: bsnEncrypted ? decryptBsn(bsnEncrypted) : null,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/students/[id]/route.ts
git commit -m "feat: add GET and PATCH /api/admin/students/[id] with BSN encryption and status gates"
```

---

## Task 7: Student profile page and tab components

**Files:**
- Create: `src/components/student/profile-tabs.tsx`
- Create: `src/components/student/profile-form-personal.tsx`
- Create: `src/components/student/profile-form-banking.tsx`
- Create: `src/components/student/profile-form-emergency.tsx`
- Create: `src/app/student/profile/page.tsx`

The page fetches data directly from Prisma (server-side). `ProfileTabs` reads `?tab=` from the URL and renders the correct form. Each form independently PATCHes the profile API. `router.refresh()` syncs server state after a successful save.

- [ ] **Step 1: Create `src/components/student/profile-tabs.tsx`**

```typescript
// src/components/student/profile-tabs.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { StudentProfile } from '@/types/student'
import { ProfileFormPersonal } from './profile-form-personal'
import { ProfileFormBanking } from './profile-form-banking'
import { ProfileFormEmergency } from './profile-form-emergency'

type Tab = 'personal' | 'banking' | 'emergency'

const TABS: { id: Tab; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'banking', label: 'Banking' },
  { id: 'emergency', label: 'Emergency' },
]

export function ProfileTabs({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab) ?? 'personal'

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active form */}
      {activeTab === 'personal' && <ProfileFormPersonal profile={profile} />}
      {activeTab === 'banking' && <ProfileFormBanking profile={profile} />}
      {activeTab === 'emergency' && <ProfileFormEmergency profile={profile} />}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/student/profile-form-personal.tsx`**

```typescript
// src/components/student/profile-form-personal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentProfile } from '@/types/student'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function toDateInputValue(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

export function ProfileFormPersonal({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    dateOfBirth: toDateInputValue(profile.dateOfBirth),
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    postalCode: profile.postalCode ?? '',
    nationality: profile.nationality ?? 'NL',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dateOfBirth: form.dateOfBirth || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.formErrors?.[0] ?? 'Failed to save')
        return
      }
      setSaved(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" name="firstName" value={form.firstName} onChange={handleChange} required />
        <Input label="Last name" name="lastName" value={form.lastName} onChange={handleChange} required />
      </div>
      <Input label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
      <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
      <Input label="Address" name="address" value={form.address} onChange={handleChange} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="City" name="city" value={form.city} onChange={handleChange} />
        <Input label="Postal code" name="postalCode" value={form.postalCode} onChange={handleChange} />
      </div>
      <Input label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save</Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create `src/components/student/profile-form-banking.tsx`**

```typescript
// src/components/student/profile-form-banking.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentProfile } from '@/types/student'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ProfileFormBanking({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const [form, setForm] = useState({
    iban: profile.iban ?? '',
    ibanHolderName: profile.ibanHolderName ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.formErrors?.[0] ?? 'Failed to save')
        return
      }
      setSaved(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Input label="IBAN" name="iban" value={form.iban} onChange={handleChange} placeholder="NL91ABNA0417164300" />
      <Input label="Account holder name" name="ibanHolderName" value={form.ibanHolderName} onChange={handleChange} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save</Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Create `src/components/student/profile-form-emergency.tsx`**

```typescript
// src/components/student/profile-form-emergency.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentProfile } from '@/types/student'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ProfileFormEmergency({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const [form, setForm] = useState({
    emergencyName: profile.emergencyName ?? '',
    emergencyPhone: profile.emergencyPhone ?? '',
    loonheffingskorting: profile.loonheffingskorting,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, loonheffingskorting: e.target.checked }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.formErrors?.[0] ?? 'Failed to save')
        return
      }
      setSaved(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Input label="Emergency contact name" name="emergencyName" value={form.emergencyName} onChange={handleTextChange} />
      <Input label="Emergency contact phone" name="emergencyPhone" type="tel" value={form.emergencyPhone} onChange={handleTextChange} />
      <div className="flex items-center gap-2">
        <input
          id="loonheffingskorting"
          name="loonheffingskorting"
          type="checkbox"
          checked={form.loonheffingskorting}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="loonheffingskorting" className="text-sm font-medium text-gray-700">
          Loonheffingskorting (apply tax credit)
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save</Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Create `src/app/student/profile/page.tsx`**

```typescript
// src/app/student/profile/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { ProfileTabs } from '@/components/student/profile-tabs'
import type { StudentProfile } from '@/types/student'

const STATUS_BANNERS = {
  INVITED: {
    text: 'Complete your profile to get started.',
    className: 'bg-blue-50 border border-blue-200 text-blue-800',
  },
  PROFILE_COMPLETE: {
    text: 'Profile complete.',
    className: 'bg-green-50 border border-green-200 text-green-800',
  },
  ACTIVE: {
    text: 'Profile complete.',
    className: 'bg-green-50 border border-green-200 text-green-800',
  },
  INACTIVE: {
    text: 'Your account is inactive. Contact your coordinator.',
    className: 'bg-gray-50 border border-gray-200 text-gray-700',
  },
}

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      nationality: true,
      iban: true,
      ibanHolderName: true,
      emergencyName: true,
      emergencyPhone: true,
      loonheffingskorting: true,
      status: true,
      user: {
        select: { email: true, name: true },
      },
    },
  })

  if (!student) redirect('/login')

  const profile = student as StudentProfile
  const banner = STATUS_BANNERS[profile.status]

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <StatusBadge status={profile.status} />
      </div>

      <div className={`rounded-lg px-4 py-3 text-sm ${banner.className}`}>
        {banner.text}
      </div>

      <Card>
        <ProfileTabs profile={profile} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Smoke test in browser**

Start dev server (`npm run dev`). Log in as a student (use seed data: `admin@tillers.nl` / `admin123`, or check seed script for a student account). Navigate to `/student/profile`. Verify:
- Status banner renders
- Tabs switch without page reload
- Save on Personal tab hits the API (check Network tab)

- [ ] **Step 8: Commit**

```bash
git add src/components/student/ src/app/student/profile/
git commit -m "feat: student profile page with tabbed form (Personal/Banking/Emergency)"
```

---

## Task 8: Admin student list page

**Files:**
- Create: `src/components/admin/student-list-table.tsx`
- Create: `src/app/admin/students/page.tsx`

- [ ] **Step 1: Create `src/components/admin/student-list-table.tsx`**

```typescript
// src/components/admin/student-list-table.tsx
import Link from 'next/link'
import type { AdminStudentRow } from '@/types/student'
import { StatusBadge } from '@/components/ui/badge'

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function StudentListTable({ students }: { students: AdminStudentRow[] }) {
  if (students.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">No students found.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Phone</th>
            <th className="pb-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3">
                <Link
                  href={`/admin/students/${s.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {s.firstName} {s.lastName}
                </Link>
              </td>
              <td className="py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="py-3 text-gray-600">{s.phone ?? '—'}</td>
              <td className="py-3 text-gray-500">{formatDate(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/admin/students/page.tsx`**

```typescript
// src/app/admin/students/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentStatus } from '@prisma/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StudentListTable } from '@/components/admin/student-list-table'
import type { AdminStudentRow } from '@/types/student'

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Invited', value: 'INVITED' },
  { label: 'Profile Complete', value: 'PROFILE_COMPLETE' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const { status } = await searchParams
  const statusFilter = status && Object.values(StudentStatus).includes(status as StudentStatus)
    ? (status as StudentStatus)
    : undefined

  const students = await prisma.student.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
        <Link href="/admin/students/new">
          <Button>New Student</Button>
        </Link>
      </div>

      <Card>
        {/* Status filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={opt.value ? `/admin/students?status=${opt.value}` : '/admin/students'}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                (statusFilter ?? '') === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <StudentListTable students={students as AdminStudentRow[]} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/student-list-table.tsx src/app/admin/students/page.tsx
git commit -m "feat: admin student list page with status filter"
```

---

## Task 9: Admin create student page

**Files:**
- Create: `src/app/admin/students/new/page.tsx`

This page is a Server Component shell containing an inline `CreateStudentForm` client component (co-located in the same file — only used here).

- [ ] **Step 1: Create `src/app/admin/students/new/page.tsx`**

```typescript
// src/app/admin/students/new/page.tsx
'use client'

// Note: this file uses 'use client' so the form can manage state.
// Auth check happens in the API route (ADMIN-only POST).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function NewStudentPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    temporaryPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ studentId: string; inviteUrl: string } | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.formErrors?.[0] ?? data.error ?? 'Failed to create student')
        return
      }
      setResult({ studentId: data.student.id, inviteUrl: data.inviteUrl })
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Student created</h1>
        <Card className="space-y-4">
          <p className="text-sm text-gray-700">
            No email was sent. Copy this link and share it with the student.
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Invite link</label>
            <input
              readOnly
              value={result.inviteUrl}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-800 select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
          <div className="flex gap-3">
            <Link href={`/admin/students/${result.studentId}`}>
              <Button variant="secondary">View profile</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null)
                setForm({ firstName: '', lastName: '', email: '', temporaryPassword: '' })
              }}
            >
              Create another
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students" className="text-sm text-gray-500 hover:text-gray-700">
          ← Students
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">New Student</h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" name="firstName" value={form.firstName} onChange={handleChange} required />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input
            label="Temporary password"
            name="temporaryPassword"
            type="password"
            value={form.temporaryPassword}
            onChange={handleChange}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={submitting}>Create student</Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/students/new/page.tsx
git commit -m "feat: admin create student page with invite URL display"
```

---

## Task 10: Admin student detail page

**Files:**
- Create: `src/components/admin/student-status-button.tsx`
- Create: `src/components/admin/student-detail-edit-form.tsx`
- Create: `src/app/admin/students/[id]/page.tsx`

The server component fetches directly from Prisma with BSN decrypted inline. Two client component islands handle mutations: status toggle and profile edit.

- [ ] **Step 1: Create `src/components/admin/student-status-button.tsx`**

```typescript
// src/components/admin/student-status-button.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentStatus } from '@/types/student'
import { Button } from '@/components/ui/button'

type Props = {
  studentId: string
  currentStatus: StudentStatus
}

const TRANSITIONS: Partial<Record<StudentStatus, { label: string; next: StudentStatus; variant: 'primary' | 'danger' }>> = {
  PROFILE_COMPLETE: { label: 'Activate', next: 'ACTIVE', variant: 'primary' },
  ACTIVE: { label: 'Deactivate', next: 'INACTIVE', variant: 'danger' },
  INACTIVE: { label: 'Activate', next: 'ACTIVE', variant: 'primary' },
}

export function StudentStatusButton({ studentId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const transition = TRANSITIONS[currentStatus]

  if (!transition) {
    // INVITED — cannot activate yet
    return (
      <Button variant="secondary" disabled title="Student must complete their profile first">
        Activate
      </Button>
    )
  }

  const nextStatus = transition.next

  async function handleClick() {
    setLoading(true)
    try {
      await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={transition.variant} loading={loading} onClick={handleClick}>
      {transition.label}
    </Button>
  )
}
```

- [ ] **Step 2: Create `src/components/admin/student-detail-edit-form.tsx`**

```typescript
// src/components/admin/student-detail-edit-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminStudentDetail } from '@/types/student'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Props = {
  student: AdminStudentDetail
  onCancel: () => void
}

function toDateInputValue(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

export function StudentDetailEditForm({ student, onCancel }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: student.firstName ?? '',
    lastName: student.lastName ?? '',
    dateOfBirth: toDateInputValue(student.dateOfBirth),
    phone: student.phone ?? '',
    address: student.address ?? '',
    city: student.city ?? '',
    postalCode: student.postalCode ?? '',
    nationality: student.nationality ?? 'NL',
    bsn: student.bsn ?? '',
    iban: student.iban ?? '',
    ibanHolderName: student.ibanHolderName ?? '',
    emergencyName: student.emergencyName ?? '',
    emergencyPhone: student.emergencyPhone ?? '',
    university: student.university ?? '',
    studyProgram: student.studyProgram ?? '',
    graduationYear: student.graduationYear?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dateOfBirth: form.dateOfBirth || null,
          bsn: form.bsn || null,
          graduationYear: form.graduationYear ? parseInt(form.graduationYear, 10) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.formErrors?.[0] ?? data.error ?? 'Failed to save')
        return
      }
      router.refresh()
      onCancel() // exit edit mode
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" name="firstName" value={form.firstName} onChange={handleChange} required />
        <Input label="Last name" name="lastName" value={form.lastName} onChange={handleChange} required />
      </div>
      <Input label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
      <Input label="BSN" name="bsn" value={form.bsn} onChange={handleChange} placeholder="123456789" />
      <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
      <Input label="Address" name="address" value={form.address} onChange={handleChange} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="City" name="city" value={form.city} onChange={handleChange} />
        <Input label="Postal code" name="postalCode" value={form.postalCode} onChange={handleChange} />
      </div>
      <Input label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
      <Input label="IBAN" name="iban" value={form.iban} onChange={handleChange} />
      <Input label="Account holder name" name="ibanHolderName" value={form.ibanHolderName} onChange={handleChange} />
      <Input label="Emergency contact name" name="emergencyName" value={form.emergencyName} onChange={handleChange} />
      <Input label="Emergency contact phone" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} />
      <Input label="University" name="university" value={form.university} onChange={handleChange} />
      <Input label="Study program" name="studyProgram" value={form.studyProgram} onChange={handleChange} />
      <Input label="Graduation year" name="graduationYear" type="number" value={form.graduationYear} onChange={handleChange} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>Save changes</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create `src/app/admin/students/[id]/page.tsx`**

```typescript
// src/app/admin/students/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptBsn } from '@/utils/crypto'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { StudentStatusButton } from '@/components/admin/student-status-button'
import { StudentDetailPanel } from './detail-panel'
import type { AdminStudentDetail } from '@/types/student'

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      nationality: true,
      bsnEncrypted: true,
      iban: true,
      ibanHolderName: true,
      emergencyName: true,
      emergencyPhone: true,
      loonheffingskorting: true,
      status: true,
      university: true,
      studyProgram: true,
      graduationYear: true,
      hourlyRate: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  })

  if (!student) notFound()

  const { bsnEncrypted, ...rest } = student
  const detail: AdminStudentDetail = {
    ...rest,
    hourlyRate: rest.hourlyRate?.toString() ?? null,
    bsn: bsnEncrypted ? decryptBsn(bsnEncrypted) : null,
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            <a href="/admin/students" className="hover:text-gray-700">← Students</a>
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {detail.firstName} {detail.lastName}
          </h1>
          <p className="text-sm text-gray-500">{detail.user.email}</p>
        </div>
        <StatusBadge status={detail.status} />
      </div>

      {/* Profile section */}
      <Card>
        <StudentDetailPanel student={detail} />
      </Card>

      {/* Account status section */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Account Status</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <StatusBadge status={detail.status} />
            </p>
          </div>
          <StudentStatusButton studentId={detail.id} currentStatus={detail.status} />
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/admin/students/[id]/detail-panel.tsx`**

This is a co-located client component that manages the read/edit toggle for the profile section.

```typescript
// src/app/admin/students/[id]/detail-panel.tsx
'use client'

import { useState } from 'react'
import type { AdminStudentDetail } from '@/types/student'
import { Button } from '@/components/ui/button'
import { StudentDetailEditForm } from '@/components/admin/student-detail-edit-form'

function Field({ label, value }: { label: string; value: string | number | boolean | null }) {
  const display =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'boolean'
      ? value ? 'Yes' : 'No'
      : String(value)
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{display}</dd>
    </div>
  )
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('nl-NL', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function StudentDetailPanel({ student }: { student: AdminStudentDetail }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Edit Profile</h2>
        </div>
        <StudentDetailEditForm student={student} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
        <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field label="First name" value={student.firstName} />
        <Field label="Last name" value={student.lastName} />
        <Field label="Date of birth" value={formatDate(student.dateOfBirth)} />
        <Field label="BSN" value={student.bsn} />
        <Field label="Phone" value={student.phone} />
        <Field label="Nationality" value={student.nationality} />
        <Field label="Address" value={student.address} />
        <Field label="City" value={student.city} />
        <Field label="Postal code" value={student.postalCode} />
        <Field label="IBAN" value={student.iban} />
        <Field label="Account holder" value={student.ibanHolderName} />
        <Field label="Emergency contact" value={student.emergencyName} />
        <Field label="Emergency phone" value={student.emergencyPhone} />
        <Field label="Loonheffingskorting" value={student.loonheffingskorting} />
        <Field label="University" value={student.university} />
        <Field label="Study program" value={student.studyProgram} />
        <Field label="Graduation year" value={student.graduationYear} />
      </dl>
    </div>
  )
}
```

- [ ] **Step 5: Add `detail-panel.tsx` to the page import**

The page already imports `StudentDetailPanel` from `'./detail-panel'`. No changes needed if the files were created as above.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: 6 tests pass (from Task 2).

- [ ] **Step 8: Smoke test in browser**

Navigate to `/admin/students` (as admin). Verify:
- Student list renders with status badges
- Status filter pills work
- "New Student" → form → success screen with invite URL
- Click through to student detail → BSN shows in plain text → Edit mode → save → status toggle

- [ ] **Step 9: Final commit**

```bash
git add src/components/admin/ src/app/admin/students/
git commit -m "feat: admin student detail page with inline edit, status toggle, and BSN display"
```
