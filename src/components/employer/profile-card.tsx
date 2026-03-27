// src/components/employer/profile-card.tsx
type Field = { label: string; value: string };

function FieldRow({ label, value }: Field) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function ProfileCard({
  title,
  fields,
}: {
  title: string;
  fields: Field[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-700 mb-4">{title}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <FieldRow key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
    </div>
  );
}
