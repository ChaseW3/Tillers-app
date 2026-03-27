// src/app/admin/employers/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import type { EmployerStatus } from "@prisma/client";

const statusColors: Record<EmployerStatus, string> = {
  INVITED: "bg-yellow-100 text-yellow-700",
  PENDING_SIGNATURE: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export default async function AdminEmployersPage() {
  const employers = await prisma.employer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employers</h1>
        <Link
          href="/admin/employers/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          New Employer
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Markup</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employers.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{e.companyName}</p>
                  <p className="text-xs text-gray-400">{e.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {e.contactFirst} {e.contactLast}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${statusColors[e.status]}`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {e.markupRate.toString()}%
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {format(e.createdAt, "d MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/employers/${e.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employers.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-400">No employers yet.</p>
        )}
      </div>
    </div>
  );
}
