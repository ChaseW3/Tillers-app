// src/components/student/profile-tabs.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { StudentProfile } from '@/types/student'
import { ProfileFormPersonal } from './profile-form-personal'
import { ProfileFormBanking } from './profile-form-banking'
import { ProfileFormEmergency } from './profile-form-emergency'

type Tab = 'personal' | 'banking' | 'emergency'

const TABS: { id: Tab; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'banking', label: 'Banking' },
  { id: 'emergency', label: 'Emergency' },
]

function ProfileTabsInner({ profile }: { profile: StudentProfile }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab) ?? 'personal'

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' && <ProfileFormPersonal profile={profile} />}
      {activeTab === 'banking' && <ProfileFormBanking profile={profile} />}
      {activeTab === 'emergency' && <ProfileFormEmergency profile={profile} />}
    </div>
  )
}

export function ProfileTabs({ profile }: { profile: StudentProfile }) {
  return (
    <Suspense fallback={null}>
      <ProfileTabsInner profile={profile} />
    </Suspense>
  )
}
