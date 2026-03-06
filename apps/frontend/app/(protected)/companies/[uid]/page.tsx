import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { GetCompanyWithAllRelations } from "db/queries";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyTabs } from "@/components/company-detail/CompanyTabs";

type Params = Promise<{ uid: string }>;

async function CachedCompanyContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`company-${uid}`);
  cacheLife("hours");

  let companyData: Awaited<
    ReturnType<typeof GetCompanyWithAllRelations>
  > | null = null;
  let error: Error | null = null;

  try {
    companyData = await GetCompanyWithAllRelations(uid);
  } catch (err) {
    console.error("Error fetching company", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading company
          </h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the company. Please try again later.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-muted-foreground text-xs">{error.message}</p>
          )}
          <Button asChild>
            <Link href="/companies">Back to Companies</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!companyData || !companyData.company) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Company not found
          </h1>
          <p className="text-muted-foreground text-sm">
            The company you are looking for does not exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/companies">Back to Companies</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { company, dealOpportunities, documents, contacts } = companyData;

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Link>
        </Button>

        <CompanyTabs
          company={company}
          dealOpportunities={dealOpportunities}
          documents={documents}
          contacts={contacts}
        />

        <p className="text-muted-foreground text-xs">
          Added {new Date(company.createdAt).toLocaleDateString()}
        </p>
      </div>
    </section>
  );
}

function CompanyPageSkeleton() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="mb-6 h-9 w-32" />
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    </section>
  );
}

async function AuthedCompanyContent(props: {
  params: Params;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [params, userSession] = await Promise.all([
    props.params,
    props.sessionPromise,
  ]);
  if (!userSession?.user) {
    redirect("/auth/login");
  }
  return <CachedCompanyContent uid={params.uid} />;
}

export default function CompanyDetailPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<CompanyPageSkeleton />}>
      <AuthedCompanyContent
        params={props.params}
        sessionPromise={sessionPromise}
      />
    </Suspense>
  );
}
