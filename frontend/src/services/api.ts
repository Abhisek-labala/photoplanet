const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('studio_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Session expired
    localStorage.removeItem('studio_token');
    localStorage.removeItem('studio_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Health & Network
  checkHealth: () => fetch('/api/health').then(r => r.json()),
  getNetworkInfo: () => apiRequest('/network-info'),

  // Auth
  login: (credentials: { username: string; password: string }) => 
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  changePassword: (data: any) => apiRequest('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),

  // Users (Admin)
  getUsers: () => apiRequest('/users'),
  createUser: (data: any) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => apiRequest(`/users/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: (params?: { search?: string; includeArchived?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.includeArchived) qs.append('includeArchived', 'true');
    return apiRequest(`/clients?${qs.toString()}`);
  },
  getClient: (id: number) => apiRequest(`/clients/${id}`),
  checkMobile: (mobile: string, excludeId?: number) => {
    const qs = new URLSearchParams({ mobile });
    if (excludeId) qs.append('excludeId', String(excludeId));
    return apiRequest(`/clients/check-mobile?${qs.toString()}`);
  },
  createClient: (data: any) => apiRequest('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: any) => apiRequest(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveClient: (id: number) => apiRequest(`/clients/${id}/archive`, { method: 'POST' }),
  restoreClient: (id: number) => apiRequest(`/clients/${id}/restore`, { method: 'POST' }),

  // Event Types
  getEventTypes: (all?: boolean) => apiRequest(`/event-types${all ? '?all=true' : ''}`),
  createEventType: (data: any) => apiRequest('/event-types', { method: 'POST', body: JSON.stringify(data) }),
  updateEventType: (id: number, data: any) => apiRequest(`/event-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEventType: (id: number) => apiRequest(`/event-types/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (params?: { clientId?: number; status?: string; upcoming?: boolean; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.clientId) qs.append('clientId', String(params.clientId));
    if (params?.status) qs.append('status', params.status);
    if (params?.upcoming) qs.append('upcoming', 'true');
    if (params?.search) qs.append('search', params.search);
    return apiRequest(`/events?${qs.toString()}`);
  },
  getEvent: (id: number) => apiRequest(`/events/${id}`),
  createEvent: (data: any) => apiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: number, data: any) => apiRequest(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: number) => apiRequest(`/events/${id}`, { method: 'DELETE' }),

  // Services
  getServices: (all?: boolean) => apiRequest(`/services${all ? '?all=true' : ''}`),
  createCategory: (data: any) => apiRequest('/services/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) => apiRequest(`/services/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => apiRequest(`/services/categories/${id}`, { method: 'DELETE' }),
  createService: (data: any) => apiRequest('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: number, data: any) => apiRequest(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id: number) => apiRequest(`/services/${id}`, { method: 'DELETE' }),

  // Quotations
  getQuotations: (params?: { search?: string; status?: string; clientId?: number; startDate?: string; endDate?: string; includeArchived?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.status) qs.append('status', params.status);
    if (params?.clientId) qs.append('clientId', String(params.clientId));
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.includeArchived) qs.append('includeArchived', 'true');
    return apiRequest(`/quotations?${qs.toString()}`);
  },
  getQuotation: (id: number) => apiRequest(`/quotations/${id}`),
  createQuotation: (data: any) => apiRequest('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  updateQuotation: (id: number, data: any) => apiRequest(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  duplicateQuotation: (id: number) => apiRequest(`/quotations/${id}/duplicate`, { method: 'POST' }),
  updateQuotationStatus: (id: number, status: string, notes?: string) => 
    apiRequest(`/quotations/${id}/status`, { method: 'POST', body: JSON.stringify({ status, notes }) }),
  convertToBooking: (id: number) => apiRequest(`/quotations/${id}/convert-to-booking`, { method: 'POST' }),
  archiveQuotation: (id: number) => apiRequest(`/quotations/${id}/archive`, { method: 'POST' }),
  deleteQuotation: (id: number) => apiRequest(`/quotations/${id}`, { method: 'DELETE' }),
  getQuotationPdfBlob: async (id: number): Promise<Blob> => {
    const token = localStorage.getItem('studio_token');
    const res = await fetch(`/api/quotations/${id}/pdf`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      throw new Error('Failed to generate PDF on server');
    }
    return res.blob();
  },
  getQuotationPdfUrl: (id: number) => {
    const token = localStorage.getItem('studio_token') || '';
    return `/api/quotations/${id}/pdf?token=${encodeURIComponent(token)}`;
  },

  // Settings
  getPublicSettings: () => fetch('/api/settings/public').then(r => r.json()),
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data: any) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  getReportsSummary: () => apiRequest('/reports/summary'),

  // Audit Logs
  getAuditLogs: (params?: { limit?: number; entity?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.entity) qs.append('entity', params.entity);
    if (params?.search) qs.append('search', params.search);
    return apiRequest(`/audit-logs?${qs.toString()}`);
  },

  // Backup & Restore
  exportJsonUrl: '/api/backup/export-json',
  downloadDbUrl: '/api/backup/download',
  restoreBackup: async (file: File) => {
    const token = localStorage.getItem('studio_token');
    const formData = new FormData();
    formData.append('backupFile', file);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Restore failed');
    return data;
  }
};
