import Link from "next/link";
import { NewEmployerForm } from "@/components/admin/employer-form";

export default function AdminNewEmployerPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/employers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Employers
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">New Employer</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewEmployerForm />
      </div>
    </div>
  );
}
