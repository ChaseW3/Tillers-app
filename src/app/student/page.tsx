import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as typeof session.user & { id: string }).id;
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      shifts: {
        where: {
          scheduledStart: { gte: new Date() },
        },
        orderBy: { scheduledStart: "asc" },
        take: 5,
        include: { job: { include: { employer: true } } },
      },
      payslips: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!student) {
    return <div className="p-8">Student profile not found. Contact admin.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome, {student.firstName}
      </h1>
      <p className="text-gray-500 mb-8">Here&apos;s your upcoming schedule and recent payslips.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming shifts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Upcoming Shifts</h2>
          {student.shifts.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming shifts.</p>
          ) : (
            <ul className="space-y-3">
              {student.shifts.map((shift) => (
                <li key={shift.id} className="text-sm border-l-4 border-blue-400 pl-3">
                  <p className="font-medium">{shift.job.title}</p>
                  <p className="text-gray-500">{shift.job.employer.companyName}</p>
                  <p className="text-gray-400">
                    {format(shift.scheduledStart, "EEE d MMM, HH:mm")} –{" "}
                    {format(shift.scheduledEnd, "HH:mm")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent payslips */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Recent Payslips</h2>
          {student.payslips.length === 0 ? (
            <p className="text-sm text-gray-400">No payslips yet.</p>
          ) : (
            <ul className="space-y-3">
              {student.payslips.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {format(p.periodStart, "d MMM")} – {format(p.periodEnd, "d MMM yyyy")}
                  </span>
                  <span className="font-medium">€{p.netAmount.toString()}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      p.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {p.status}
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
