import { redirect } from "next/navigation";

import { hasAdminSession } from "@/lib/admin-session";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await hasAdminSession()) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-12 text-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
          CA
        </div>
        <p className="text-sm font-semibold text-blue-600">Internal dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Enter the admin key from your environment configuration. The key is
          checked only on the server and is never stored in browser JavaScript.
        </p>

        {error === "invalid" ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            The admin key is incorrect or not configured.
          </p>
        ) : null}

        <form action="/api/admin/session" method="post" className="mt-7 space-y-4">
          <div>
            <label htmlFor="key" className="text-sm font-medium text-zinc-800">
              Admin API key
            </label>
            <input
              id="key"
              name="key"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Enter ADMIN_API_KEY"
            />
          </div>
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Open dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
