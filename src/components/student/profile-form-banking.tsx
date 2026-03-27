// src/components/student/profile-form-banking.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentProfile } from '@/types/student'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ProfileFormBanking({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const [form, setForm] = useState({
    iban: profile.iban ?? '',
    ibanHolderName: profile.ibanHolderName ?? '',
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
      <Input label="IBAN" name="iban" value={form.iban} onChange={handleChange} placeholder="NL91ABNA0417164300" />
      <Input label="Account holder name" name="ibanHolderName" value={form.ibanHolderName} onChange={handleChange} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save</Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  )
}
