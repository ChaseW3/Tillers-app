import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/employers", label: "Employers" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/shifts", label: "Shifts" },
  { href: "/admin/payroll", label: "Payroll" },
  { href: "/admin/invoices", label: "Invoices" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <span className="font-bold text-lg text-gray-900">Tillers</span>
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">{session.user?.email}</p>
          <Link
            href="/api/auth/signout"
            className="text-xs text-red-500 hover:underline mt-1 block"
          >
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
