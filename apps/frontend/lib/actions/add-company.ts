"use server";

import db, { companies } from "db";
import { revalidatePath } from "next/cache";
import { AddCompanyFormSchemaType } from "@/lib/zod-schemas/add-company-schema";
import { getSession } from "@/lib/auth-server";

const AddCompany = async (values: AddCompanyFormSchemaType) => {
  const userSession = await getSession();
  if (!userSession) {
    return {
      type: "error",
      message: "You are not logged in",
    };
  }

  try {
    const [newCompany] = await db.insert(companies).values({
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
    }).returning();

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
