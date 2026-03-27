import type { StudentStatus } from '@prisma/client'

export type { StudentStatus }

/** Safe student fields returned to the student themselves. Never includes
 *  bsnEncrypted, hourlyRate, or nmbrsEmployeeId. */
export type StudentProfile = {
  id: string
  firstName: string | null
  lastName: string | null
  dateOfBirth: Date | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  nationality: string
  iban: string | null
  ibanHolderName: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  loonheffingskorting: boolean
  status: StudentStatus
  user: {
    email: string
    name: string | null
  }
}

/** Row shape used in the admin student list table. */
export type AdminStudentRow = {
  id: string
  firstName: string | null
  lastName: string | null
  status: StudentStatus
  phone: string | null
  createdAt: Date
}

/** Full student shape returned to admin. Includes decrypted BSN as `bsn`
 *  and hourlyRate (reserved for job/contract module — not displayed here). */
export type AdminStudentDetail = {
  id: string
  firstName: string | null
  lastName: string | null
  dateOfBirth: Date | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  nationality: string
  /** Decrypted BSN — only present in admin GET /api/admin/students/[id] */
  bsn: string | null
  iban: string | null
  ibanHolderName: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  loonheffingskorting: boolean
  status: StudentStatus
  university: string | null
  studyProgram: string | null
  graduationYear: number | null
  /** Reserved for job/contract module. Do not display in student profiles UI. */
  hourlyRate: string | null
  createdAt: Date
  user: {
    email: string
    name: string | null
  }
}
