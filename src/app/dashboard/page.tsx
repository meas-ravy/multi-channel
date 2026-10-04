import Link from "next/link";
import { connection } from "next/server";

import { getPrisma } from "@/lib/prisma";

import {
  createAutomation,
  toggleAutomation,
  updateAutomation,
} from "./actions";

const statusStyles = {
  RECEIVED: "bg-blue-50 text-blue-700 ring-blue-200",
  PROCESSING: "bg-amber-50 text-amber-700 ring-amber-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  IGNORED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Phnom_Penh",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function DashboardPage() {
  await connection();

  const prisma = getPrisma();
  const [pages, automations, eventGroups, recentEvents] = await Promise.all([
    prisma.facebookPage.findMany({
      select: {
        id: true,
        metaPageId: true,
        name: true,
        connectedAt: true,
        _count: { select: { automations: true } },
      },
      orderBy: { connectedAt: "desc" },
    }),
    prisma.automation.findMany({
      include: {
        facebookPage: { select: { name: true, metaPageId: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.webhookEvent.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.webhookEvent.findMany({
      take: 12,
      include: { facebookPage: { select: { name: true } } },
      orderBy: { receivedAt: "desc" },
    }),
  ]);

  const eventCounts = new Map(
    eventGroups.map((group) => [group.status, group._count._all]),
  );
  const activeAutomations = automations.filter((item) => item.isActive).length;
  const processedEvents = eventCounts.get("PROCESSED") ?? 0;
  const failedEvents = eventCounts.get("FAILED") ?? 0;

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              CA
            </div>
            <div>
              <p className="font-semibold tracking-tight">Chart Automation</p>
              <p className="text-xs text-zinc-500">Facebook control center</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Facebook automation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Connect Pages, manage keyword rules, and monitor webhook activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/flows"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Open flow builder
            </Link>
            <Link
              href="/facebook"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Connect Facebook account
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Connected Pages" value={pages.length} detail="Available to automate" />
          <StatCard label="Active rules" value={activeAutomations} detail={`${automations.length} total rules`} />
          <StatCard label="Processed events" value={processedEvents} detail="Replies successfully sent" />
          <StatCard label="Failed events" value={failedEvents} detail="Require attention" tone={failedEvents > 0 ? "danger" : "default"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="font-semibold">Automation rules</h2>
                <p className="mt-1 text-sm text-zinc-500">First matching rule by priority wins.</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {automations.length} rules
              </span>
            </div>

            {automations.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {automations.map((automation) => (
                  <details key={automation.id} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{automation.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${automation.trigger === "MESSAGE" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                            {automation.trigger === "MESSAGE" ? "Messenger" : "Comment"}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${automation.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                            {automation.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {automation.facebookPage.name} · “{automation.keyword}”
                        </p>
                      </div>
                      <span className="text-sm text-zinc-400 transition group-open:rotate-180">⌄</span>
                    </summary>

                    <div className="mt-5 grid gap-4 border-t border-zinc-100 pt-5">
                      <form action={updateAutomation.bind(null, automation.id)} className="grid gap-4 sm:grid-cols-2">
                        <Field label="Rule name">
                          <input name="name" defaultValue={automation.name} required maxLength={100} className="input" />
                        </Field>
                        <Field label="Trigger">
                          <select name="trigger" defaultValue={automation.trigger} className="input">
                            <option value="MESSAGE">Messenger message</option>
                            <option value="COMMENT">Facebook comment</option>
                          </select>
                        </Field>
                        <Field label="Keyword">
                          <input name="keyword" defaultValue={automation.keyword} required maxLength={100} className="input" />
                        </Field>
                        <Field label="Priority">
                          <input name="priority" type="number" min={-1000} max={1000} defaultValue={automation.priority} className="input" />
                        </Field>
                        <Field label="Reply message" wide>
                          <textarea name="replyText" defaultValue={automation.replyText} required maxLength={2000} rows={3} className="input min-h-24 py-2" />
                        </Field>
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <button className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">
                            Save changes
                          </button>
                        </div>
                      </form>
                      <form action={toggleAutomation.bind(null, automation.id)}>
                        <button className="rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                          {automation.isActive ? "Pause rule" : "Enable rule"}
                        </button>
                      </form>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState title="No automation rules" body="Create your first keyword rule using the form." />
            )}
          </div>

          <section className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Create a rule</h2>
            <p className="mt-1 text-sm text-zinc-500">Reply when an incoming event contains a keyword.</p>
            <form action={createAutomation} className="mt-5 space-y-4">
              <Field label="Facebook Page">
                <select name="facebookPageId" required disabled={pages.length === 0} className="input">
                  <option value="">Select a Page</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>{page.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Rule name">
                <input name="name" required maxLength={100} placeholder="Price question" className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Trigger">
                  <select name="trigger" className="input">
                    <option value="MESSAGE">Messenger</option>
                    <option value="COMMENT">Comment</option>
                  </select>
                </Field>
                <Field label="Priority">
                  <input name="priority" type="number" min={-1000} max={1000} defaultValue={0} className="input" />
                </Field>
              </div>
              <Field label="Keyword">
                <input name="keyword" required maxLength={100} placeholder="price" className="input" />
              </Field>
              <Field label="Reply message">
                <textarea name="replyText" required maxLength={2000} rows={4} placeholder="Thanks for asking..." className="input min-h-28 py-2" />
              </Field>
              <button disabled={pages.length === 0} className="h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300">
                Create automation
              </button>
              {pages.length === 0 ? (
                <p className="text-center text-xs text-zinc-500">Connect a Facebook Page before creating rules.</p>
              ) : null}
            </form>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="font-semibold">Connected Pages</h2>
              <p className="mt-1 text-sm text-zinc-500">Pages authorized through Meta OAuth.</p>
            </div>
            {pages.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {pages.map((page) => (
                  <div key={page.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">
                      {page.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{page.name}</p>
                      <p className="truncate text-xs text-zinc-500">ID {page.metaPageId}</p>
                    </div>
                    <span className="text-xs text-zinc-500">{page._count.automations} rules</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No Pages connected" body="Connect a Facebook Page to begin." />
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="font-semibold">Recent webhook activity</h2>
              <p className="mt-1 text-sm text-zinc-500">Latest Messenger and comment events.</p>
            </div>
            {recentEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-5 py-3">Event</th>
                      <th className="px-5 py-3">Page</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Received</th>
                      <th className="px-5 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="px-5 py-3.5 font-medium">{event.eventType === "MESSAGE" ? "Messenger" : "Comment"}</td>
                        <td className="px-5 py-3.5 text-zinc-600">{event.facebookPage?.name ?? event.metaPageId}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[event.status]}`}>{event.status.toLowerCase()}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-zinc-500">{dateFormatter.format(event.receivedAt)}</td>
                        <td className="max-w-64 truncate px-5 py-3.5 text-zinc-500">{event.error ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No webhook activity" body="Events will appear after Meta sends a message or comment webhook." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "danger";
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${tone === "danger" ? "text-red-600" : "text-zinc-950"}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </article>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{body}</p>
    </div>
  );
}
