import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllThemes } from "@repo/db/queries";
import ThemeContainer from "@/components/ThemeContainer";
import ThemesAuthedSkeleton from "@/components/skeletons/ThemesAuthedSkeleton";
import ThemeCardGridSkeleton from "@/components/skeletons/ThemeCardGridSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Themes",
  description: "View all themes",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(typeof value === "string" ? value : value?.[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ThemesPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Themes</h1>
        <Button asChild size="sm">
          <Link href="/themes/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Theme
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ThemesAuthedSkeleton />}>
        <AuthedThemes
          searchParams={props.searchParams}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
};

export default ThemesPage;

async function AuthedThemes(props: {
  searchParams: SearchParams;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [resolvedSearchParams, userSession] = await Promise.all([
    props.searchParams,
    props.sessionPromise,
  ]);
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return (
    <Suspense fallback={<ThemeCardGridSkeleton />}>
      <ShowThemesComponent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

async function ShowThemesComponent(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 50));
  const offset = (currentPage - 1) * limit;

  return (
    <FetchAndDisplayThemes
      offset={offset}
      limit={limit}
      currentPage={currentPage}
    />
  );
}

async function FetchAndDisplayThemes({
  offset,
  limit,
  currentPage,
}: {
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";
  cacheTag("themes");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllThemes({
    offset,
    limit,
  });

  return (
    <ThemeContainer
      data={data}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
