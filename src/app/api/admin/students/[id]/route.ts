import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { encryptBsn, decryptBsn } from '@/utils/crypto'
import { StudentStatus } from '@prisma/client'

type SessionUser = { id: string; role: string }

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
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
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
    hourlyRate: rest.hourlyRate?.toString() ?? null,
    bsn: bsnEncrypted ? decryptBsn(bsnEncrypted) : null,
  })
}

const patchAdminStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  nationality: z.string().min(1).optional(),
  /** Raw BSN — will be encrypted before writing to bsnEncrypted */
  bsn: z.string().optional(),
  iban: z.string().optional(),
  ibanHolderName: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
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
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
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
      ...(dateOfBirth !== undefined ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      ...(bsn !== undefined ? { bsnEncrypted: bsn ? encryptBsn(bsn) : '' } : {}),
      ...(newStatus ? { status: newStatus } : {}),
    },
    select: adminStudentSelect,
  })

  const { bsnEncrypted, ...updatedRest } = updated
  return NextResponse.json({
    ...updatedRest,
    hourlyRate: updatedRest.hourlyRate?.toString() ?? null,
    bsn: bsnEncrypted ? decryptBsn(bsnEncrypted) : null,
  })
}
