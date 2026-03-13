export default function AdminEventsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 sm:py-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Barangay Events</h1>
          <p className="text-sm text-slate-600">
            Admin management for barangay events will be implemented here.
          </p>
        </div>
      </header>

      <section className="rounded-lg border bg-white p-4 text-sm shadow-sm">
        <p>
          This is a placeholder page for <code>/admin/events</code>. You can
          extend this page to create, edit, and delete events for Brgy.
          Pagatpatan, which will be shown to residents on the Events page.
        </p>
      </section>
    </div>
  );
}

