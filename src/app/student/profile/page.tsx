// src/app/student/profile/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { ProfileTabs } from '@/components/student/profile-tabs'
import type { StudentProfile } from '@/types/student'

const STATUS_BANNERS = {
  INVITED: {
    text: 'Complete your profile to get started.',
    className: 'bg-blue-50 border border-blue-200 text-blue-800',
  },
  PROFILE_COMPLETE: {
    text: 'Profile complete.',
    className: 'bg-green-50 border border-green-200 text-green-800',
  },
  ACTIVE: {
    text: 'Profile complete.',
    className: 'bg-green-50 border border-green-200 text-green-800',
  },
  INACTIVE: {
    text: 'Your account is inactive. Contact your coordinator.',
    className: 'bg-gray-50 border border-gray-200 text-gray-700',
  },
}

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = session.user as { id: string; role: string }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      nationality: true,
      iban: true,
      ibanHolderName: true,
      emergencyName: true,
      emergencyPhone: true,
      loonheffingskorting: true,
      status: true,
      user: {
        select: { email: true, name: true },
      },
    },
  })

  if (!student) redirect('/login')

  const profile = student as unknown as StudentProfile
  const banner = STATUS_BANNERS[profile.status]

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <StatusBadge status={profile.status} />
      </div>

      <div className={`rounded-lg px-4 py-3 text-sm ${banner.className}`}>
        {banner.text}
      </div>

      <Card>
        <ProfileTabs profile={profile} />
      </Card>
    </div>
  )
}
