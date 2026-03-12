"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const STARTER_PROMPTS = [
  "Give me a quick investment summary for the selected company.",
  "What are the top 5 risks for this deal opportunity?",
  "Draft first outreach questions for this lead.",
  "What additional diligence docs should I request first?",
] as const;

export function ChatStarterPrompts({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="mt-2 w-full max-w-2xl space-y-3">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        Starter prompts
      </p>
      <Suggestions>
        {STARTER_PROMPTS.map((prompt) => (
          <Suggestion key={prompt} onClick={onSelect} suggestion={prompt} />
        ))}
      </Suggestions>
    </div>
  );
}
