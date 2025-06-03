import { useQuery } from "@tanstack/react-query";
import type { Task } from "@shared/schema";

export function useActiveTasks() {
  return useQuery<Task[]>({
    queryKey: ['/api/tasks/active'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
