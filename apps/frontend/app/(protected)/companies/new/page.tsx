import { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CreateNewCompanyForm from "@/components/forms/new-company-form";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import NewCompanyLoadingSkeleton from "./loading";

export const metadata: Metadata = {
  title: "Add New Company - Due Diligence",
  description: "Add a new company for due diligence",
};

const NewCompanyPage = async () => {
  return (
    <section className="big-container block-space-mini group min-h-screen">
      <Suspense fallback={<NewCompanyLoadingSkeleton />}>
        <ShowNewCompanyComponent />
      </Suspense>
    </section>
  );
};

export default NewCompanyPage;

async function ShowNewCompanyComponent() {
  const userSession = await getSession();
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return (
    <>
      <div className="mb-8">
        <Button variant="ghost" asChild size="sm" className="-ml-2 mb-6">
          <Link href="/companies">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>

        <div className="border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add New Company
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new company profile for due diligence
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <CreateNewCompanyForm />
      </div>
    </>
  );
}
