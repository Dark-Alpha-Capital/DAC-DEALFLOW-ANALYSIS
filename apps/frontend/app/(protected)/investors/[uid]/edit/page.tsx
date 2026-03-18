import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { GetInvestorById } from "@repo/db/queries";
import EditInvestorForm from "@/components/forms/edit-investor-form";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{ uid: string }>;

async function CachedEditContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`investor-${uid}`);
  cacheLife("hours");

  let investor = null;
  let error: Error | null = null;

  try {
    investor = await GetInvestorById(uid);
  } catch (err) {
    console.error("Error fetching investor", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading investor
          </h1>
          <Button asChild>
            <Link href="/investors">Back to Investors</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!investor) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Investor not found
          </h1>
          <Button asChild>
            <Link href="/investors">Back to Investors</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link href={`/investors/${uid}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Investor
          </Link>
        </Button>
        <h1 className="mt-4">Edit Investor</h1>
        <p className="text-muted-foreground">Update investor details.</p>
      </div>
      <EditInvestorForm investor={investor} />
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
  const [params, userSession] = await Promise.all([
    props.params,
    props.sessionPromise,
  ]);
  if (!userSession?.user) redirect("/auth/login");
  return <CachedEditContent uid={params.uid} />;
}

export default function EditInvestorPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<EditPageSkeleton />}>
      <AuthedEditContent params={props.params} sessionPromise={sessionPromise} />
    </Suspense>
  );
}
