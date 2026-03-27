"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  step,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  step?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {!required && (
          <span className="ml-1 text-xs text-gray-400">(optional)</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        minLength={minLength}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function NewEmployerForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = new FormData(e.currentTarget);

    const body = {
      email: data.get("email") as string,
      password: data.get("password") as string,
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
      notes: (data.get("notes") as string) || undefined,
    };

    try {
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(
          typeof json.error === "string" ? json.error : "Something went wrong"
        );
        setLoading(false);
        return;
      }

      const employer = await res.json();
      router.push(`/admin/employers/${employer.id}`);
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" />
          <Field label="Password" name="password" type="password" minLength={8} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Company
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Company Name" name="companyName" />
          </div>
          <Field label="KVK Number" name="kvkNumber" />
          <Field label="VAT Number" name="vatNumber" />
          <div className="md:col-span-2">
            <Field label="Billing Address" name="billingAddress" />
          </div>
          <Field label="City" name="city" />
          <Field label="Postal Code" name="postalCode" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" name="contactFirst" />
          <Field label="Last Name" name="contactLast" />
          <Field label="Phone" name="phone" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Commercial
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Markup Rate (%)"
            name="markupRate"
            type="number"
            step="0.01"
          />
          <Field
            label="Payment Term (days)"
            name="paymentTermDays"
            type="number"
            defaultValue={14}
          />
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Employer"}
        </button>
      </div>
    </form>
  );
}
