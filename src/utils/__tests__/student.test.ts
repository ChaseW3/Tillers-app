import { describe, it, expect } from 'vitest'
import { isProfileComplete } from '../student'

const complete = {
  firstName: 'Jan',
  lastName: 'De Vries',
  phone: '+31612345678',
  address: 'Hoofdstraat 1',
  city: 'Amsterdam',
  postalCode: '1011 AB',
  iban: 'NL91ABNA0417164300',
  ibanHolderName: 'J. de Vries',
  emergencyName: 'Piet de Vries',
}

describe('isProfileComplete', () => {
  it('returns true when all required fields are present and non-empty', () => {
    expect(isProfileComplete(complete)).toBe(true)
  })

  it('returns false when firstName is null', () => {
    expect(isProfileComplete({ ...complete, firstName: null })).toBe(false)
  })

  it('returns false when iban is undefined', () => {
    expect(isProfileComplete({ ...complete, iban: undefined })).toBe(false)
  })

  it('returns false when emergencyName is an empty string', () => {
    expect(isProfileComplete({ ...complete, emergencyName: '' })).toBe(false)
  })

  it('returns false when phone is whitespace only', () => {
    expect(isProfileComplete({ ...complete, phone: '   ' })).toBe(false)
  })

  it('returns false when fields object is empty', () => {
    expect(isProfileComplete({})).toBe(false)
  })
})
