import { cookies } from "next/headers";
import Link from "next/link";

import {
  getManagedPages,
  META_USER_TOKEN_COOKIE,
  type MetaPage,
} from "@/lib/meta/client";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/encryption";

const statusMessages: Record<string, string> = {
  authorization_denied: "Facebook authorization was cancelled.",
  connection_expired: "The Facebook connection expired. Please connect again.",
  connection_failed: "Facebook could not be connected. Check the server logs.",
  invalid_oauth_state: "The connection request expired. Please try again.",
  no_pages_available: "This Facebook account has no Pages available to connect.",
  no_pages_selected: "Select at least one Facebook Page.",
};

type PageChoice = MetaPage & {
  isConnected: boolean;
};

async function getPageChoices(): Promise<PageChoice[]> {
  const cookieStore = await cookies();
  const encryptedUserToken = cookieStore.get(META_USER_TOKEN_COOKIE)?.value;

  if (!encryptedUserToken) {
    return [];
  }

  const pages = await getManagedPages(decryptSecret(encryptedUserToken));
  const connectedPages = await getPrisma().facebookPage.findMany({
    where: { metaPageId: { in: pages.map((page) => page.id) } },
    select: { metaPageId: true },
  });
  const connectedPageIds = new Set(
    connectedPages.map((page) => page.metaPageId),
  );

  return pages.map((page) => ({
    ...page,
    isConnected: connectedPageIds.has(page.id),
  }));
}

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
  let pageChoices: PageChoice[] = [];
  let selectionError: string | undefined;

  if (status === "select_pages") {
    try {
      pageChoices = await getPageChoices();
      if (pageChoices.length === 0) {
        selectionError = statusMessages.no_pages_available;
      }
    } catch (error) {
      console.error("Unable to load Facebook Pages", error);
      selectionError = statusMessages.connection_failed;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-blue-600">Facebook setup</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          {status === "select_pages"
            ? "Choose Facebook Pages"
            : "Connect your Facebook account"}
        </h1>
        <p className="text-zinc-600">
          {status === "select_pages"
            ? "Select the Pages you want to use with chatbot automation."
            : "Authorize your Facebook account, then choose which managed Pages to connect."}
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

      {selectionError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          {selectionError}
        </p>
      ) : null}

      {status === "select_pages" && pageChoices.length > 0 ? (
        <form action="/api/meta/pages" method="post" className="space-y-4">
          <div className="space-y-3">
            {pageChoices.map((page) => (
              <label
                key={page.id}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <input
                  type="checkbox"
                  name="pageId"
                  value={page.id}
                  defaultChecked={!page.isConnected}
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-zinc-950">
                    {page.name}
                  </span>
                  <span className="block text-sm text-zinc-500">
                    Page ID: {page.id}
                  </span>
                </span>
                {page.isConnected ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Connected
                  </span>
                ) : null}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Connect selected Pages
          </button>
          <Link
            href="/facebook"
            className="ml-3 inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </form>
      ) : (
        <div>
          <Link
            href="/api/meta/connect"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Connect Facebook account
          </Link>
          <Link
            href="/dashboard"
            className="ml-3 inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>
      )}

      <p className="text-sm text-zinc-500">
        The Facebook account token is held only while you choose Pages. Selected
        Page access tokens are encrypted before storage.
      </p>
    </main>
  );
}
