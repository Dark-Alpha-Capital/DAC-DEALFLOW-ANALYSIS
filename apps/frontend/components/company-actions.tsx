"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import DeleteCompanyDialog from "@/components/Dialogs/delete-company-dialog";
import { useTRPC } from "@/trpc/client";

interface CompanyActionsProps {
  companyId: string;
  companyName: string;
}

const CompanyActions: React.FC<CompanyActionsProps> = ({
  companyId,
  companyName,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const trpc = useTRPC();

  const { mutate: deleteCompany, isPending } = useMutation(
    trpc.companies.delete.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Company Deleted",
          description: "Company deleted successfully",
          variant: "default",
        });
        router.push("/companies");
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete company",
          variant: "destructive",
        });
      },
    })
  );

  const handleDelete = () => {
    deleteCompany({ id: companyId });
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
