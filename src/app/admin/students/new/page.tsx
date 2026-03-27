'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function NewStudentPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    temporaryPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ studentId: string; inviteUrl: string } | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.formErrors?.[0] ?? data.error ?? 'Failed to create student')
        return
      }
      setResult({ studentId: data.student.id, inviteUrl: data.inviteUrl })
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Student created</h1>
        <Card className="space-y-4">
          <p className="text-sm text-gray-700">
            No email was sent. Copy this link and share it with the student.
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Invite link</label>
            <input
              readOnly
              value={result.inviteUrl}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-800 select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
          <div className="flex gap-3">
            <Link href={`/admin/students/${result.studentId}`}>
              <Button variant="secondary">View profile</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null)
                setForm({ firstName: '', lastName: '', email: '', temporaryPassword: '' })
              }}
            >
              Create another
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students" className="text-sm text-gray-500 hover:text-gray-700">
          ← Students
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">New Student</h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" name="firstName" value={form.firstName} onChange={handleChange} required />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input
            label="Temporary password"
            name="temporaryPassword"
            type="password"
            value={form.temporaryPassword}
            onChange={handleChange}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={submitting}>Create student</Button>
        </form>
      </Card>
    </div>
  )
}
