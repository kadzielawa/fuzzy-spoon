/**
 * API client utility for frontend
 * Handles all communication with the Express backend via Next.js proxy
 */

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiCall<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  // Get user ID from localStorage
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (userId) {
    requestHeaders['x-user-id'] = userId;
  }

  const url = `${typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL}/api/${endpoint.replace(/^\//, '')}`;

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

// Typed API methods for convenience
export const api = {
  user: {
    getProfile: () => apiCall('/user/profile'),
    getDeployments: () => apiCall('/user/deployments'),
  },
  templates: {
    list: (category?: string) =>
      apiCall(`/templates${category ? `?category=${category}` : ''}`),
    get: (id: string) => apiCall(`/templates/${id}`),
    preview: (id: string, params: Record<string, any>) =>
      apiCall(`/templates/${id}/preview`, { body: params }),
  },
  deployments: {
    create: (data: any) =>
      apiCall('/deployments', { method: 'POST', body: data }),
    get: (id: string) => apiCall(`/deployments/${id}`),
    submit: (id: string) =>
      apiCall(`/deployments/${id}/submit`, { method: 'POST' }),
    approve: (id: string, comment?: string) =>
      apiCall(`/deployments/${id}/approve`, {
        method: 'POST',
        body: { comment },
      }),
    reject: (id: string, reason: string) =>
      apiCall(`/deployments/${id}/reject`, {
        method: 'POST',
        body: { reason },
      }),
  },
  projects: {
    list: () => apiCall('/projects'),
  },
  stats: {
    get: () => apiCall('/stats'),
  },
};

export default api;
