/**
 * API client for workflow management
 */

import { authService } from '../services/authService';

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
  console.log('🔑 Auth token available:', !!token);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  console.log(`📡 API call: ${options.method || 'GET'} ${url} - Status: ${response.status}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Workflow API
 * Uses authenticated endpoints with Web3 wallet authentication
 */
export const workflowAPI = {
  /**
   * List all workflows
   */
  list: async (filters?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    const response = await fetchAPI<any>(`/api/workflows${query ? `?${query}` : ''}`);
    return response.data || response;
  },

  /**
   * Get workflow by ID
   */
  get: async (id: string) => {
    const response = await fetchAPI<any>(`/api/workflows/${id}`);
    return response.data || response;
  },

  /**
   * Create new workflow
   */
  create: async (data: any) => {
    const response = await fetchAPI<any>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  /**
   * Update workflow
   */
  update: async (id: string, data: any) => {
    const response = await fetchAPI<any>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  /**
   * Delete workflow
   */
  delete: async (id: string) => {
    return fetchAPI<void>(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Execute workflow
   */
  execute: async (id: string, options?: any) => {
    const response = await fetchAPI<any>(`/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    return response.data || response;
  },

  /**
   * Get workflow executions
   */
  getExecutions: async (id: string) => {
    const response = await fetchAPI<any>(`/api/workflows/${id}/executions`);
    return response.data || response;
  },
};

/**
 * Execution API
 */
export const executionAPI = {
  /**
   * List all executions
   */
  list: async (filters?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.workflowId) params.append('workflowId', filters.workflowId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return fetchAPI<any>(`/api/executions${query ? `?${query}` : ''}`);
  },

  /**
   * Get execution by ID
   */
  get: async (id: string) => {
    return fetchAPI<any>(`/api/executions/${id}`);
  },

  /**
   * Get execution results
   */
  getResults: async (id: string) => {
    return fetchAPI<any>(`/api/executions/${id}/results`);
  },

  /**
   * Cancel execution
   */
  cancel: async (id: string) => {
    return fetchAPI<void>(`/api/executions/${id}/cancel`, {
      method: 'POST',
    });
  },
};
