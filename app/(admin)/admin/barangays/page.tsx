export default function AdminBarangaysPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 sm:py-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Barangays</h1>
          <p className="text-sm text-slate-600">
            Admin management for barangays will be implemented here. Currently
            this app is configured for a single barangay (Brgy. Pagatpatan).
          </p>
        </div>
      </header>

      <section className="rounded-lg border bg-white p-4 text-sm shadow-sm">
        <p>
          This is a placeholder page for <code>/admin/barangays</code>. In the
          future, you can extend this page to edit barangay details or manage
          multiple barangays if needed.
        </p>
      </section>
    </div>
  );
}

