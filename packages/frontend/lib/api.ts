/**
 * API client for workflow management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const json = await response.json();
  
  // Auto-unwrap { success: true, data: {...} } responses
  if (json.success && json.data !== undefined) {
    return json.data;
  }
  
  return json;
}

/**
 * Workflow API
 * Using public endpoints for testing (no authentication required)
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
    return fetchAPI<any>(`/api/public/workflows${query ? `?${query}` : ''}`);
  },

  /**
   * Get workflow by ID
   */
  get: async (id: string) => {
    return fetchAPI<any>(`/api/public/workflows/${id}`);
  },

  /**
   * Create new workflow
   */
  create: async (data: any) => {
    return fetchAPI<any>('/api/public/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update workflow
   */
  update: async (id: string, data: any) => {
    return fetchAPI<any>(`/api/public/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete workflow
   */
  delete: async (id: string) => {
    return fetchAPI<void>(`/api/public/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Execute workflow
   */
  execute: async (id: string, options?: any) => {
    return fetchAPI<any>(`/api/public/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  /**
   * Get workflow executions
   */
  getExecutions: async (id: string) => {
    return fetchAPI<any>(`/api/public/workflows/${id}/executions`);
  },
};

/**
 * Public Execution API (for testing)
 */
export const publicExecutionAPI = {
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
    return fetchAPI<any>(`/api/public/executions${query ? `?${query}` : ''}`);
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
