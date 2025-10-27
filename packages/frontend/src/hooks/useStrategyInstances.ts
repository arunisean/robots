/**
 * React Query hooks for strategy instances
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { strategyInstanceAPI } from '../services/strategyAPI';

export function useStrategyInstances(filters?: any) {
  return useQuery({
    queryKey: ['strategy-instances', filters],
    queryFn: () => strategyInstanceAPI.list(filters),
    refetchInterval: (query) => {
      // If there are running strategies, refresh every 5 seconds
      const hasRunning = query.state.data?.data?.some((i: any) => i.status === 'running');
      return hasRunning ? 5000 : false;
    },
  });
}

export function useStrategyInstance(id: string) {
  return useQuery({
    queryKey: ['strategy-instance', id],
    queryFn: () => strategyInstanceAPI.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      // Refresh running strategies every 5 seconds
      return query.state.data?.data?.status === 'running' ? 5000 : false;
    },
  });
}

export function useStartStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => strategyInstanceAPI.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-instances'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-instance'] });
    },
  });
}

export function useStopStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => strategyInstanceAPI.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-instances'] });
    },
  });
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => strategyInstanceAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-instances'] });
    },
  });
}

export function useStrategyTrades(id: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['strategy-trades', id, limit, offset],
    queryFn: () => strategyInstanceAPI.getTrades(id, limit, offset),
    enabled: !!id,
  });
}

export function useStrategyMetrics(id: string) {
  return useQuery({
    queryKey: ['strategy-metrics', id],
    queryFn: () => strategyInstanceAPI.getMetrics(id),
    enabled: !!id,
    refetchInterval: 10000, // Refresh metrics every 10 seconds
  });
}
