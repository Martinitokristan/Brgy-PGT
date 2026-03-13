export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 sm:py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">
          Welcome to the Barangay Portal
        </h1>
        <p className="text-balance text-sm text-slate-600 sm:text-base">
          The Next.js + Supabase + Tailwind rebuild is being wired up. The next
          step is to connect authentication, registration, posts, notifications,
          and the admin dashboard as described in your Laravel app.
        </p>
      </div>
    </div>
  );
}
