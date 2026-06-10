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

  // Get user ID from localStorage, fallback to default user if not found
  let userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  // Fallback to default user if no userId in localStorage
  if (!userId) {
    userId = 'user-123'; // Default to Alice for development
    console.warn('[apiCall] No userId in localStorage, using default user-123');
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Always send user ID
  if (userId) {
    requestHeaders['x-user-id'] = userId;
  }

  const url = `${typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL}/api/${endpoint.replace(/^\//, '')}`;
  
  console.log(`[apiCall] ${method} ${url}`);
  console.log(`[apiCall] UserId: ${userId}`);
  console.log(`[apiCall] Headers:`, requestHeaders);
  if (body) console.log(`[apiCall] Body:`, body);

  try {
    console.log(`[apiCall] Sending fetch request to: ${url}`);
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`[apiCall] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[apiCall] Error response body:`, errorText);
      console.error(`[apiCall] Full error - Status: ${response.status}, UserId: ${userId}, Endpoint: ${endpoint}`);
      
      // Better error messages
      if (response.status === 401 || response.status === 404) {
        throw new Error(`Authentication failed: Invalid or missing user (${response.status}). Try logging in again.`);
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[apiCall] Response received successfully`);
    return data;
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
    patterns: {
      submit: (payload: any) =>
        apiCall('/deployments/patterns/submit', {
          method: 'POST',
          body: payload,
        }),
      execute: (deploymentId: string) =>
        apiCall(`/deployments/patterns/${deploymentId}/execute`, {
          method: 'POST',
        }),
      terraform: {
        getMetadata: (deploymentId: string) =>
          apiCall(`/deployments/${deploymentId}/terraform`),
        getMainTf: (deploymentId: string): Promise<string> =>
          fetch(`/api/deployments/${deploymentId}/terraform/main`, {
            headers: {
              'x-user-id': typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '',
            },
          }).then(r => r.text()),
        getVariablesTf: (deploymentId: string): Promise<string> =>
          fetch(`/api/deployments/${deploymentId}/terraform/variables`, {
            headers: {
              'x-user-id': typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '',
            },
          }).then(r => r.text()),
        getTfvars: (deploymentId: string): Promise<string> =>
          fetch(`/api/deployments/${deploymentId}/terraform/tfvars`, {
            headers: {
              'x-user-id': typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '',
            },
          }).then(r => r.text()),
        downloadFile: (deploymentId: string, fileType: 'main' | 'variables' | 'tfvars') => {
          const fileName = fileType === 'main' ? 'main.tf' : fileType === 'variables' ? 'variables.tf' : 'terraform.tfvars';
          return fetch(`/api/deployments/${deploymentId}/terraform/${fileType}`, {
            headers: {
              'x-user-id': typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '',
            },
          })
            .then(r => r.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            });
        },
      },
    },
  },
  projects: {
    list: () => apiCall('/projects'),
  },
  patternDeployments: {
    list: () => apiCall('/pattern-deployments'),
    get: (id: string) => apiCall(`/pattern-deployments/${id}`),
  },
  stats: {
    get: () => apiCall('/stats'),
  },
  catalogs: {
    patterns: {
      list: (filters?: { tag?: string; domain?: string; lifecycle?: string; search?: string }) => {
        const params = new URLSearchParams();
        if (filters?.tag) params.append('tag', filters.tag);
        if (filters?.domain) params.append('domain', filters.domain);
        if (filters?.lifecycle) params.append('lifecycle', filters.lifecycle);
        if (filters?.search) params.append('search', filters.search);
        
        return apiCall(`/catalogs/patterns${params.toString() ? '?' + params.toString() : ''}`);
      },
      get: (id: string) => apiCall(`/catalogs/patterns/${id}`),
      tags: () => apiCall('/catalogs/patterns/tags/all'),
      domains: () => apiCall('/catalogs/patterns/domains/all'),
      lifecycles: () => apiCall('/catalogs/patterns/lifecycles/all'),
      blocks: (patternId: string) => apiCall(`/catalogs/patterns/${patternId}/blocks`),
    },
    buildingBlocks: {
      list: () => apiCall('/catalogs/building-blocks'),
      get: (id: string) => apiCall(`/catalogs/building-blocks/${id}`),
      variables: (id: string) => apiCall(`/catalogs/building-blocks/${id}/variables`),
    },
  },
};
