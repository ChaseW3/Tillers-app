'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentStatus } from '@/types/student'
import { Button } from '@/components/ui/button'

type Props = {
  studentId: string
  currentStatus: StudentStatus
}

const TRANSITIONS: Partial<Record<StudentStatus, { label: string; next: StudentStatus; variant: 'primary' | 'danger' }>> = {
  PROFILE_COMPLETE: { label: 'Activate', next: 'ACTIVE', variant: 'primary' },
  ACTIVE: { label: 'Deactivate', next: 'INACTIVE', variant: 'danger' },
  INACTIVE: { label: 'Activate', next: 'ACTIVE', variant: 'primary' },
}

export function StudentStatusButton({ studentId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const transition = TRANSITIONS[currentStatus]

  if (!transition) {
    // INVITED — cannot activate yet
    return (
      <Button variant="secondary" disabled title="Student must complete their profile first">
        Activate
      </Button>
    )
  }

  const nextStatus = transition.next

  async function handleClick() {
    setLoading(true)
    try {
      await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={transition.variant} loading={loading} onClick={handleClick}>
      {transition.label}
    </Button>
  )
}
