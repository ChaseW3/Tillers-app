// src/types/employer.ts
import type { EmployerStatus } from "@prisma/client";

export type EmployerWithEmail = {
  id: string;
  companyName: string;
  kvkNumber: string;
  vatNumber: string;
  billingAddress: string;
  city: string;
  postalCode: string;
  contactFirst: string;
  contactLast: string;
  phone: string;
  markupRate: string;        // Decimal serialized to string
  paymentTermDays: number;
  notes: string | null;
  status: EmployerStatus;
  createdAt: string;         // Date serialized to ISO string
  updatedAt: string;
  user: { email: string };
};
