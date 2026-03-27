// src/app/employer/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileCard } from "@/components/employer/profile-card";

const statusColors = {
  INVITED: "bg-yellow-100 text-yellow-700",
  PENDING_SIGNATURE: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
} as const;

export default async function EmployerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;

  const employer = await prisma.employer.findUnique({
    where: { userId },
    select: {
      companyName: true,
      kvkNumber: true,
      vatNumber: true,
      billingAddress: true,
      city: true,
      postalCode: true,
      contactFirst: true,
      contactLast: true,
      phone: true,
      status: true,
    },
  });

  if (!employer) {
    return <div className="p-8">Profile not found. Contact admin.</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{employer.companyName}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded ${statusColors[employer.status]}`}
        >
          {employer.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfileCard
          title="Company"
          fields={[
            { label: "KVK Number", value: employer.kvkNumber },
            { label: "VAT Number", value: employer.vatNumber },
            { label: "Billing Address", value: employer.billingAddress },
            { label: "City", value: employer.city },
            { label: "Postal Code", value: employer.postalCode },
          ]}
        />
        <ProfileCard
          title="Contact"
          fields={[
            {
              label: "Name",
              value: `${employer.contactFirst} ${employer.contactLast}`,
            },
            { label: "Phone", value: employer.phone },
          ]}
        />
      </div>
    </div>
  );
}
