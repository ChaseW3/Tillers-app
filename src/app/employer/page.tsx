// src/app/employer/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";

const shiftStatusColors: Record<string, string> = {
  PENDING_ACCEPTANCE: "bg-yellow-50 text-yellow-700",
  ACCEPTED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  PAID: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-50 text-gray-500",
};

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
    },
  });

  if (!employer) {
    return <div className="p-8">Employer profile not found. Contact admin.</div>;
  }

  const recentShifts = await prisma.shift.findMany({
    where: { job: { employerId: employer.id } },
    orderBy: { scheduledStart: "desc" },
    take: 5,
    include: {
      job: { select: { title: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const activeJobCount = await prisma.job.count({
    where: {
      employerId: employer.id,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {employer.companyName}
      </h1>
      <p className="text-gray-500 mb-8">
        {activeJobCount} active job{activeJobCount !== 1 ? "s" : ""}
      </p>

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
                    {format(job.startDate, "d MMM")} –{" "}
                    {format(job.endDate, "d MMM yyyy")}
                  </p>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent shifts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Recent Shifts</h2>
          {recentShifts.length === 0 ? (
            <p className="text-sm text-gray-400">No shifts yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentShifts.map((shift) => (
                <li key={shift.id} className="text-sm border-l-4 border-blue-300 pl-3">
                  <p className="font-medium">
                    {shift.student.firstName} {shift.student.lastName}
                  </p>
                  <p className="text-gray-500">{shift.job.title}</p>
                  <p className="text-gray-400">
                    {format(shift.scheduledStart, "EEE d MMM, HH:mm")}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      shiftStatusColors[shift.status] ?? "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {shift.status}
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
