
interface ScreeningScoreCardProps {
  items: {
    id: string;
    screenings: {
      sentiment: string;
      score: number | null;
    }[];
  }[];
}

export default function ScreeningScoreCard({ items }: ScreeningScoreCardProps) {
  if (items.length === 0) {
    return null;
  }

  let totalScreenings = 0;
  let scoreSum = 0;
  let scoredCount = 0;
  const sentimentCounts: Record<string, number> = {
    POSITIVE: 0,
    NEUTRAL: 0,
    NEGATIVE: 0,
  };

  for (const deal of items) {
    for (const s of deal.screenings) {
      totalScreenings += 1;
      if (typeof s.score === "number") {
        scoreSum += s.score;
        scoredCount += 1;
      }
      if (sentimentCounts[s.sentiment] != null) {
        sentimentCounts[s.sentiment] += 1;
      }
    }
  }

  const averageScore =
    scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : null;

  const formatPercent = (value: number) =>
    totalScreenings > 0 ? `${Math.round((value / totalScreenings) * 100)}%` : "0%";

  return (
    <section className="mb-6 rounded-md border bg-background p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Screening overview
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Screened deals</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {items.length.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Total screenings</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {totalScreenings.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Average score</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {averageScore != null ? averageScore.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
        <SentimentPill
          label="Positive"
          count={sentimentCounts.POSITIVE}
          total={totalScreenings}
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <SentimentPill
          label="Neutral"
          count={sentimentCounts.NEUTRAL}
          total={totalScreenings}
          colorClass="bg-muted text-muted-foreground"
        />
        <SentimentPill
          label="Negative"
          count={sentimentCounts.NEGATIVE}
          total={totalScreenings}
          colorClass="bg-destructive/10 text-destructive"
        />
      </div>
    </section>
  );
}

function SentimentPill({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="flex items-center gap-1 font-medium tabular-nums">
        <span className={colorClass}>{count}</span>
        <span className="text-muted-foreground">({percent}%)</span>
      </p>
    </div>
  );
}

