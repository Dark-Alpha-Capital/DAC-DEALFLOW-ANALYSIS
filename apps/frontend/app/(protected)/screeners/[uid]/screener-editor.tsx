"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  ListOrdered,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

const questionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  weight: z.coerce.number().int().min(0).max(100),
});

type TemplateValues = z.infer<typeof templateSchema>;
type QuestionValues = z.infer<typeof questionSchema>;

type ScreenerWithQuestions = NonNullable<
  Awaited<
    ReturnType<typeof import("@repo/db/queries").getScreenerWithQuestions>
  >
>;

export default function ScreenerEditor({
  screenerId,
  initialScreener,
}: {
  screenerId: string;
  initialScreener?: ScreenerWithQuestions | null;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const screenerQuery = useQuery({
    ...trpc.screeners.getById.queryOptions({ screenerId }),
    initialData: initialScreener ?? undefined,
  });

  const templateForm = useForm<TemplateValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
    },
  });

  const questionForm = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: "",
      weight: 10,
    },
  });

  useEffect(() => {
    if (!screenerQuery.data) return;

    templateForm.reset({
      name: screenerQuery.data.name,
      category: screenerQuery.data.category,
      description: screenerQuery.data.description ?? "",
    });
  }, [screenerQuery.data, templateForm]);

  const screenerQueryKey = trpc.screeners.getById.queryKey({ screenerId });

  async function invalidateScreenerQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.screeners.getAll.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: screenerQueryKey,
      }),
    ]);
  }

  const updateTemplate = useMutation(
    trpc.screeners.updateTemplate.mutationOptions({
      onSuccess: async () => {
        await invalidateScreenerQueries();
        toast.success("Template updated");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update template");
      },
    }),
  );

  const createQuestion = useMutation(
    trpc.screeners.createQuestion.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: screenerQueryKey });
        const previous = queryClient.getQueryData(screenerQueryKey);
        const screenerData = previous as ScreenerWithQuestions | undefined;
        if (screenerData?.questions) {
          const maxPos =
            screenerData.questions.length > 0
              ? Math.max(...screenerData.questions.map((q) => q.position))
              : -1;
          const tempId = `temp-${Date.now()}`;
          const newQuestion = {
            id: tempId,
            screenerId,
            question: variables.question,
            weight: Number(variables.weight),
            responseType: "SCORE" as const,
            position: maxPos + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          queryClient.setQueryData(screenerQueryKey, {
            ...screenerData,
            questions: [...screenerData.questions, newQuestion],
          });
        }
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(screenerQueryKey, context.previous);
        }
        toast.error(error.message || "Failed to add question");
      },
      onSuccess: () => {
        questionForm.reset({ question: "", weight: 10 });
        toast.success("Question added");
      },
      onSettled: () => invalidateScreenerQueries(),
    }),
  );

  const updateQuestion = useMutation(
    trpc.screeners.updateQuestion.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: screenerQueryKey });
        const previous = queryClient.getQueryData(screenerQueryKey);
        const screenerData = previous as ScreenerWithQuestions | undefined;
        if (screenerData?.questions) {
          queryClient.setQueryData(screenerQueryKey, {
            ...screenerData,
            questions: screenerData.questions.map((q) =>
              q.id === variables.id
                ? {
                    ...q,
                    question: variables.question,
                    weight: Number(variables.weight),
                  }
                : q,
            ),
          });
        }
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(screenerQueryKey, context.previous);
        }
        toast.error(error.message || "Failed to update question");
      },
      onSuccess: () => {
        setEditingQuestionId(null);
        toast.success("Question updated");
      },
      onSettled: () => invalidateScreenerQueries(),
    }),
  );

  const deleteQuestion = useMutation(
    trpc.screeners.deleteQuestion.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: screenerQueryKey });
        const previous = queryClient.getQueryData(screenerQueryKey);
        const screenerData = previous as ScreenerWithQuestions | undefined;
        if (screenerData?.questions) {
          queryClient.setQueryData(screenerQueryKey, {
            ...screenerData,
            questions: screenerData.questions.filter(
              (q) => q.id !== variables.questionId,
            ),
          });
        }
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(screenerQueryKey, context.previous);
        }
        toast.error(error.message || "Failed to delete question");
      },
      onSuccess: () => toast.success("Question deleted"),
      onSettled: () => invalidateScreenerQueries(),
    }),
  );

  const reorderQuestions = useMutation(
    trpc.screeners.reorderQuestions.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: screenerQueryKey });
        const previous = queryClient.getQueryData(screenerQueryKey);
        const screenerData = previous as ScreenerWithQuestions | undefined;
        if (screenerData?.questions) {
          const idToQuestion = new Map(
            screenerData.questions.map((q) => [q.id, q]),
          );
          const reordered = variables.questionIds
            .map((id) => idToQuestion.get(id))
            .filter(Boolean) as ScreenerWithQuestions["questions"];
          queryClient.setQueryData(screenerQueryKey, {
            ...screenerData,
            questions: reordered,
          });
        }
        return { previous };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(screenerQueryKey, context.previous);
        }
        toast.error(error.message || "Failed to reorder questions");
      },
      onSettled: () => {
        invalidateScreenerQueries();
      },
    }),
  );

  if (screenerQuery.isLoading) {
    return (
      <div className="text-muted-foreground text-sm">Loading screener...</div>
    );
  }

  if (!screenerQuery.data) {
    return (
      <div className="text-muted-foreground text-sm">Screener not found.</div>
    );
  }

  const screener = screenerQuery.data;
  const questionIds = screener.questions.map((q) => q.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) => {
      const { active, over } = event;
      if (!over || String(active.id) === String(over.id)) return;

      const ids = questionIds;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(ids, oldIndex, newIndex);
      reorderQuestions.mutate({ screenerId, questionIds: newOrder });
    },
    [questionIds, screenerId, reorderQuestions],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-3">
            <Link href="/screeners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Screeners
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {screener.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {screener.description ||
              "Manage weighted questions for deal screening."}
          </p>
        </div>
        <Badge variant="secondary">{screener.category}</Badge>
      </header>

      <Tabs defaultValue="settings" className="w-full space-y-6">
        <TabsList className="h-9">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            Questions
            {screener.questions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {screener.questions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-0 space-y-6">
          <div className="space-y-6 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Template details
            </h2>
            <Form {...templateForm}>
              <form
                onSubmit={templateForm.handleSubmit((values) =>
                  updateTemplate.mutate({ screenerId, ...values }),
                )}
                className="grid gap-4 md:grid-cols-2"
              >
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <FormField
                    control={templateForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={updateTemplate.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateTemplate.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="mt-0 space-y-6">
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Add question
            </h2>
            <Form {...questionForm}>
              <form
                onSubmit={questionForm.handleSubmit((values) =>
                  createQuestion.mutate({
                    screenerId,
                    ...values,
                    responseType: "SCORE",
                  }),
                )}
                className="grid gap-4 md:grid-cols-[1fr_120px_auto]"
              >
                <FormField
                  control={questionForm.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="How predictable is revenue?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={questionForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button type="submit" disabled={createQuestion.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="space-y-0">
            <h2 className="text-muted-foreground mb-4 text-sm font-medium">
              Question list
            </h2>
            {screener.questions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No questions yet. Add weighted score-based questions to use this
                template in deal screening.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => setActiveId(active.id as string)}
                onDragEnd={(event) => {
                  handleDragEnd(event);
                  setActiveId(null);
                }}
                onDragCancel={() => setActiveId(null)}
              >
                <SortableContext
                  items={questionIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y">
                    {screener.questions.map((question) => (
                      <SortableQuestionRow
                        key={question.id}
                        question={question}
                        isEditing={editingQuestionId === question.id}
                        onEdit={() => setEditingQuestionId(question.id)}
                        onCancel={() => setEditingQuestionId(null)}
                        onDelete={() =>
                          deleteQuestion.mutate({
                            screenerId,
                            questionId: question.id,
                          })
                        }
                        onSave={(values) =>
                          updateQuestion.mutate({
                            screenerId,
                            id: question.id,
                            question: values.question,
                            weight: values.weight,
                            responseType: "SCORE",
                          })
                        }
                        isSaving={updateQuestion.isPending}
                        isDeleting={deleteQuestion.isPending}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeId ? (
                    <QuestionDragOverlay
                      question={
                        screener.questions.find((q) => q.id === activeId)!
                      }
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Question = {
  id: string;
  question: string;
  weight: number;
  responseType: string;
  position: number;
};

function SortableQuestionRow({
  question,
  isEditing,
  onEdit,
  onCancel,
  onDelete,
  onSave,
  isSaving,
  isDeleting,
}: {
  question: Question;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (values: QuestionValues) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="py-4 first:pt-0">
      {isEditing ? (
        <QuestionForm
          question={question}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
        />
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring cursor-grab touch-none rounded p-1 focus:ring-2 focus:outline-none active:cursor-grabbing disabled:pointer-events-none"
              aria-label={`Drag to reorder: ${question.question}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div>
              <p className="font-medium">{question.question}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  Weight {question.weight}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionForm({
  question,
  onSave,
  onCancel,
  isSaving,
}: {
  question: Question;
  onSave: (values: QuestionValues) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const form = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: question.question,
      weight: question.weight,
    },
  });

  useEffect(() => {
    form.reset({
      question: question.question,
      weight: question.weight,
    });
  }, [form, question.question, question.weight]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSave)}
        className="grid gap-4 md:grid-cols-[1fr_120px_auto]"
      >
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

function QuestionDragOverlay({ question }: { question: Question }) {
  return (
    <div className="bg-background divide-y rounded-md border shadow-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="text-muted-foreground h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">{question.question}</p>
          <Badge variant="outline" className="mt-1 font-normal">
            Weight {question.weight}
          </Badge>
        </div>
      </div>
    </div>
  );
}
