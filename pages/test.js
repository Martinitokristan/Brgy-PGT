import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Test() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.from("users").select("*").limit(20);

    if (error) {
      console.error(error);
      setError("Failed to load users from Supabase.");
    } else {
      setUsers(data ?? []);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-4 py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold sm:text-2xl">
              Supabase Users Test
            </h1>
            <p className="text-xs text-slate-600 sm:text-sm">
              Simple responsive list pulling from your `users` table.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
          >
            Refresh
          </button>
        </header>

        <section className="rounded-lg border bg-white p-3 shadow-sm sm:p-4">
          {loading && (
            <p className="text-sm text-slate-600">Loading users from Supabase…</p>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && users.length === 0 && (
            <p className="text-sm text-slate-500">
              No users found. Create some users in Supabase to see them here.
            </p>
          )}

          <ul className="mt-2 space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user.name || user.full_name || "Unnamed user"}
                  </span>
                  {user.email && (
                    <span className="text-xs text-slate-600">{user.email}</span>
                  )}
                </div>
                {user.role && (
                  <span className="mt-1 inline-flex w-fit rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 sm:mt-0">
                    {user.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}