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
