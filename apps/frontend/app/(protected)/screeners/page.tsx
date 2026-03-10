import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { getAllScreeners } from "@repo/db/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AddScreenerDialog from "@/components/Dialogs/create-screener-dialog";
import DeleteScreenerButton from "./delete-screener-button";

export const metadata: Metadata = {
  title: "Screeners",
  description: "Manage structured screener templates and questions",
};

export default function ScreenersPage() {
  const sessionPromise = getSession();

  return (
    <section className="block-space-mini container">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Screeners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage structured screener templates and weighted questions.
          </p>
        </div>
        <AddScreenerDialog />
      </div>

      <Suspense fallback={<ScreenersSkeleton />}>
        <AuthedScreeners sessionPromise={sessionPromise} />
      </Suspense>
    </section>
  );
}

async function AuthedScreeners({
  sessionPromise,
}: {
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const session = await sessionPromise;
  if (!session?.user) {
    redirect("/auth/login");
  }

  return <ScreenersContent />;
}

async function ScreenersContent() {
  "use cache";
  cacheTag("screeners");
  cacheLife("hours");

  const screeners = (await getAllScreeners()) ?? [];
  const totalQuestions = screeners.reduce(
    (sum, screener) => sum + (screener.questionCount ?? 0),
    0,
  );
  const totalWeight = screeners.reduce(
    (sum, screener) => sum + (screener.totalWeight ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatBlock label="Templates" value={screeners.length} />
        <StatBlock label="Questions" value={totalQuestions} />
        <StatBlock label="Total Weight" value={totalWeight} />
      </div>

      {screeners.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">No screeners yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a template to start defining structured screening questions.
          </p>
          <div className="mt-6 flex justify-center">
            <AddScreenerDialog />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_120px_120px_140px_auto] gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Template</span>
            <span>Category</span>
            <span>Questions</span>
            <span>Weight</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y">
            {screeners.map((screener) => (
              <div
                key={screener.id}
                className="flex flex-col gap-4 px-5 py-5 lg:grid lg:grid-cols-[minmax(0,2fr)_1fr_120px_120px_140px_auto] lg:items-center lg:gap-4 lg:px-6"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {screener.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {screener.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 lg:block">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
                    Category
                  </span>
                  <Badge variant="secondary">{screener.category}</Badge>
                </div>

                <InlineMeta
                  label="Questions"
                  value={String(screener.questionCount ?? 0)}
                />
                <InlineMeta
                  label="Weight"
                  value={String(screener.totalWeight ?? 0)}
                />
                <InlineMeta
                  label="Updated"
                  value={new Date(screener.updatedAt).toLocaleDateString()}
                />

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/screeners/${screener.id}`}>Manage</Link>
                  </Button>
                  <DeleteScreenerButton screenerId={screener.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-4 py-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ScreenersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden h-12 border-b bg-muted/40 lg:block" />
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 px-5 py-5 lg:px-6">
              <div className="h-5 w-48 animate-pulse rounded bg-muted/50" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
