import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { GetDealOpportunityById } from "@repo/db/queries";
import EditDealForm from "@/components/forms/edit-deal-form";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{ uid: string }>;

async function CachedEditContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`deal-${uid}`);
  cacheLife("hours");

  let opp = null;
  let error: Error | null = null;

  try {
    opp = await GetDealOpportunityById(uid);
  } catch (err) {
    console.error("Error fetching deal", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">Error loading deal</h1>
          <Button asChild>
            <Link href="/deals">Back to Deals</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!opp) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">Deal not found</h1>
          <Button asChild>
            <Link href="/deals">Back to Deals</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link href={`/deals/${uid}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Deal
          </Link>
        </Button>
        <h1 className="mt-4">Edit Deal</h1>
        <p className="text-muted-foreground">Update deal opportunity details.</p>
      </div>
      <EditDealForm opp={opp} />
    </section>
  );
}

function EditPageSkeleton() {
  return (
    <section className="big-container block-space min-h-screen">
      <Skeleton className="mb-6 h-9 w-32" />
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </section>
  );
}

async function AuthedEditContent(props: {
  params: Params;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [params, userSession] = await Promise.all([props.params, props.sessionPromise]);
  if (!userSession?.user) redirect("/auth/login");
  return <CachedEditContent uid={params.uid} />;
}

export default function EditDealPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<EditPageSkeleton />}>
      <AuthedEditContent params={props.params} sessionPromise={sessionPromise} />
    </Suspense>
  );
}
