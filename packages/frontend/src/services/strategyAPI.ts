/**
 * Strategy API client
 */

import { authService } from './authService';
import type { 
  StrategyTemplate, 
  StrategyInstance, 
  Trade, 
  PerformanceMetrics,
  StrategyConfig 
} from '../types/strategy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch wrapper with error handling and authentication
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get authentication token
  const token = authService.getToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Strategy Template API
 */
export const strategyTemplateAPI = {
  /**
   * List all strategy templates
   */
  list: async (filters?: {
    category?: string;
    difficulty?: string;
    tags?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString();
    return fetchAPI<{ data: StrategyTemplate[]; pagination: any }>(
      `/api/strategy-templates${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get strategy template by ID
   */
  getById: async (id: string) => {
    return fetchAPI<{ data: StrategyTemplate }>(`/api/strategy-templates/${id}`);
  },

  /**
   * Instantiate a strategy from template
   */
  instantiate: async (id: string, config: StrategyConfig) => {
    return fetchAPI<{ data: StrategyInstance; message: string }>(
      `/api/strategy-templates/${id}/instantiate`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    );
  },
};

/**
 * Strategy Instance API
 * Note: These endpoints need to be implemented in the backend
 */
export const strategyInstanceAPI = {
  /**
   * List user's strategy instances
   */
  list: async (filters?: {
    status?: string;
    paperTrading?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const query = params.toString();
    return fetchAPI<{ data: StrategyInstance[]; pagination: any }>(
      `/api/strategy-instances${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get strategy instance by ID
   */
  getById: async (id: string) => {
    return fetchAPI<{ data: StrategyInstance }>(`/api/strategy-instances/${id}`);
  },

  /**
   * Start a strategy instance
   */
  start: async (id: string) => {
    return fetchAPI<{ data: StrategyInstance; message: string }>(
      `/api/strategy-instances/${id}/start`,
      { method: 'POST' }
    );
  },

  /**
   * Stop a strategy instance
   */
  stop: async (id: string) => {
    return fetchAPI<{ data: StrategyInstance; message: string }>(
      `/api/strategy-instances/${id}/stop`,
      { method: 'POST' }
    );
  },

  /**
   * Delete a strategy instance
   */
  delete: async (id: string) => {
    return fetchAPI<void>(`/api/strategy-instances/${id}`, { method: 'DELETE' });
  },

  /**
   * Get trades for a strategy instance
   */
  getTrades: async (id: string, limit = 50, offset = 0) => {
    return fetchAPI<{ data: Trade[]; pagination: any }>(
      `/api/strategy-instances/${id}/trades?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get performance metrics for a strategy instance
   */
  getMetrics: async (id: string) => {
    return fetchAPI<{ data: PerformanceMetrics }>(
      `/api/strategy-instances/${id}/metrics`
    );
  },
};
