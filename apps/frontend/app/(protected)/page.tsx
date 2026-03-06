import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";

const Home = async () => {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-foreground mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Dark Alpha Capital
              <span className="text-muted-foreground mt-2 block">
                Deal Origination
              </span>
            </h1>
            <p className="text-muted-foreground mb-10 text-xl">
              Streamline your deal flow management with AI-powered insights and
              efficient processes.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                className="focus:ring-ring focus:ring-opacity-75 transform rounded-full px-8 py-6 font-semibold shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:ring-2 focus:outline-none"
                asChild
              >
                <Link href="/raw-deals">
                  Explore Raw Deals
                  <Search className="ml-2 inline-block h-5 w-5" />
                </Link>
              </Button>
              <Button
                className="focus:ring-ring focus:ring-opacity-75 transform rounded-full px-8 py-6 font-semibold shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:ring-2 focus:outline-none"
                variant="secondary"
                asChild
              >
                <Link href="/import">
                  Add New Deal
                  <ArrowRight className="ml-2 inline-block h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
