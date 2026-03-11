"use client";

import type { ChatStatus } from "ai";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  CHAT_MODELS,
  type ChatSelection,
} from "@/lib/chat-models";

type ChatPromptInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  selection: ChatSelection;
  onSelectionChange: (value: ChatSelection) => void;
  onSubmit: (message: PromptInputMessage) => void;
  disabled: boolean;
  status: ChatStatus;
};

export function ChatPromptInput({
  input,
  onInputChange,
  selection,
  onSelectionChange,
  onSubmit,
  disabled,
  status,
}: ChatPromptInputProps) {
  return (
    <div className="sticky bottom-0 z-10 shrink-0 border-t bg-background pt-3">
      <PromptInput onSubmit={onSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => onInputChange(e.currentTarget.value)}
            placeholder="Ask anything..."
            value={input}
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputSelect
              onValueChange={(value) => onSelectionChange(value as ChatSelection)}
              value={selection}
            >
              <PromptInputSelectTrigger className="h-8 min-w-48">
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                <PromptInputSelectItem disabled value="provider-openai">
                  OpenAI
                </PromptInputSelectItem>
                {CHAT_MODELS.openai.map((openaiModel) => (
                  <PromptInputSelectItem
                    key={openaiModel.value}
                    value={`openai:${openaiModel.value}`}
                  >
                    {openaiModel.label}
                  </PromptInputSelectItem>
                ))}

                <PromptInputSelectItem disabled value="provider-google">
                  Gemini
                </PromptInputSelectItem>
                {CHAT_MODELS.google.map((googleModel) => (
                  <PromptInputSelectItem
                    key={googleModel.value}
                    value={`google:${googleModel.value}`}
                  >
                    {googleModel.label}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          </PromptInputTools>

          <PromptInputSubmit disabled={disabled} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
