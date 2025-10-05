/**
 * Authenticated API client for workflow management
 * Requires JWT token for all requests
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
 * Authenticated fetch wrapper
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  console.log('fetchWithAuth called:');
  console.log('- Endpoint:', endpoint);
  console.log('- Token from localStorage:', token ? token.substring(0, 20) + '...' : 'null');
  
  if (!token) {
    throw new Error('Authentication required. Please login first.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  
  console.log('- Request URL:', url);
  console.log('- Authorization header:', headers.Authorization.substring(0, 30) + '...');
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: response.statusText 
    }));
    
    // Handle specific error cases
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      throw new Error('Authentication expired. Please login again.');
    } else if (response.status === 403) {
      throw new Error(error.error || 'Permission denied');
    } else if (response.status === 404) {
      throw new Error('Resource not found');
    }
    
    throw new Error(error.error || `API error: ${response.status}`);
  }

  const json = await response.json();
  
  // Auto-unwrap { success: true, data: {...} } responses
  if (json.success && json.data !== undefined) {
    return json.data;
  }
  
  return json;
}

/**
 * Workflow API with authentication
 */
export const workflowAuthAPI = {
  /**
   * List workflows (user's own workflows or all if admin)
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
    return fetchWithAuth<any>(`/api/workflows${query ? `?${query}` : ''}`);
  },

  /**
   * Get workflow by ID
   */
  get: async (id: string) => {
    return fetchWithAuth<any>(`/api/workflows/${id}`);
  },

  /**
   * Create new workflow
   */
  create: async (data: any) => {
    return fetchWithAuth<any>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update workflow
   */
  update: async (id: string, data: any) => {
    return fetchWithAuth<any>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete workflow
   */
  delete: async (id: string) => {
    return fetchWithAuth<void>(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Execute workflow
   */
  execute: async (id: string, options?: any) => {
    return fetchWithAuth<any>(`/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  /**
   * Get workflow statistics
   */
  getStats: async (id: string) => {
    return fetchWithAuth<any>(`/api/workflows/${id}/stats`);
  },
};

/**
 * User API
 */
export const userAuthAPI = {
  /**
   * Get current user profile
   */
  getProfile: async () => {
    return fetchWithAuth<any>('/api/users/profile');
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: any) => {
    return fetchWithAuth<any>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Execution API with authentication
 */
export const executionAuthAPI = {
  /**
   * List executions
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
    return fetchWithAuth<any>(`/api/executions${query ? `?${query}` : ''}`);
  },

  /**
   * Get execution by ID
   */
  get: async (id: string) => {
    return fetchWithAuth<any>(`/api/executions/${id}`);
  },

  /**
   * Get execution results
   */
  getResults: async (id: string) => {
    return fetchWithAuth<any>(`/api/executions/${id}/results`);
  },

  /**
   * Cancel execution
   */
  cancel: async (id: string) => {
    return fetchWithAuth<void>(`/api/executions/${id}/cancel`, {
      method: 'POST',
    });
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