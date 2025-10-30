"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DeleteCompanyDialog from "@/components/Dialogs/delete-company-dialog";
import DeleteCompany from "@/app/actions/delete-company";
import { Trash2 } from "lucide-react";

interface CompanyActionsProps {
  companyId: string;
  companyName: string;
}

const CompanyActions: React.FC<CompanyActionsProps> = ({
  companyId,
  companyName,
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await DeleteCompany(companyId);

        if (result.type === "success") {
          toast({
            title: "Company Deleted",
            description: result.message,
            variant: "default",
          });
          router.push("/companies");
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting company:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      <DeleteCompanyDialog
        companyName={companyName}
        onDelete={handleDelete}
        isDeleting={isPending}
      />
    </div>
  );
};

export default CompanyActions;
