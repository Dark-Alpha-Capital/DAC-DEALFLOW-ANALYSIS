"use server";

import { z } from "zod";
import prismaDB from "@/lib/prisma";
import { withAuthServerAction } from "@/lib/withAuth";
import { User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AddCompanyFormSchemaType } from "@/lib/zod-schemas/add-company-schema";
import { auth } from "@/auth";

const AddCompany = async (values: AddCompanyFormSchemaType) => {
  const userSession = await auth();
  if (!userSession) {
    return {
      type: "error",
      message: "You are not logged in",
    };
  }

  try {
    const newCompany = await prismaDB.company.create({
      data: {
        name: values.name,
        website: values.website,
        sector: values.sector,
        stage: values.stage,
        headquarters: values.headquarters,
        description: values.description,
        revenue: values.revenue,
        ebitda: values.ebitda,
        growthRate: values.growthRate,
        employees: values.employees,
      },
    });

    revalidatePath("/companies");
    revalidatePath("/due-diligence");

    return {
      type: "success",
      message: "Company added successfully",
      company: newCompany,
    };
  } catch (error) {
    console.error("Error adding company:", error);
    return {
      type: "error",
      message: "Failed to add company. Please try again.",
    };
  }
};

export default AddCompany;
