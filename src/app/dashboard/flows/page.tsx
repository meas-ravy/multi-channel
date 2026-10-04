import Link from "next/link";

import FlowBuilder from "./FlowBuilder";

export default function FlowBuilderPage() {
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
      <FlowBuilder />
    </main>
  );
}
