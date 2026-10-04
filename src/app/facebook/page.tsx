import Link from "next/link";

const statusMessages: Record<string, string> = {
  authorization_denied: "Facebook authorization was cancelled.",
  connection_failed: "Facebook could not be connected. Check the server logs.",
  invalid_oauth_state: "The connection request expired. Please try again.",
  no_pages_selected: "No Facebook Pages were granted to this application.",
};

type FacebookPageProps = {
  searchParams: Promise<{
    status?: string;
    detail?: string;
  }>;
};

export default async function FacebookPage({
  searchParams,
}: FacebookPageProps) {
  const { status, detail } = await searchParams;
  const connectedCount = status === "connected" ? Number(detail) : 0;
  const errorMessage = detail ? statusMessages[detail] : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-blue-600">Facebook setup</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Connect your Facebook Page
        </h1>
        <p className="text-zinc-600">
          Authorize the Pages this application may manage. Page access tokens
          are encrypted before they are stored.
        </p>
      </div>

      {connectedCount > 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          Connected {connectedCount} Facebook {connectedCount === 1 ? "Page" : "Pages"}.
        </p>
      ) : null}

      {status === "error" ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          {errorMessage ?? "Facebook could not be connected."}
        </p>
      ) : null}

      <div>
        <Link
          href="/api/meta/connect"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Connect Facebook
        </Link>
        <Link
          href="/dashboard"
          className="ml-3 inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Back to dashboard
        </Link>
      </div>

      <p className="text-sm text-zinc-500">
        This internal MVP does not include user authentication yet. Add
        authentication before making this setup page publicly accessible.
      </p>
    </main>
  );
}
