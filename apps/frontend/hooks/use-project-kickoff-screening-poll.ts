import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type ScreeningProgress = { step: string; percentage: number } | null;
type ScreeningResult = { score: number; analysis: string } | null;

export function useProjectKickoffScreeningPoll(
  jobId: string | null,
  enabled: boolean,
) {
  const trpc = useTRPC();
  const [result, setResult] = useState<ScreeningResult>(null);
  const [terminalState, setTerminalState] = useState<
    "completed" | "failed" | null
  >(null);

  const { data } = useQuery({
    ...trpc.projectKickoffs.getScreeningStatus.queryOptions(
      { jobId: jobId ?? "" },
      {
        enabled: enabled && !!jobId,
        refetchInterval: (query) => {
          const state = query.state.data?.state;
          if (state === "completed" || state === "failed") return false;
          return 5000;
        },
      },
    ),
  });

  const progress: ScreeningProgress = data?.progress ?? null;

  useEffect(() => {
    if (!data) return;
    if (data.state === "completed" && data.result) {
      setResult({
        score: data.result.score ?? 0,
        analysis: data.result.analysis ?? "",
      });
      setTerminalState("completed");
    } else if (data.state === "failed") {
      setTerminalState("failed");
    }
  }, [data]);

  return {
    progress,
    result,
    terminalState,
    isPolling: enabled && !!jobId && terminalState == null,
    state: data?.state ?? null,
  };
}
