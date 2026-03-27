'use client'

import { useState } from 'react'
import type { AdminStudentDetail } from '@/types/student'
import { Button } from '@/components/ui/button'
import { StudentDetailEditForm } from '@/components/admin/student-detail-edit-form'

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
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
