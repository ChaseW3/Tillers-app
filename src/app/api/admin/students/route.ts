import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { StudentStatus } from '@prisma/client'
import type { Role } from '@prisma/client'

type SessionUser = {
  role: Role
  id: string
  email?: string | null
  name?: string | null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const rawStatus = searchParams.get('status')
  const statusParam: StudentStatus | null =
    rawStatus !== null && Object.values(StudentStatus).includes(rawStatus as StudentStatus)
      ? (rawStatus as StudentStatus)
      : null

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
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
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
          // Required non-nullable fields — student fills these in via /student/profile
          dateOfBirth: new Date('2000-01-01'),
          phone: '',
          address: '',
          city: '',
          postalCode: '',
          nationality: 'NL',
          bsnEncrypted: '',
          iban: '',
          ibanHolderName: '',
          emergencyName: '',
          emergencyPhone: '',
          hourlyRate: 0,
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
