"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Questionnaire } from "@prisma/client";
import {
  CalendarIcon,
  LinkIcon,
  Notebook,
  Trash2,
  UserIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import DeleteBaseline from "@/app/actions/delete-baseline";

interface QuestionnaireCardProps {
  questionnaire: Questionnaire;
}

const QuestionnaireCard: React.FC<QuestionnaireCardProps> = ({
  questionnaire,
}) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = async () => {
    startTransition(async () => {
      // delete questionnaire
      const response = await DeleteBaseline(
        questionnaire.fileUrl,
        questionnaire.id,
      );

      if (response.type === "success") {
        toast({
          title: "Questionnaire deleted",
          description: "The questionnaire has been successfully deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete questionnaire",
          variant: "destructive",
        });
      }
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
              className="text-blue-500 hover:underline"
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
