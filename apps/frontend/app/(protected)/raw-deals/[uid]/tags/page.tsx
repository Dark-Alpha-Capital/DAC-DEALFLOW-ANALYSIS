import prismaDB from "@/lib/prisma";
import { Metadata } from "next";
import React from "react";
import AddTagsForm from "./add-tags-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PreviousPageButton from "@/components/PreviousPageButton";

type Params = Promise<{ uid: string }>;

export async function generateMetadata(props: {
  params: Params;
}): Promise<Metadata> {
  const { uid } = await props.params;

  try {
    const fetchedDeal = await prismaDB.deal.findUnique({
      where: {
        id: uid,
      },
    });

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

  const userSession = await auth();

  if (!userSession) redirect("/login");

  const fetchedDealTags = await prismaDB.deal.findUnique({
    where: {
      id: uid,
    },
    select: {
      tags: true,
    },
  });

  return (
    <div className="block-space big-container">
      <div>
        <PreviousPageButton />
      </div>
      <div>
        <AddTagsForm dealUid={uid} existingTags={fetchedDealTags?.tags || []} />
      </div>
    </div>
  );
};

export default AddTagsPage;
