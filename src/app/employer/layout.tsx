import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">Tillers</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                Employer
              </span>
            </div>
            <nav className="flex gap-4">
              <Link
                href="/employer"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/employer/profile"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{session.user?.email}</span>
            <Link
              href="/api/auth/signout"
              className="text-xs text-red-500 hover:underline"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
