import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@shared/schema";

export function useRecentActivities(hours: number = 24) {
  return useQuery<Activity[]>({
    queryKey: ['/api/activities/recent', { hours }],
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}
