import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  const [studentCount, employerCount, openJobs, pendingPayslips] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.employer.count(),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.payslip.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Active Students" value={studentCount} color="blue" />
        <StatCard label="Employers" value={employerCount} color="green" />
        <StatCard label="Open Jobs" value={openJobs} color="yellow" />
        <StatCard label="Pending Payslips" value={pendingPayslips} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickLinks
          title="Manage"
          links={[
            { href: "/admin/students", label: "Students" },
            { href: "/admin/employers", label: "Employers" },
            { href: "/admin/jobs", label: "Jobs" },
            { href: "/admin/shifts", label: "Shifts" },
          ]}
        />
        <QuickLinks
          title="Finance"
          links={[
            { href: "/admin/payroll", label: "Payroll" },
            { href: "/admin/invoices", label: "Invoices" },
          ]}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-xl p-6 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function QuickLinks({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-700 mb-3">{title}</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-blue-600 hover:underline text-sm"
            >
              {link.label} →
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
