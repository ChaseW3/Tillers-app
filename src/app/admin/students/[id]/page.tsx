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
  if (!session || (session.user as { role: string }).role !== 'ADMIN') redirect('/login')

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

  const { bsnEncrypted, hourlyRate, ...rest } = student
  const detail: AdminStudentDetail = {
    ...rest,
    hourlyRate: hourlyRate?.toString() ?? null,
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

      <Card>
        <StudentDetailPanel student={detail} />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Account Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              <StatusBadge status={detail.status} />
            </p>
          </div>
          <StudentStatusButton studentId={detail.id} currentStatus={detail.status} />
        </div>
      </Card>
    </div>
  )
}
