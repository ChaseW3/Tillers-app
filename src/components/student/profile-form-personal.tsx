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
          dateOfBirth: form.dateOfBirth || undefined,
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
