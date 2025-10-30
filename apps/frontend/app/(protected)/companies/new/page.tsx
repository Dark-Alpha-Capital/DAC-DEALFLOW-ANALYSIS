import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CreateNewCompanyForm from "@/components/forms/new-company-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Add New Company - Due Diligence",
  description: "Add a new company for due diligence",
};

export default async function NewCompanyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/companies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </Button>
        <h1>Add New Company</h1>
        <p>Create a new company profile for due diligence</p>
      </div>

      <div className="max-w-4xl">
        <CreateNewCompanyForm />
      </div>
    </section>
  );
}
