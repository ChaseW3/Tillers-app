import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function EmployerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;
  const employer = await prisma.employer.findUnique({
    where: { userId },
    include: {
      jobs: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { startDate: "asc" },
        take: 5,
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!employer) {
    return <div className="p-8">Employer profile not found. Contact admin.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{employer.companyName}</h1>
      <p className="text-gray-500 mb-8">Your active jobs and recent invoices.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Active Jobs</h2>
          {employer.jobs.length === 0 ? (
            <p className="text-sm text-gray-400">No active jobs.</p>
          ) : (
            <ul className="space-y-3">
              {employer.jobs.map((job) => (
                <li key={job.id} className="text-sm border-l-4 border-green-400 pl-3">
                  <p className="font-medium">{job.title}</p>
                  <p className="text-gray-400">
                    {format(job.startDate, "d MMM")} – {format(job.endDate, "d MMM yyyy")}
                  </p>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent invoices */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Recent Invoices</h2>
          {employer.invoices.length === 0 ? (
            <p className="text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <ul className="space-y-3">
              {employer.invoices.map((inv) => (
                <li key={inv.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">#{inv.invoiceNumber}</span>
                  <span className="font-medium">€{inv.total.toString()}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      inv.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : inv.status === "OVERDUE"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
