import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 
           (process.env.NODE_ENV === 'production' 
             ? 'https://autocure-backend.onrender.com/api' 
             : 'http://localhost:5001/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('autocure_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('autocure_token');
      localStorage.removeItem('autocure_user');
      
      // Only show error if we're not on login/register pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// API response interface
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/auth/login', credentials),
  
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/auth/register', userData),
  
  getProfile: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/auth/me'),
  
  updateProfile: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/auth/profile', data),
  
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/auth/password', data),
  
  logout: (): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/auth/logout'),
};

// Vehicles API
export const vehiclesAPI = {
  getVehicles: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    ownerId?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/vehicles', { params }),
  
  getVehicle: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/vehicles/${id}`),
  
  createVehicle: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/vehicles', data),
  
  updateVehicle: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/vehicles/${id}`, data),
  
  addServiceHistory: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/vehicles/${id}/service-history`, data),
  
  addDiagnosticHistory: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/vehicles/${id}/diagnostic-history`, data),
  
  getVehiclesDue: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/vehicles/due/service'),
};

// Appointments API
export const appointmentsAPI = {
  getAppointments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/appointments', { params }),
  
  getAppointment: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/appointments/${id}`),
  
  createAppointment: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/appointments', data),
  
  updateAppointmentStatus: (id: string, data: {
    status: string;
    notes?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/appointments/${id}/status`, data),
  
  rescheduleAppointment: (id: string, data: {
    appointmentDate: string;
    appointmentTime: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/appointments/${id}/reschedule`, data),
  
  cancelAppointment: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/appointments/${id}`),
};

// Services API
export const servicesAPI = {
  getServices: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    popular?: boolean;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/services', { params }),
  
  getService: (id: string, vehicleId?: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/services/${id}`, { params: vehicleId ? { vehicleId } : {} }),
  
  getServiceCategories: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/services/categories'),
  
  getPopularServices: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/services/popular'),
  
  getServicesByCategory: (category: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/services/category/${category}`),
};

// AI API
export const aiAPI = {
  chat: (data: {
    message: string;
    sessionId?: string;
    context?: {
      appointmentId?: string;
      vehicleId?: string;
    };
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/ai/chat', data),
  
  getChatHistory: (sessionId: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/ai/chat/${sessionId}`),
  
  explainDiagnostic: (data: {
    code: string;
    vehicleId?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/ai/diagnostic/explain', data),
  
  getRecommendations: (data: {
    vehicleId: string;
    symptoms?: string[];
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/ai/recommendations', data),
  
  getStatus: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/ai/status'),
};

// Diagnostics API
export const diagnosticsAPI = {
  scanVehicle: (vehicleId: string, data?: {
    equipment?: string;
    technician?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/diagnostics/scan/${vehicleId}`, data),
  
  explainCode: (code: string, vehicleId?: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/diagnostics/explain/${code}`, { params: vehicleId ? { vehicleId } : {} }),
  
  generateReport: (vehicleId: string, data?: {
    includeHistory?: boolean;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/diagnostics/report/${vehicleId}`, data),
  
  getHistory: (vehicleId: string, limit?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/diagnostics/history/${vehicleId}`, { params: limit ? { limit } : {} }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/stats'),
  
  getRecentAppointments: (limit?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/recent-appointments', { params: limit ? { limit } : {} }),
  
  getUpcomingAppointments: (limit?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/upcoming-appointments', { params: limit ? { limit } : {} }),
  
  getVehiclesDue: (limit?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/vehicles-due', { params: limit ? { limit } : {} }),
  
  getAppointmentAnalytics: (days?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/analytics/appointments', { params: days ? { days } : {} }),
  
  getServiceAnalytics: (days?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/analytics/services', { params: days ? { days } : {} }),
  
  getCustomerAnalytics: (days?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/dashboard/analytics/customers', { params: days ? { days } : {} }),
};

// Customers API
export const customersAPI = {
  getCustomers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/customers', { params }),
  
  getCustomer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/customers/${id}`),
};

// Invoices API
export const invoicesAPI = {
  getInvoices: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/invoices', { params }),
  
  getInvoice: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/invoices/${id}`),
  
  createInvoice: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/invoices', data),
  
  updateInvoiceStatus: (id: string, data: {
    status: string;
    paymentMethod?: string;
    paymentDate?: string;
  }): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/invoices/${id}/status`, data),
  
  sendInvoice: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/invoices/${id}/send`),
  
  getInvoiceSummary: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/invoices/summary/stats'),
};

export default api;