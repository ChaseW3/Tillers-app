// src/components/student/profile-form-emergency.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentProfile } from '@/types/student'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ProfileFormEmergency({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const [form, setForm] = useState({
    emergencyName: profile.emergencyName ?? '',
    emergencyPhone: profile.emergencyPhone ?? '',
    loonheffingskorting: profile.loonheffingskorting,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, loonheffingskorting: e.target.checked }))
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
        body: JSON.stringify(form),
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
      <Input label="Emergency contact name" name="emergencyName" value={form.emergencyName} onChange={handleTextChange} />
      <Input label="Emergency contact phone" name="emergencyPhone" type="tel" value={form.emergencyPhone} onChange={handleTextChange} />
      <div className="flex items-center gap-2">
        <input
          id="loonheffingskorting"
          name="loonheffingskorting"
          type="checkbox"
          checked={form.loonheffingskorting}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="loonheffingskorting" className="text-sm font-medium text-gray-700">
          Loonheffingskorting (apply tax credit)
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save</Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
