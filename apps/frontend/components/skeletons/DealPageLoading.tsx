import PreviousPageButton from "@/components/PreviousPageButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DealPageLoading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <PreviousPageButton />
      </div>
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Loading Deal...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please wait while we fetch the deal information.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

