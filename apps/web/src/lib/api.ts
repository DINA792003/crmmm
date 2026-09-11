import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = '/api/proxy';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse>('/api/auth/login', { email, password }),
  logout: () => api.post<ApiResponse>('/api/auth/logout'),
  me: () => api.get<ApiResponse>('/api/auth/me'),
};

// Lead API
export const leadApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/leads', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/leads/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/leads', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/leads/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/leads/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put<ApiResponse>(`/api/leads/${id}/status`, { status }),
  assign: (id: string, ownerId: string) =>
    api.put<ApiResponse>(`/api/leads/${id}/assign`, { ownerId }),
};

// Contact API
export const contactApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/contacts', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/contacts/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/contacts', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/contacts/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/contacts/${id}`),
};

// Account API
export const accountApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/accounts', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/accounts/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/accounts', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/accounts/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/accounts/${id}`),
};

// Customer API
export const customerApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/customers', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/customers/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/customers', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/customers/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/customers/${id}`),
};

// Site Visit API
export const siteVisitApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/site-visits', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/site-visits/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/site-visits', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/site-visits/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/site-visits/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put<ApiResponse>(`/api/site-visits/${id}/status`, { status }),
};

// Opportunity API
export const opportunityApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/opportunities', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/opportunities/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/opportunities', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/opportunities/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/opportunities/${id}`),
  updateStage: (id: string, stage: string) =>
    api.put<ApiResponse>(`/api/opportunities/${id}/stage`, { stage }),
};

// Quotation API
export const quotationApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/quotations', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/quotations/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/quotations', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/quotations/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/quotations/${id}`),
  submit: (id: string) =>
    api.put<ApiResponse>(`/api/quotations/${id}/submit`),
  approve: (id: string, comments?: string) =>
    api.put<ApiResponse>(`/api/quotations/${id}/approve`, { comments }),
  reject: (id: string, comments?: string) =>
    api.put<ApiResponse>(`/api/quotations/${id}/reject`, { comments }),
};

// Booking API
export const bookingApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/bookings', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/bookings/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/bookings', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/bookings/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/bookings/${id}`),
  confirm: (id: string) =>
    api.put<ApiResponse>(`/api/bookings/${id}/confirm`),
  cancel: (id: string, reason?: string) =>
    api.put<ApiResponse>(`/api/bookings/${id}/cancel`, { reason }),
};

// Payment API
export const paymentApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/payments', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/payments/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/payments', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/payments/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/payments/${id}`),
  verify: (id: string) =>
    api.put<ApiResponse>(`/api/payments/${id}/verify`),
  reject: (id: string, reason?: string) =>
    api.put<ApiResponse>(`/api/payments/${id}/reject`, { reason }),
};

// Project API
export const projectApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/projects', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/projects/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/projects', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/projects/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/projects/${id}`),
};

// Unit API
export const unitApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/units', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/units/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/units', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/units/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/units/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put<ApiResponse>(`/api/units/${id}/status`, { status }),
};

// Task API
export const taskApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/tasks', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/tasks/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/tasks', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/tasks/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/tasks/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put<ApiResponse>(`/api/tasks/${id}/status`, { status }),
  getMy: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/tasks/my', { params }),
};

// Follow-up API
export const followUpApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/follow-ups', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/follow-ups/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/follow-ups', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/follow-ups/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/follow-ups/${id}`),
  complete: (id: string) =>
    api.put<ApiResponse>(`/api/follow-ups/${id}/complete`),
  reopen: (id: string) =>
    api.put<ApiResponse>(`/api/follow-ups/${id}/reopen`),
};

// Activity API
export const activityApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/activities', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/activities/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/activities', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/activities/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/activities/${id}`),
};

// Report API
export const reportApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/reports', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/reports/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/reports', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/reports/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/reports/${id}`),
  execute: (id: string, params?: Record<string, any>) =>
    api.post<ApiResponse>(`/api/reports/${id}/execute`, params),
};

// Dashboard API
export const dashboardApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/dashboards', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/dashboards/${id}`),
  getDefault: () =>
    api.get<ApiResponse>('/api/dashboards/default'),
  create: (data: any) =>
    api.post<ApiResponse>('/api/dashboards', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/dashboards/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/dashboards/${id}`),
  getWidgetData: (id: string, widgetId: string) =>
    api.get<ApiResponse>(`/api/dashboards/${id}/widgets/${widgetId}/data`),
};

// Search API
export const searchApi = {
  search: (query: string, params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/search', { params: { q: query, ...params } }),
  quick: (query: string) =>
    api.get<ApiResponse>('/api/search/quick', { params: { q: query } }),
};

// Analytics API
export const analyticsApi = {
  getLeads: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/analytics/leads', { params }),
  getOpportunities: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/analytics/opportunities', { params }),
  getBookings: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/analytics/bookings', { params }),
  getPayments: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/analytics/payments', { params }),
  getProjects: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/analytics/projects', { params }),
  getPipeline: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/analytics/pipeline', { params }),
};

// AI API
export const aiApi = {
  chat: (message: string, conversationId?: string) =>
    api.post<ApiResponse>('/api/ai/chat', { message, conversation_id: conversationId }),
  getConversation: (id: string) =>
    api.get<ApiResponse>(`/api/ai/conversations/${id}`),
  listConversations: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/ai/conversations', { params }),
  deleteConversation: (id: string) =>
    api.delete<ApiResponse>(`/api/ai/conversations/${id}`),
};

// User API
export const userApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/users', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/users/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/users', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/users/${id}`, data),
  deactivate: (id: string) =>
    api.put<ApiResponse>(`/api/users/${id}/deactivate`),
  activate: (id: string) =>
    api.put<ApiResponse>(`/api/users/${id}/activate`),
};

// Role API
export const roleApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/roles', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/roles/${id}`),
  create: (data: any) =>
    api.post<ApiResponse>('/api/roles', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/roles/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/api/roles/${id}`),
};

// Notification API
export const notificationApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/notifications', { params }),
  markRead: (id: string) =>
    api.put<ApiResponse>(`/api/notifications/${id}/read`),
  markAllRead: () =>
    api.put<ApiResponse>('/api/notifications/read-all'),
  getUnreadCount: () =>
    api.get<ApiResponse>('/api/notifications/unread-count'),
  clearAll: () =>
    api.delete<ApiResponse>('/api/notifications/clear-all'),
};

// Audit API
export const auditApi = {
  list: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/audit', { params }),
  get: (id: string) =>
    api.get<ApiResponse>(`/api/audit/${id}`),
  getByObject: (type: string, objectId: string) =>
    api.get<ApiResponse>(`/api/audit/object/${type}/${objectId}`),
  getByUser: (userId: string) =>
    api.get<ApiResponse>(`/api/audit/user/${userId}`),
  getSummary: (params?: Record<string, any>) =>
    api.get<ApiResponse>('/api/audit/summary', { params }),
};

export default api;
