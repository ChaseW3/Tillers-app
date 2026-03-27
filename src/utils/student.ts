type ProfileCompletionFields = {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  iban?: string | null
  ibanHolderName?: string | null
  emergencyName?: string | null
}

/**
 * Returns true when all fields required for PROFILE_COMPLETE status are
 * non-null, non-undefined, and non-empty (after trimming).
 */
export function isProfileComplete(fields: ProfileCompletionFields): boolean {
  return [
    fields.firstName,
    fields.lastName,
    fields.phone,
    fields.address,
    fields.city,
    fields.postalCode,
    fields.iban,
    fields.ibanHolderName,
    fields.emergencyName,
  ].every((f) => typeof f === 'string' && f.trim().length > 0)
}
