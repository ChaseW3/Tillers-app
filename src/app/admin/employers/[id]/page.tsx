// src/app/admin/employers/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployerDetail } from "@/components/admin/employer-detail";
import type { EmployerWithEmail } from "@/types/employer";

export default async function AdminEmployerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const raw = await prisma.employer.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });

  if (!raw) notFound();

  // Serialize non-JSON-safe fields before passing to a client component
  const employer: EmployerWithEmail = {
    ...raw,
    markupRate: raw.markupRate.toString(),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/employers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Employers
        </Link>
      </div>
      <EmployerDetail employer={employer} />
    </div>
  );
}
