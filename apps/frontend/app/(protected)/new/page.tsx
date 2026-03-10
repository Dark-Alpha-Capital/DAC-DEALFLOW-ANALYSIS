import React from "react";

import { Bot } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CreateNewDealForm from "@/components/forms/new-deal-form";
import { Metadata } from "next";
// BulkImportDialog is unused, consider removing if not needed elsewhere
// import { BulkImportDialog } from "@/components/Dialogs/bulk-import-dialog";
import BulkImportCard from "@/components/cards/bulk-import-card";

export const metadata: Metadata = {
  title: "Add New Deal",
  description:
    "Add a new Deal to the Database by bulk importing or adding it manually",
};

const NewDealPage = async () => {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6 text-center">
        <h1>Add New Deal</h1>
        <p>
          Add a new Deal to the Database by bulk importing or adding it manually
        </p>
      </div>

      <Link href="/leads/new">Add New Lead</Link>
    </section>
  );
};

export default NewDealPage;
