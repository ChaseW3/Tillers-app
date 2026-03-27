// src/components/admin/employer-detail.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmployerWithEmail } from "@/types/employer";
import type { EmployerStatus } from "@prisma/client";

const statusColors: Record<EmployerStatus, string> = {
  INVITED: "bg-yellow-100 text-yellow-700",
  PENDING_SIGNATURE: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

function ReadField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

function EditField({
  label,
  name,
  defaultValue,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  defaultValue: string | number | null;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function EmployerDetail({ employer: initial }: { employer: EmployerWithEmail }) {
  const router = useRouter();
  const [employer, setEmployer] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData(e.currentTarget);

    const body = {
      companyName: data.get("companyName") as string,
      kvkNumber: data.get("kvkNumber") as string,
      vatNumber: data.get("vatNumber") as string,
      billingAddress: data.get("billingAddress") as string,
      city: data.get("city") as string,
      postalCode: data.get("postalCode") as string,
      contactFirst: data.get("contactFirst") as string,
      contactLast: data.get("contactLast") as string,
      phone: data.get("phone") as string,
      markupRate: Number(data.get("markupRate")),
      paymentTermDays: Number(data.get("paymentTermDays")),
      notes: (data.get("notes") as string) || null,
    };

    try {
      const res = await fetch(`/api/admin/employers/${employer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(
          typeof json.error === "string" ? json.error : "Something went wrong"
        );
        return;
      }

      const updated = await res.json();
      setEmployer({
        id: updated.id,
        companyName: updated.companyName,
        kvkNumber: updated.kvkNumber,
        vatNumber: updated.vatNumber,
        billingAddress: updated.billingAddress,
        city: updated.city,
        postalCode: updated.postalCode,
        contactFirst: updated.contactFirst,
        contactLast: updated.contactLast,
        phone: updated.phone,
        markupRate: updated.markupRate.toString(),
        paymentTermDays: updated.paymentTermDays,
        notes: updated.notes,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        user: updated.user,
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle() {
    setError("");
    setToggling(true);
    const newStatus: EmployerStatus =
      employer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await fetch(`/api/admin/employers/${employer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setError("Failed to update status");
        return;
      }

      const updated = await res.json();
      setEmployer((prev) => ({ ...prev, status: updated.status }));
      router.refresh();
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {employer.companyName}
          </h1>
          <span
            className={`text-xs px-2 py-0.5 rounded ${statusColors[employer.status]}`}
          >
            {employer.status}
          </span>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleStatusToggle}
            disabled={toggling}
            className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${
              employer.status === "ACTIVE"
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {toggling
              ? "Saving..."
              : employer.status === "ACTIVE"
              ? "Deactivate"
              : "Activate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Company
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <EditField
                  label="Company Name"
                  name="companyName"
                  defaultValue={employer.companyName}
                />
              </div>
              <EditField label="KVK Number" name="kvkNumber" defaultValue={employer.kvkNumber} />
              <EditField label="VAT Number" name="vatNumber" defaultValue={employer.vatNumber} />
              <div className="md:col-span-2">
                <EditField
                  label="Billing Address"
                  name="billingAddress"
                  defaultValue={employer.billingAddress}
                />
              </div>
              <EditField label="City" name="city" defaultValue={employer.city} />
              <EditField label="Postal Code" name="postalCode" defaultValue={employer.postalCode} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditField label="First Name" name="contactFirst" defaultValue={employer.contactFirst} />
              <EditField label="Last Name" name="contactLast" defaultValue={employer.contactLast} />
              <EditField label="Phone" name="phone" defaultValue={employer.phone} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Commercial
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditField
                label="Markup Rate (%)"
                name="markupRate"
                type="number"
                step="0.01"
                defaultValue={employer.markupRate}
              />
              <EditField
                label="Payment Term (days)"
                name="paymentTermDays"
                type="number"
                defaultValue={employer.paymentTermDays}
              />
              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={employer.notes ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Company
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="Company Name" value={employer.companyName} />
              <ReadField label="Email" value={employer.user.email} />
              <ReadField label="KVK Number" value={employer.kvkNumber} />
              <ReadField label="VAT Number" value={employer.vatNumber} />
              <ReadField label="Billing Address" value={employer.billingAddress} />
              <ReadField label="City" value={employer.city} />
              <ReadField label="Postal Code" value={employer.postalCode} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Contact
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="First Name" value={employer.contactFirst} />
              <ReadField label="Last Name" value={employer.contactLast} />
              <ReadField label="Phone" value={employer.phone} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Commercial
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadField label="Markup Rate" value={`${employer.markupRate}%`} />
              <ReadField
                label="Payment Term"
                value={`${employer.paymentTermDays} days`}
              />
              <div className="sm:col-span-2">
                <ReadField label="Notes" value={employer.notes} />
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
