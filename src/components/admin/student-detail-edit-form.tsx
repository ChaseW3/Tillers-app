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
          dateOfBirth: form.dateOfBirth || undefined,
          bsn: form.bsn || undefined,
          graduationYear: form.graduationYear ? parseInt(form.graduationYear, 10) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.formErrors?.[0] ?? data.error ?? 'Failed to save')
        return
      }
      router.refresh()
      onCancel()
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
