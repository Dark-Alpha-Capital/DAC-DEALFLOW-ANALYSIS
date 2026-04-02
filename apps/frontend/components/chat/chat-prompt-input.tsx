
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type ChatContext } from "@/lib/chat-context";
import { CHAT_MODELS, type ChatSelection } from "@/lib/chat-models";
import { useTRPC } from "@/trpc/client";

type SelectorOption = {
  id: string;
  label: string;
  description?: string | null;
};

type ChatEntitySelectorProps = {
  title: string;
  placeholder: string;
  searchPlaceholder: string;
  selectedId: string | null;
  selectedLabel: string | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  options: SelectorOption[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onClear: () => void;
};

function ChatEntitySelector({
  title,
  placeholder,
  searchPlaceholder,
  selectedId,
  selectedLabel,
  open,
  onOpenChange,
  query,
  onQueryChange,
  options,
  isLoading,
  onSelect,
  onClear,
}: ChatEntitySelectorProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="h-8 max-w-44 justify-start" size="sm" variant="outline">
          <span className="truncate">
            {selectedLabel ? `${title}: ${selectedLabel}` : `${title}: ${placeholder}`}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[540px]">
        <DialogHeader className="border-b p-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{title}</DialogTitle>
            <Button
              disabled={!selectedId}
              onClick={onClear}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={onQueryChange}
            placeholder={searchPlaceholder}
            value={query}
          />
          <CommandList>
            {isLoading ? (
              <div className="text-muted-foreground p-4 text-sm">Searching...</div>
            ) : (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {options.map((option) => (
              <CommandItem
                key={option.id}
                onSelect={() => {
                  onSelect(option.id);
                  onOpenChange(false);
                  onQueryChange("");
                }}
                value={`${option.label} ${option.description ?? ""}`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.description ? (
                    <span className="text-muted-foreground truncate text-xs">
                      {option.description}
                    </span>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

type ChatPromptInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  selection: ChatSelection;
  onSelectionChange: (value: ChatSelection) => void;
  context: ChatContext;
  onContextChange: (value: ChatContext) => void;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onStop: () => void;
  statusMessageId: string;
  focusComposerSignal: number;
};

export function ChatPromptInput({
  input,
  onInputChange,
  selection,
  onSelectionChange,
  context,
  onContextChange,
  onSubmit,
  status,
  onStop,
  statusMessageId,
  focusComposerSignal,
}: ChatPromptInputProps) {
  const trpc = useTRPC();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [companySelectorOpen, setCompanySelectorOpen] = useState(false);
  const [leadSelectorOpen, setLeadSelectorOpen] = useState(false);
  const [dealSelectorOpen, setDealSelectorOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [dealQuery, setDealQuery] = useState("");

  const companySearch = useQuery({
    ...trpc.companies.searchForChat.queryOptions({
      limit: 20,
      ...(companyQuery.trim() ? { query: companyQuery.trim() } : {}),
    }),
    enabled: companySelectorOpen,
  });

  const leadSearch = useQuery({
    ...trpc.leads.searchForChat.queryOptions({
      limit: 20,
      ...(leadQuery.trim() ? { query: leadQuery.trim() } : {}),
    }),
    enabled: leadSelectorOpen,
  });

  const dealSearch = useQuery({
    ...trpc.dealOpportunities.searchForChat.queryOptions({
      limit: 20,
      ...(dealQuery.trim() ? { query: dealQuery.trim() } : {}),
    }),
    enabled: dealSelectorOpen,
  });

  const selectedCompanyLabel = useMemo(() => {
    if (!context.companyId) return null;
    const selectedCompany = companySearch.data?.find(
      (company) => company.id === context.companyId,
    );
    return selectedCompany?.name ?? `ID ${context.companyId.slice(0, 8)}`;
  }, [companySearch.data, context.companyId]);

  const selectedLeadLabel = useMemo(() => {
    if (!context.leadId) return null;
    const selectedLead = leadSearch.data?.find((lead) => lead.id === context.leadId);
    return selectedLead?.rawTitle ?? `ID ${context.leadId.slice(0, 8)}`;
  }, [context.leadId, leadSearch.data]);

  const selectedDealLabel = useMemo(() => {
    if (!context.dealOpportunityId) return null;
    const selectedDeal = dealSearch.data?.find(
      (deal) => deal.id === context.dealOpportunityId,
    );
    if (!selectedDeal) return `ID ${context.dealOpportunityId.slice(0, 8)}`;
    return selectedDeal.companyName ?? selectedDeal.dealTeaser ?? selectedDeal.id;
  }, [context.dealOpportunityId, dealSearch.data]);

  useEffect(() => {
    if (focusComposerSignal > 0) {
      textareaRef.current?.focus();
    }
  }, [focusComposerSignal]);

  const isGenerating = status === "submitted" || status === "streaming";
  const canSubmit = Boolean(input.trim()) && status === "ready";

  return (
    <div className="sticky bottom-0 z-10 shrink-0 border-t bg-background pt-3">
      <PromptInput aria-busy={isGenerating} onSubmit={onSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            aria-describedby={statusMessageId}
            onChange={(e) => onInputChange(e.currentTarget.value)}
            placeholder="Ask anything..."
            ref={textareaRef}
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
            <ChatEntitySelector
              isLoading={companySearch.isLoading || companySearch.isFetching}
              onClear={() =>
                onContextChange({
                  ...context,
                  companyId: null,
                })
              }
              onOpenChange={(open) => {
                setCompanySelectorOpen(open);
                if (!open) setCompanyQuery("");
              }}
              onQueryChange={setCompanyQuery}
              onSelect={(companyId) =>
                onContextChange({
                  ...context,
                  companyId,
                })
              }
              open={companySelectorOpen}
              options={(companySearch.data ?? []).map((company) => ({
                description: [company.industry, company.location]
                  .filter(Boolean)
                  .join(" • "),
                id: company.id,
                label: company.name,
              }))}
              placeholder="Select company"
              query={companyQuery}
              searchPlaceholder="Search companies..."
              selectedId={context.companyId}
              selectedLabel={selectedCompanyLabel}
              title="Company"
            />
            <ChatEntitySelector
              isLoading={leadSearch.isLoading || leadSearch.isFetching}
              onClear={() =>
                onContextChange({
                  ...context,
                  leadId: null,
                })
              }
              onOpenChange={(open) => {
                setLeadSelectorOpen(open);
                if (!open) setLeadQuery("");
              }}
              onQueryChange={setLeadQuery}
              onSelect={(leadId) =>
                onContextChange({
                  ...context,
                  leadId,
                })
              }
              open={leadSelectorOpen}
              options={(leadSearch.data ?? []).map((lead) => ({
                description: [lead.rawIndustry, lead.sourceWebsite]
                  .filter(Boolean)
                  .join(" • "),
                id: lead.id,
                label: lead.rawTitle,
              }))}
              placeholder="Select lead"
              query={leadQuery}
              searchPlaceholder="Search leads..."
              selectedId={context.leadId}
              selectedLabel={selectedLeadLabel}
              title="Lead"
            />
            <ChatEntitySelector
              isLoading={dealSearch.isLoading || dealSearch.isFetching}
              onClear={() =>
                onContextChange({
                  ...context,
                  dealOpportunityId: null,
                })
              }
              onOpenChange={(open) => {
                setDealSelectorOpen(open);
                if (!open) setDealQuery("");
              }}
              onQueryChange={setDealQuery}
              onSelect={(dealOpportunityId) =>
                onContextChange({
                  ...context,
                  dealOpportunityId,
                })
              }
              open={dealSelectorOpen}
              options={(dealSearch.data ?? []).map((deal) => ({
                description: [deal.dealTeaser, deal.sourceWebsite]
                  .filter(Boolean)
                  .join(" • "),
                id: deal.id,
                label: deal.companyName ?? "Unnamed company",
              }))}
              placeholder="Select deal"
              query={dealQuery}
              searchPlaceholder="Search deal opportunities..."
              selectedId={context.dealOpportunityId}
              selectedLabel={selectedDealLabel}
              title="Deal"
            />
          </PromptInputTools>

          <PromptInputSubmit
            disabled={isGenerating ? false : !canSubmit}
            onStop={onStop}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
