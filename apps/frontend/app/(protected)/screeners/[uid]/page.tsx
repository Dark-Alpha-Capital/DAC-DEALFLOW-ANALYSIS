import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { getScreenerWithQuestions } from "@repo/db/queries";
import ScreenerEditor from "./screener-editor";
import ScreenerPageSkeleton from "@/components/skeletons/screener-page-skeleton";

export const metadata: Metadata = {
  title: "Screener Template",
  description: "Manage structured screener questions",
};

type Params = Promise<{ uid: string }>;

async function CachedScreenerContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`screener-${uid}`);
  cacheLife("hours");

  const screener = await getScreenerWithQuestions(uid);
  if (!screener) {
    notFound();
  }

  return <ScreenerEditor screenerId={uid} initialScreener={screener} />;
}

async function AuthedScreenerContent(props: {
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
  return <CachedScreenerContent uid={params.uid} />;
}

export default function ScreenerDetailPage(props: { params: Params }) {
  const sessionPromise = getSession();

  return (
    <section className="block-space big-container">
      <Suspense fallback={<ScreenerPageSkeleton />}>
        <AuthedScreenerContent
          params={props.params}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
}
