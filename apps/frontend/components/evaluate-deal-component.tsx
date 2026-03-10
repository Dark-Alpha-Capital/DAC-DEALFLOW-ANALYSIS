"use client";

import { useEffect, useState, useTransition } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { evaluateDeal } from "@/lib/actions/evaluate-deal";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DealEvaluationResult {
  success: boolean;
  title?: string;
  score?: number;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  explanation?: string;
  responses?: Array<{
    questionId: string;
    question: string;
    weight: number;
    score: number;
    notes: string;
  }>;
  error?: string;
  message?: string;
}

type HumanResponseDraft = {
  questionId: string;
  score: string;
  notes: string;
};

export default function EvaluateDealComponent({
  dealId,
  dealOpportunityId,
  screenerId,
}: {
  dealId: string;
  dealOpportunityId: string;
  screenerId: string;
}) {
  const [isEvaluating, startEvaluation] = useTransition();
  const [dealEvaluation, setDealEvaluation] =
    useState<DealEvaluationResult | null>(null);
  const [humanResponses, setHumanResponses] = useState<
    Record<string, HumanResponseDraft>
  >({});

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const responsesQuery = useQuery(
    trpc.screeners.getResponses.queryOptions({
      dealOpportunityId,
      screenerId,
    }),
  );

  useEffect(() => {
    if (!responsesQuery.data) return;

    const nextDrafts = responsesQuery.data.reduce<
      Record<string, HumanResponseDraft>
    >((acc, question) => {
      acc[question.id] = {
        questionId: question.id,
        score:
          question.humanResponse?.score != null
            ? String(question.humanResponse.score)
            : "",
        notes: question.humanResponse?.notes ?? "",
      };
      return acc;
    }, {});

    setHumanResponses(nextDrafts);
  }, [responsesQuery.data]);

  async function invalidateResponseQueries() {
    await queryClient.invalidateQueries({
      queryKey: trpc.screeners.getResponses.queryKey({
        dealOpportunityId,
        screenerId,
      }),
    });
  }

  const saveHumanResponses = useMutation(
    trpc.screeners.upsertResponses.mutationOptions({
      onSuccess: async () => {
        await invalidateResponseQueries();
        toast.success("Analyst responses saved");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save analyst responses");
      },
    }),
  );

  const saveAiEvaluation = useMutation(
    trpc.screenings.saveEvaluation.mutationOptions({
      onSuccess: async () => {
        await invalidateResponseQueries();
        toast.success("AI evaluation saved");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save AI evaluation");
      },
    }),
  );

  function updateHumanDraft(
    questionId: string,
    patch: Partial<HumanResponseDraft>,
  ) {
    setHumanResponses((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? { questionId, score: "", notes: "" }),
        ...patch,
      },
    }));
  }

  function runAiEvaluation() {
    startEvaluation(async () => {
      const result = await evaluateDeal(dealId, screenerId);

      if (result.success) {
        setDealEvaluation(result);
        toast.success("AI evaluation completed");
      } else {
        setDealEvaluation(result);
        toast.error(result.error || result.message || "Evaluation failed");
      }
    });
  }

  function saveHumanHandler() {
    const responses = Object.values(humanResponses)
      .filter((response) => response.score !== "")
      .map((response) => ({
        questionId: response.questionId,
        score: Number(response.score),
        notes: response.notes,
      }));

    if (responses.length === 0) {
      toast.error("Enter at least one analyst score");
      return;
    }

    saveHumanResponses.mutate({
      dealOpportunityId,
      screenerId,
      source: "HUMAN",
      responses,
    });
  }

  function saveAiHandler() {
    if (!dealEvaluation?.success || !dealEvaluation.responses?.length) {
      toast.error("Run an AI evaluation first");
      return;
    }

    saveAiEvaluation.mutate({
      dealId,
      dealOpportunityId,
      screenerId,
      title: dealEvaluation.title || "AI Evaluation",
      explanation: dealEvaluation.explanation || "",
      sentiment: dealEvaluation.sentiment,
      score: dealEvaluation.score,
      responses: dealEvaluation.responses.map((response) => ({
        questionId: response.questionId,
        score: response.score,
        notes: response.notes,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button onClick={runAiEvaluation} disabled={isEvaluating}>
          {isEvaluating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Evaluating
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Run AI Evaluation
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={saveAiHandler}
          disabled={saveAiEvaluation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {saveAiEvaluation.isPending ? "Saving AI..." : "Save AI Responses"}
        </Button>

        <Button
          variant="secondary"
          onClick={saveHumanHandler}
          disabled={saveHumanResponses.isPending}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {saveHumanResponses.isPending
            ? "Saving Analyst..."
            : "Save Analyst Responses"}
        </Button>
      </div>

      {dealEvaluation && !dealEvaluation.success ? (
        <Alert variant="destructive">
          <AlertDescription>
            {dealEvaluation.error || dealEvaluation.message || "Evaluation failed"}
          </AlertDescription>
        </Alert>
      ) : null}

      {dealEvaluation?.success ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{dealEvaluation.title || "AI Evaluation"}</span>
              <div className="flex items-center gap-2">
                {dealEvaluation.score != null ? (
                  <Badge variant="outline">{dealEvaluation.score}/10</Badge>
                ) : null}
                {dealEvaluation.sentiment ? (
                  <Badge variant="secondary">{dealEvaluation.sentiment}</Badge>
                ) : null}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {dealEvaluation.explanation}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {responsesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">
          Loading structured questions...
        </div>
      ) : (
        <div className="space-y-4">
          {responsesQuery.data?.map((question) => {
            const draft = humanResponses[question.id] ?? {
              questionId: question.id,
              score: "",
              notes: "",
            };
            const aiPreview =
              dealEvaluation?.responses?.find(
                (response) => response.questionId === question.id,
              ) ?? null;

            return (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span>{question.question}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Weight {question.weight}</Badge>
                      <Badge variant="secondary">{question.responseType}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="text-sm font-medium">Analyst Response</div>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={draft.score}
                        onChange={(event) =>
                          updateHumanDraft(question.id, {
                            score: event.target.value,
                          })
                        }
                        placeholder="0-10 score"
                      />
                      <Textarea
                        value={draft.notes}
                        onChange={(event) =>
                          updateHumanDraft(question.id, {
                            notes: event.target.value,
                          })
                        }
                        placeholder="Analyst notes"
                      />
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="text-sm font-medium">AI Response</div>
                      <div className="text-sm">
                        Score:{" "}
                        <span className="font-semibold">
                          {aiPreview?.score ??
                            question.aiResponse?.score ??
                            "Not scored"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {aiPreview?.notes ||
                          question.aiResponse?.notes ||
                          "No AI notes saved yet."}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {responsesQuery.data?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                This screener has no questions yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
