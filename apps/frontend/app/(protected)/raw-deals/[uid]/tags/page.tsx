import { Suspense } from "react";
import db, { deals, eq } from "db";
import { Metadata } from "next";
import AddTagsForm from "./add-tags-form";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import PreviousPageButton from "@/components/PreviousPageButton";
import { cacheLife, cacheTag } from "next/cache";
import TagsLoadingSkeleton from "./loading";

type Params = Promise<{ uid: string }>;

export async function generateMetadata(props: {
  params: Params;
}): Promise<Metadata> {
  const { uid } = await props.params;

  try {
    const [fetchedDeal] = await db
      .select({ dealCaption: deals.dealCaption })
      .from(deals)
      .where(eq(deals.id, uid))
      .limit(1);

    return {
      title: fetchedDeal?.dealCaption || "Raw Deal Page",
      description: fetchedDeal?.dealCaption || "Raw Deal Page",
    };
  } catch (error) {
    return {
      title: "Not Found",
      description: "The page you are looking for does not exist",
    };
  }
}

const AddTagsPage = async ({ params }: { params: Params }) => {
  const { uid } = await params;

  return (
    <div className="block-space big-container group">
      <Suspense fallback={<TagsLoadingSkeleton />}>
        <ShowTagsComponent dealUid={uid} />
      </Suspense>
    </div>
  );
};

export default AddTagsPage;

async function ShowTagsComponent({ dealUid }: { dealUid: string }) {
  const userSession = await getSession();

  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return <FetchAndDisplayTagsData dealUid={dealUid} />;
}

async function FetchAndDisplayTagsData({ dealUid }: { dealUid: string }) {
  "use cache";
  cacheTag(`deal-${dealUid}`);
  cacheTag("deals");
  cacheLife("hours");

  const [fetchedDealTags] = await db
    .select({ tags: deals.tags })
    .from(deals)
    .where(eq(deals.id, dealUid))
    .limit(1);

  return (
    <>
      <div>
        <PreviousPageButton />
      </div>
      <div className="group-has-[[data-pending]]:animate-pulse">
        <AddTagsForm
          dealUid={dealUid}
          existingTags={fetchedDealTags?.tags || []}
        />
      </div>
    </>
  );
}
