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
