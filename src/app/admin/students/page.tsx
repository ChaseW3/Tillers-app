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
  if (!session || (session.user as { role: string }).role !== 'ADMIN') redirect('/login')

  const { status } = await searchParams
  const statusFilter =
    status && Object.values(StudentStatus).includes(status as StudentStatus)
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

        <StudentListTable students={students as unknown as AdminStudentRow[]} />
      </Card>
    </div>
  )
}
