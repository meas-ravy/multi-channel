import Link from "next/link";
import { connection } from "next/server";

import { parseFlowDocument } from "@/lib/automation/flow-types";
import { getPrisma } from "@/lib/prisma";

import FlowBuilder from "./FlowBuilder";

export default async function FlowBuilderPage() {
  await connection();
  const pages = await getPrisma().facebookPage.findMany({
    select: {
      id: true,
      name: true,
      messengerFlow: {
        select: { draft: true, publishedAt: true },
      },
    },
    orderBy: { connectedAt: "desc" },
  });
  const initialPages = pages.map((page) => ({
    id: page.id,
    name: page.name,
    draft: parseFlowDocument(page.messengerFlow?.draft) ?? undefined,
    publishedAt: page.messengerFlow?.publishedAt?.toISOString() ?? null,
  }));

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-medium text-blue-600">Bot automation</p>
            <h1 className="text-xl font-semibold tracking-tight">Flow builder</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>
      </header>
      <FlowBuilder pages={initialPages} />
    </main>
  );
}
