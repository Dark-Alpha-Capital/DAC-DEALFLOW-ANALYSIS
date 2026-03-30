
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const DeleteReasoningButton = ({
  reasoningId,
  dealId,
}: {
  reasoningId: string;
  dealId: string;
}) => {
  const trpc = useTRPC();

  const { mutate: deleteReasoning, isPending } = useMutation(
    trpc.misc.deleteReasoning.mutationOptions({
      onSuccess: () => {
        toast.success("Reasoning deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete reasoning");
      },
    })
  );

  return (
    <div>
      <Button
        variant="destructive"
        size="icon"
        disabled={isPending}
        onClick={() => deleteReasoning({ reasoningId, dealId })}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DeleteReasoningButton;
