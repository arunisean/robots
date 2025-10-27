/**
 * React Query hooks for strategy templates
 */

import { useQuery } from '@tanstack/react-query';
import { strategyTemplateAPI } from '../services/strategyAPI';

export function useStrategyTemplates(filters?: any) {
  return useQuery({
    queryKey: ['strategy-templates', filters],
    queryFn: () => strategyTemplateAPI.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStrategyTemplate(id: string) {
  return useQuery({
    queryKey: ['strategy-template', id],
    queryFn: () => strategyTemplateAPI.getById(id),
    enabled: !!id,
  });
}
