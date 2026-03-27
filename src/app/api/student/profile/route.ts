import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isProfileComplete } from '@/utils/student'
import type { Role } from '@prisma/client'

type SessionUser = {
  role: Role
  id: string
  email?: string | null
  name?: string | null
}

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

  const user = session.user as SessionUser
  if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
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
    .optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  nationality: z.string().min(1).optional(),
  iban: z.string().optional(),
  ibanHolderName: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  loonheffingskorting: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await prisma.student.findUnique({
    where: { userId: user.id },
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

  const { dateOfBirth: dateOfBirthRaw, ...restData } = parsed.data

  const updated = await prisma.student.update({
    where: { userId: user.id },
    data: {
      ...restData,
      // Convert date string to Date object if provided
      ...(dateOfBirthRaw !== undefined ? { dateOfBirth: new Date(dateOfBirthRaw) } : {}),
      ...(shouldComplete ? { status: 'PROFILE_COMPLETE' } : {}),
    },
    select: studentSelect,
  })

  return NextResponse.json(updated)
}
