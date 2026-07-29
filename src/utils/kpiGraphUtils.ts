// import type { KpiConversation } from "@/types/conversation.types";

export function groupByDate(conversations: any[]) {
  const map: Record<
    string,
    { date: string; costUsd: number; conversations: number; duration: number }
  > = {};

  conversations.forEach((c) => {
    if (!map[c.date]) {
      map[c.date] = {
        date: c.date,
        costUsd: 0,
        conversations: 0,
        duration: 0,
      };
    }

    map[c.date].costUsd += c.cost_usd;
    map[c.date].conversations += 1;
    map[c.date].duration += c.call_duration_secs;
  });

  return Object.values(map).map((d) => ({
    date: d.date,
    totalCostUsd: Number(d.costUsd.toFixed(2)),
    conversations: d.conversations,
    avgDurationSecs: Math.round(d.duration / d.conversations),
  }));
}
