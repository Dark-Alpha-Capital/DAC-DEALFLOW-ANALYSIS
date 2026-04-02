
import { useRouter } from "@/lib/navigation-shim";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { MessageSquare, RotateCcw, TriangleAlert } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import {
  type ConfirmationProps,
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { ChatStarterPrompts } from "@/components/chat/chat-starter-prompts";
import { ChatPromptInput } from "@/components/chat/chat-prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { EMPTY_CHAT_CONTEXT, type ChatContext } from "@/lib/chat-context";
import {
  DEFAULT_CHAT_SELECTION,
  type ChatSelection,
  type ChatProvider,
} from "@/lib/chat-models";
import { useTRPC } from "@/trpc/client";

const LOCATION_FIXTURES = [
  { city: "New York", country: "US", timezone: "America/New_York" },
  { city: "San Francisco", country: "US", timezone: "America/Los_Angeles" },
  { city: "Chicago", country: "US", timezone: "America/Chicago" },
  { city: "Austin", country: "US", timezone: "America/Chicago" },
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function getDeterministicLocation(toolCallId: string) {
  return LOCATION_FIXTURES[hashString(toolCallId) % LOCATION_FIXTURES.length];
}

type ToolPartLike = {
  type: string;
  state?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
};

export function ChatClient({
  chatId,
  initialMessages,
  initialSelection = DEFAULT_CHAT_SELECTION,
  initialContext = EMPTY_CHAT_CONTEXT,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  initialSelection?: ChatSelection;
  initialContext?: ChatContext;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState<ChatSelection>(initialSelection);
  const [context, setContext] = useState<ChatContext>(initialContext);
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);
  const [politeAnnouncement, setPoliteAnnouncement] = useState("Chat ready.");
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState("");
  const statusMessageId = useId();
  const previousStatusRef = useRef<string | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  const [provider, model] = selection.split(":") as [ChatProvider, string];
  const updateContextMutation = useMutation(
    trpc.chats.updateContext.mutationOptions(),
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    regenerate,
    error,
    clearError,
    addToolOutput,
    addToolApprovalResponse,
  } = useChat({
    id: chatId,
    messages: initialMessages,
    sendAutomaticallyWhen: (options) =>
      lastAssistantMessageIsCompleteWithToolCalls(options) ||
      lastAssistantMessageIsCompleteWithApprovalResponses(options),
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ id, messages: currentMessages, body }) {
        const message = currentMessages[currentMessages.length - 1];
        return {
          body: {
            ...(body ?? {}),
            id,
            message,
          },
        };
      },
    }),
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === "getLocation") {
        const output = getDeterministicLocation(toolCall.toolCallId);
        addToolOutput({
          tool: "getLocation",
          toolCallId: toolCall.toolCallId,
          output,
        });
      }
    },
    onFinish: ({ isAbort, isDisconnect, isError }) => {
      if (isAbort) {
        setAssertiveAnnouncement("Response stopped. Partial response kept.");
      } else if (isDisconnect || isError) {
        setAssertiveAnnouncement(
          "The response ended unexpectedly. Retry the response.",
        );
      } else {
        setPoliteAnnouncement("Assistant response complete.");
      }

      queryClient.invalidateQueries({
        queryKey: trpc.chats.listRecent.queryKey({ limit: 50 }),
      });
      router.refresh();
    },
    onError: (error) => {
      setAssertiveAnnouncement("Something went wrong. Retry the response.");
      console.error(error);
    },
  });

  useEffect(() => {
    if (previousStatusRef.current === status) {
      return;
    }

    previousStatusRef.current = status;

    if (status === "submitted") {
      setPoliteAnnouncement("Message sent. Model is thinking.");
    } else if (status === "streaming") {
      setPoliteAnnouncement("Assistant is responding.");
    } else if (status === "ready") {
      setPoliteAnnouncement("Chat ready for the next message.");
    } else if (status === "error") {
      setAssertiveAnnouncement("A chat request failed. Retry or dismiss.");
    }
  }, [status]);

  useEffect(() => {
    if (error) {
      retryButtonRef.current?.focus();
    }
  }, [error]);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text) {
      return;
    }

    sendMessage(
      { text },
      {
        body: {
          provider,
          model,
          context,
        },
      },
    );

    setInput("");
  };

  const handleStarterPromptSelect = (prompt: string) => {
    sendMessage(
      { text: prompt },
      {
        body: {
          provider,
          model,
          context,
        },
      },
    );
  };

  const handleStop = () => {
    stop();
    setAssertiveAnnouncement("Response stopped. Partial response kept.");
    setFocusComposerSignal((value) => value + 1);
  };

  const handleRetry = () => {
    clearError();
    regenerate({
      body: {
        provider,
        model,
        context,
      },
    });
    setPoliteAnnouncement("Retrying assistant response.");
  };

  const handleDismissError = () => {
    clearError();
    setFocusComposerSignal((value) => value + 1);
  };

  const renderToolPart = (part: ToolPartLike, key: string) => (
    <Tool className="w-full" key={key}>
      {part.type === "dynamic-tool" ? (
        <ToolHeader
          state={(part.state ?? "input-streaming") as never}
          title={part.toolName}
          toolName={part.toolName ?? "dynamic-tool"}
          type="dynamic-tool"
        />
      ) : (
        <ToolHeader
          state={(part.state ?? "input-streaming") as never}
          type={part.type as never}
        />
      )}
      <ToolContent>
        {(part.state === "input-streaming" ||
          part.state === "input-available") &&
        part.input != null ? (
          <ToolInput input={part.input as object} />
        ) : null}
        {(part.state === "output-available" ||
          part.state === "output-error") && (
          <ToolOutput errorText={part.errorText} output={part.output} />
        )}
      </ToolContent>
    </Tool>
  );

  const handleContextChange = (nextContext: ChatContext) => {
    setContext(nextContext);
    updateContextMutation.mutate({
      chatId,
      companyId: nextContext.companyId,
      leadId: nextContext.leadId,
      dealOpportunityId: nextContext.dealOpportunityId,
    });
  };

  const isGenerating = status === "submitted" || status === "streaming";
  const statusText =
    status === "submitted"
      ? "Model is thinking..."
      : status === "streaming"
        ? "Model is responding..."
        : status === "error"
          ? "Request failed. You can retry."
          : "Ready";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        {politeAnnouncement}
      </p>
      <p aria-atomic="true" aria-live="assertive" className="sr-only">
        {assertiveAnnouncement}
      </p>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                className="gap-4"
                description="Pick a model, click a starter prompt, or type your first message."
                icon={<MessageSquare className="size-10" />}
                title="Start a conversation"
              />
            ) : (
              messages.map((message, messageIndex) => (
                <Message
                  from={message.role}
                  key={`${message.id}-${messageIndex}`}
                >
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      const key = `${message.id}-${index}`;
                      const toolPart = part as ToolPartLike;

                      switch (part.type) {
                        case "text":
                          return <Response key={key}>{part.text}</Response>;
                        case "step-start":
                          return index > 0 ? (
                            <div className="py-2" key={key}>
                              <Separator />
                            </div>
                          ) : null;
                        case "tool-getLocation": {
                          const location = (toolPart.output as
                            | {
                                city?: string;
                                country?: string;
                                timezone?: string;
                              }
                            | undefined) ?? { city: "Unknown" };
                          if (toolPart.state === "output-available") {
                            return (
                              <Card className="w-full" key={key}>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">
                                    Location Widget
                                  </CardTitle>
                                  <CardDescription>
                                    Client-side dummy generative UI
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="font-medium">
                                    {location.city}
                                  </div>
                                  <div className="text-muted-foreground text-sm">
                                    {(location.country ?? "US").toUpperCase()}
                                  </div>
                                  <Badge variant="secondary">
                                    {location.timezone ?? "Unknown timezone"}
                                  </Badge>
                                </CardContent>
                              </Card>
                            );
                          }
                          return renderToolPart(toolPart, key);
                        }
                        case "tool-getWeatherInformation": {
                          const weather = (toolPart.output as
                            | {
                                city?: string;
                                condition?: string;
                                temperatureC?: number;
                                humidityPct?: number;
                              }
                            | undefined) ?? {
                            city: "Unknown",
                            condition: "Unknown",
                          };
                          if (toolPart.state === "output-available") {
                            return (
                              <Card className="w-full" key={key}>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">
                                    Weather App Widget
                                  </CardTitle>
                                  <CardDescription>
                                    Server-side dummy generative UI
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-2 sm:grid-cols-3">
                                  <div>
                                    <div className="text-muted-foreground text-xs">
                                      City
                                    </div>
                                    <div className="font-medium">
                                      {weather.city}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground text-xs">
                                      Condition
                                    </div>
                                    <div className="font-medium">
                                      {weather.condition}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground text-xs">
                                      Temp / Humidity
                                    </div>
                                    <div className="font-medium">
                                      {weather.temperatureC ?? "--"}C /{" "}
                                      {weather.humidityPct ?? "--"}%
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }
                          return renderToolPart(toolPart, key);
                        }
                        case "tool-getStockQuote": {
                          const quote = (toolPart.output as
                            | {
                                symbol?: string;
                                price?: number;
                                changePct?: number;
                                asOf?: string;
                                venue?: string;
                              }
                            | undefined) ?? { symbol: "N/A" };

                          if (toolPart.state === "approval-requested") {
                            return (
                              <Confirmation
                                approval={
                                  toolPart.approval
                                    ? ({
                                        id: toolPart.approval.id,
                                        ...(toolPart.approval.approved !==
                                          undefined && {
                                          approved: toolPart.approval.approved,
                                        }),
                                        ...(toolPart.approval.reason !==
                                          undefined && {
                                          reason: toolPart.approval.reason,
                                        }),
                                      } as ConfirmationProps["approval"])
                                    : undefined
                                }
                                key={key}
                                state={toolPart.state as never}
                              >
                                <ConfirmationTitle>
                                  Approve stock quote request for{" "}
                                  <strong>
                                    {(toolPart.input as { symbol?: string })
                                      ?.symbol ?? "unknown"}
                                  </strong>
                                  ?
                                </ConfirmationTitle>
                                <ConfirmationRequest>
                                  <ConfirmationActions>
                                    <ConfirmationAction
                                      onClick={() =>
                                        toolPart.approval?.id &&
                                        addToolApprovalResponse({
                                          approved: false,
                                          id: toolPart.approval.id,
                                        })
                                      }
                                      variant="outline"
                                    >
                                      Deny
                                    </ConfirmationAction>
                                    <ConfirmationAction
                                      onClick={() =>
                                        toolPart.approval?.id &&
                                        addToolApprovalResponse({
                                          approved: true,
                                          id: toolPart.approval.id,
                                        })
                                      }
                                    >
                                      Approve
                                    </ConfirmationAction>
                                  </ConfirmationActions>
                                </ConfirmationRequest>
                                <ConfirmationAccepted>
                                  Request approved.
                                </ConfirmationAccepted>
                                <ConfirmationRejected>
                                  Request denied.
                                </ConfirmationRejected>
                              </Confirmation>
                            );
                          }

                          if (toolPart.state === "output-available") {
                            const change = quote.changePct ?? 0;
                            const positive = change >= 0;
                            return (
                              <Card className="w-full" key={key}>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">
                                    Stock App Widget
                                  </CardTitle>
                                  <CardDescription>
                                    Approval-gated dummy generative UI
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-2 sm:grid-cols-3">
                                  <div>
                                    <div className="text-muted-foreground text-xs">
                                      Symbol
                                    </div>
                                    <div className="font-medium">
                                      {quote.symbol}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground text-xs">
                                      Last Price
                                    </div>
                                    <div className="font-medium">
                                      ${quote.price?.toFixed(2) ?? "--"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground text-xs">
                                      Change
                                    </div>
                                    <Badge
                                      variant={
                                        positive ? "default" : "destructive"
                                      }
                                    >
                                      {positive ? "+" : ""}
                                      {change.toFixed(2)}%
                                    </Badge>
                                  </div>
                                  <div className="text-muted-foreground text-xs sm:col-span-3">
                                    {quote.venue ?? "N/A"} •{" "}
                                    {quote.asOf ?? "N/A"}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }

                          return renderToolPart(toolPart, key);
                        }
                        case "dynamic-tool":
                          return renderToolPart(toolPart, key);
                        default:
                          if (
                            typeof part.type === "string" &&
                            part.type.startsWith("tool-")
                          ) {
                            return renderToolPart(toolPart, key);
                          }
                          return null;
                      }
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
            {messages.length === 0 ? (
              <ChatStarterPrompts onSelect={handleStarterPromptSelect} />
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {(isGenerating || error) && (
          <div className="mt-2" id={statusMessageId}>
            {isGenerating ? (
              <div
                aria-live="polite"
                className="bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                role="status"
              >
                <div className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  <span>{statusText}</span>
                </div>
                <Button
                  onClick={handleStop}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Stop response
                </Button>
              </div>
            ) : null}
            {error ? (
              <Alert className="mt-2" variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{statusText}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleRetry}
                      ref={retryButtonRef}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <RotateCcw className="size-4" />
                      Retry
                    </Button>
                    <Button
                      onClick={handleDismissError}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
        {!isGenerating && !error ? (
          <p className="sr-only" id={statusMessageId}>
            {statusText}
          </p>
        ) : null}

        <ChatPromptInput
          context={context}
          focusComposerSignal={focusComposerSignal}
          input={input}
          onContextChange={handleContextChange}
          onInputChange={setInput}
          onSelectionChange={setSelection}
          onStop={handleStop}
          onSubmit={handleSubmit}
          selection={selection}
          status={status}
          statusMessageId={statusMessageId}
        />
      </div>
    </div>
  );
}
