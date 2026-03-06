import PreviousPageButton from "@/components/PreviousPageButton";

export default function DealPageLoading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <PreviousPageButton />
      </div>
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow">
          <div className="flex flex-col space-y-1.5">
            <h2 className="text-2xl font-bold">Loading Deal...</h2>
          </div>
          <div className="pt-0">
            <p className="text-muted-foreground">
              Please wait while we fetch the deal information.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

