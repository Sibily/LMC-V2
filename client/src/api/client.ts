const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('buzzrdesk_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('buzzrdesk_token', token);
  } else {
    localStorage.removeItem('buzzrdesk_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any; settings: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ user: any; settings: any }>('/auth/me'),
    updateSettings: (settings: { viewMode?: string; customShortcut?: any }) =>
      request('/auth/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  },

  // Users
  users: {
    list: () => request<any[]>('/users'),
    create: (data: { name: string; email: string; password: string; role?: string }) =>
      request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; email?: string; password?: string; role?: string }) =>
      request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateRole: (id: string, role: string) =>
      request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    delete: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return request<{ avatarUrl: string }>('/users/avatar', {
        method: 'POST',
        body: formData,
      });
    },
  },

  // Clients
  clients: {
    list: () => request<any[]>('/clients'),
    listDeleted: () => request<any[]>('/clients/deleted'),
    get: (id: string) => request<any>(`/clients/${id}`),
    create: (data: any) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/clients/${id}`, { method: 'DELETE' }),
    restore: (id: string) => request(`/clients/${id}/restore`, { method: 'POST' }),
    permanentDelete: (id: string) => request(`/clients/${id}/permanent`, { method: 'DELETE' }),
    addMember: (clientId: string, userId: string, permission: string) =>
      request(`/clients/${clientId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, permission }),
      }),
    removeMember: (clientId: string, userId: string) =>
      request(`/clients/${clientId}/members/${userId}`, { method: 'DELETE' }),

    // Documents
    listDocs: (clientId: string) => request<any[]>(`/clients/${clientId}/docs`),
    addDoc: (clientId: string, data: any) =>
      request(`/clients/${clientId}/docs`, { method: 'POST', body: JSON.stringify(data) }),
    updateDoc: (clientId: string, docId: string, data: any) =>
      request(`/clients/${clientId}/docs/${docId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDoc: (clientId: string, docId: string) =>
      request(`/clients/${clientId}/docs/${docId}`, { method: 'DELETE' }),

    // Invoices
    listInvoices: (clientId: string) => request<any[]>(`/clients/${clientId}/invoices`),
    createInvoice: (clientId: string, data: any) =>
      request(`/clients/${clientId}/invoices`, { method: 'POST', body: JSON.stringify(data) }),
    updateInvoice: (clientId: string, invId: string, data: any) =>
      request(`/clients/${clientId}/invoices/${invId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteInvoice: (clientId: string, invId: string) =>
      request(`/clients/${clientId}/invoices/${invId}`, { method: 'DELETE' }),
  },

  // Services
  services: {
    create: (clientId: string, data: any) =>
      request(`/services/client/${clientId}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/services/${id}`, { method: 'DELETE' }),
    updateStage: (id: string, data: any) =>
      request(`/services/${id}/stage`, { method: 'POST', body: JSON.stringify(data) }),
    decide: (id: string, data: any) =>
      request(`/services/${id}/decide`, { method: 'POST', body: JSON.stringify(data) }),
    customizePipeline: (id: string, stagesConfig: any[]) =>
      request(`/services/${id}/pipeline`, {
        method: 'PUT',
        body: JSON.stringify({ stagesConfig }),
      }),
    getCatalog: () => request<string[]>('/services/catalog'),
    addCatalog: (name: string, category?: string) =>
      request('/services/catalog', { method: 'POST', body: JSON.stringify({ name, category }) }),
  },

  // Tasks
  tasks: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/tasks${query}`);
    },
    create: (data: any) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggle: (id: string, doneNote?: string) =>
      request(`/tasks/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ doneNote }),
      }),
    delete: (id: string) => request(`/tasks/${id}`, { method: 'DELETE' }),
  },

  // Notes
  notes: {
    list: (clientId?: string) => {
      const query = clientId ? `?clientId=${clientId}` : '';
      return request<any[]>(`/notes${query}`);
    },
    create: (data: any) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/notes/${id}`, { method: 'DELETE' }),
  },

  // Communications
  comms: {
    list: (clientId: string) => request<any[]>(`/comms/client/${clientId}`),
    create: (clientId: string, data: any) =>
      request(`/comms/client/${clientId}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/comms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/comms/${id}`, { method: 'DELETE' }),
  },

  // Reports
  reports: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/reports${query}`);
    },
    submit: (data: any) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
    acknowledge: (id: string) => request<any>(`/reports/${id}/acknowledge`, { method: 'POST' }),
  },

  // Chat
  chat: {
    getChats: () => request<any[]>('/chat/chats'),
    getMessages: (chatId: string) => request<any[]>(`/chat/messages/${encodeURIComponent(chatId)}`),
    sendMessage: (data: any) => request('/chat/messages', { method: 'POST', body: JSON.stringify(data) }),
    createGroup: (name: string, memberIds: string[]) =>
      request('/chat/groups', { method: 'POST', body: JSON.stringify({ name, memberIds }) }),
    broadcast: (data: any) => request('/chat/broadcast', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (chatId: string) =>
      request(`/chat/messages/${encodeURIComponent(chatId)}/read`, { method: 'POST' }),
    uploadAttachment: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload attachment');
      }
      return res.json() as Promise<{ url: string; name: string; type: string; size?: number }>;
    },
  },

  // Notifications
  notifs: {
    list: (params?: { viewMode?: string }) =>
      request<any[]>(params?.viewMode ? `/notifs?viewMode=${encodeURIComponent(params.viewMode)}` : '/notifs'),
    create: (data: any) => request('/notifs', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string) => request(`/notifs/${id}/read`, { method: 'POST' }),
    markAllRead: (data?: { ids?: string[] }) =>
      request('/notifs/read-all', { method: 'POST', body: JSON.stringify(data || {}) }),
    clearAll: () => request('/notifs/clear-all', { method: 'POST' }),
  },

  // Pipelines
  pipelines: {
    getDefault: () => request<any>('/pipelines/default'),
    updateDefault: (stagesConfig: any[]) =>
      request('/pipelines/default', { method: 'PUT', body: JSON.stringify({ stagesConfig }) }),
  },
};
