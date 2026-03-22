'use client';

export function FilterDropdown({
  label,
  name,
  value,
  options,
  baseUrl,
  currentParams,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  baseUrl: string;
  currentParams: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1">
        {label}
      </label>
      <select
        className="block w-full rounded-md border-zinc-700 bg-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
        defaultValue={value}
        onChange={(e) => {
          const params = new URLSearchParams(currentParams);
          if (e.target.value) {
            params.set(name, e.target.value);
          } else {
            params.delete(name);
          }
          params.delete('page');
          window.location.href = `${baseUrl}?${params.toString()}`;
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
