"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Questionnaire } from "@repo/db";
import {
  CalendarIcon,
  LinkIcon,
  Notebook,
  Trash2,
  UserIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface QuestionnaireCardProps {
  questionnaire: Questionnaire;
}

const QuestionnaireCard: React.FC<QuestionnaireCardProps> = ({
  questionnaire,
}) => {
  const trpc = useTRPC();

  const { mutate: deleteBaseline, isPending } = useMutation(
    trpc.misc.deleteBaseline.mutationOptions({
      onSuccess: () => {
        toast.success("Questionnaire deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete questionnaire");
      },
    })
  );

  const handleDelete = () => {
    deleteBaseline({
      blobUrl: questionnaire.fileUrl,
      questionnaireId: questionnaire.id,
    });
  };

  return (
    <Card className="bg-muted">
      <CardHeader>
        <CardTitle>{questionnaire.title}</CardTitle>
        <CardDescription>{questionnaire.purpose}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <LinkIcon className="mr-2 h-4 w-4" />
            <a
              href={questionnaire.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View Questionnaire
            </a>
          </div>
          <div className="flex items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>{questionnaire.author}</span>
          </div>
          <div className="flex items-center">
            <Notebook className="mr-2 h-4 w-4" />
            <span>{questionnaire.version}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>
              {new Date(questionnaire.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default QuestionnaireCard;
