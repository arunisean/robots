/**
 * API client for workflow management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Fetch wrapper with error handling and authentication
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  console.log('🔵 fetchAPI called (lib/api.ts):');
  console.log('  📍 Endpoint:', endpoint);
  console.log('  🔑 Token available:', !!token);
  if (token) {
    console.log('  🔑 Token preview:', token.substring(0, 20) + '...');
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('  🌐 Full URL:', url);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  console.log('  📤 Request headers:', Object.keys(headers));
  console.log('  📤 Request method:', options.method || 'GET');
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log('  📥 Response status:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.log('  ❌ Error response:', error);
    
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      throw new Error('Authentication expired. Please login again.');
    }
    
    throw new Error(error.message || error.error || `API error: ${response.status}`);
  }

  const json = await response.json();
  console.log('  ✅ Response JSON:', json);
  
  // Auto-unwrap { success: true, data: {...} } responses
  if (json.success && json.data !== undefined) {
    console.log('  📦 Unwrapped data:', json.data);
    return json.data;
  }
  
  console.log('  📦 Returning raw JSON');
  return json;
}

/**
 * Workflow API
 * Using authenticated endpoints (requires JWT token)
 */
export const workflowAPI = {
  /**
   * List all workflows (user's own workflows or all if admin)
   */
  list: async (filters?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    console.log('🔷 workflowAPI.list called with filters:', filters);
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    const result = await fetchAPI<any>(`/api/workflows${query ? `?${query}` : ''}`);
    console.log('🔷 workflowAPI.list result:', result);
    return result;
  },

  /**
   * Get workflow by ID
   */
  get: async (id: string) => {
    console.log('🔷 workflowAPI.get called with id:', id);
    const result = await fetchAPI<any>(`/api/workflows/${id}`);
    console.log('🔷 workflowAPI.get result:', result);
    return result;
  },

  /**
   * Create new workflow
   */
  create: async (data: any) => {
    console.log('🔷 workflowAPI.create called with data:', data);
    const result = await fetchAPI<any>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('🔷 workflowAPI.create result:', result);
    return result;
  },

  /**
   * Update workflow
   */
  update: async (id: string, data: any) => {
    console.log('🔷 workflowAPI.update called with id:', id, 'data:', data);
    const result = await fetchAPI<any>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    console.log('🔷 workflowAPI.update result:', result);
    return result;
  },

  /**
   * Delete workflow
   */
  delete: async (id: string) => {
    console.log('🔷 workflowAPI.delete called with id:', id);
    const result = await fetchAPI<void>(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
    console.log('🔷 workflowAPI.delete result:', result);
    return result;
  },

  /**
   * Execute workflow
   */
  execute: async (id: string, options?: any) => {
    console.log('🔷 workflowAPI.execute called with id:', id, 'options:', options);
    const result = await fetchAPI<any>(`/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    console.log('🔷 workflowAPI.execute result:', result);
    return result;
  },

  /**
   * Get workflow statistics
   */
  getStats: async (id: string) => {
    console.log('🔷 workflowAPI.getStats called with id:', id);
    const result = await fetchAPI<any>(`/api/workflows/${id}/stats`);
    console.log('🔷 workflowAPI.getStats result:', result);
    return result;
  },
};



/**
 * Execution API with authentication
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
    console.log('🔶 executionAPI.list called with filters:', filters);
    const params = new URLSearchParams();
    if (filters?.workflowId) params.append('workflowId', filters.workflowId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    const result = await fetchAPI<any>(`/api/executions${query ? `?${query}` : ''}`);
    console.log('🔶 executionAPI.list result:', result);
    return result;
  },

  /**
   * Get execution by ID
   */
  get: async (id: string) => {
    console.log('🔶 executionAPI.get called with id:', id);
    const result = await fetchAPI<any>(`/api/executions/${id}`);
    console.log('🔶 executionAPI.get result:', result);
    return result;
  },

  /**
   * Get execution results
   */
  getResults: async (id: string) => {
    console.log('🔶 executionAPI.getResults called with id:', id);
    const result = await fetchAPI<any>(`/api/executions/${id}/results`);
    console.log('🔶 executionAPI.getResults result:', result);
    return result;
  },

  /**
   * Cancel execution
   */
  cancel: async (id: string) => {
    console.log('🔶 executionAPI.cancel called with id:', id);
    const result = await fetchAPI<void>(`/api/executions/${id}/cancel`, {
      method: 'POST',
    });
    console.log('🔶 executionAPI.cancel result:', result);
    return result;
  },
};

/**
 * Utility function to check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Utility function to get auth header
 */
export function getAuthHeader(): string | null {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
}
