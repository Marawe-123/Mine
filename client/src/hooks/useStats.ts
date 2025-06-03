import { useQuery } from "@tanstack/react-query";

interface Stats {
  jobsToday: number;
  commentsAnalyzed: number;
  repliesSent: number;
  activeTasks: number;
}

export function useStats() {
  return useQuery<Stats>({
    queryKey: ['/api/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
