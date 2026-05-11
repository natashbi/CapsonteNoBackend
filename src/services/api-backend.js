const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let authToken = localStorage.getItem('wecare_token');

// Set token on login
const setToken = (token) => {
  authToken = token;
  localStorage.setItem('wecare_token', token);
};

// Get token
const getToken = () => authToken || localStorage.getItem('wecare_token');

// Convert snake_case keys (from Postgres) to camelCase (frontend convention).
// Recursively walks arrays and plain objects; leaves dates/strings/numbers untouched.
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const camelize = (val) => {
  if (Array.isArray(val)) return val.map(camelize);
  if (val && typeof val === 'object' && val.constructor === Object) {
    const out = {};
    for (const k of Object.keys(val)) out[toCamel(k)] = camelize(val[k]);
    return out;
  }
  return val;
};

// API request wrapper
const apiRequest = async (method, endpoint, data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `HTTP error! status: ${response.status}`);
  }

  return camelize(result);
};

export const api = {
  // Auth
  login: (credentials) => apiRequest('POST', '/auth/login', credentials),
  register: (data) => apiRequest('POST', '/auth/register', data),
  changePassword: (data) => apiRequest('POST', '/auth/change-password', data),
  updatePhoto: (photo) => apiRequest('POST', '/auth/update-photo', { photo }),

  // Members
  getMembers: () => apiRequest('GET', '/members'),
  createMember: (data) => apiRequest('POST', '/members', data),
  updateMember: (id, data) => apiRequest('PUT', `/members/${id}`, data),
  deleteMember: (id) => apiRequest('DELETE', `/members/${id}`),
  approveMember: (id) => apiRequest('POST', `/members/${id}/approve`),
  rejectMember: (id, reason) => apiRequest('POST', `/members/${id}/reject`, { reason }),

  // Consultations
  getConsultations: () => apiRequest('GET', '/consultations'),
  createConsultation: (data) => apiRequest('POST', '/consultations', data),
  updateConsultation: (id, data) => apiRequest('PUT', `/consultations/${id}`, data),
  deleteConsultation: (id) => apiRequest('DELETE', `/consultations/${id}`),

  // LOAs
  getLoas: () => apiRequest('GET', '/loas'),
  createLoa: (data) => apiRequest('POST', '/loas', data),
  updateLoa: (id, data) => apiRequest('PUT', `/loas/${id}`, data),
  approveLoa: (id) => apiRequest('POST', `/loas/${id}/approve`),
  rejectLoa: (id, reason) => apiRequest('POST', `/loas/${id}/reject`, { reason }),
  recordLoaVisit: (id, data) => apiRequest('POST', `/loas/${id}/record-visit`, data),

  // SOAs
  getSoas: () => apiRequest('GET', '/soas'),
  createSoa: (data) => apiRequest('POST', '/soas', data),
  reviewSoa: (id) => apiRequest('POST', `/soas/${id}/approve`),
  rejectSoa: (id) => apiRequest('POST', `/soas/${id}/reject`),

  // Users
  getUsers: () => apiRequest('GET', '/users'),
  createUser: (data) => apiRequest('POST', '/users', data),
  updateUser: (id, data) => apiRequest('PUT', `/users/${id}`, data),
  deleteUser: (id) => apiRequest('DELETE', `/users/${id}`),

  // Settings
  getSettings: () => apiRequest('GET', '/settings'),
  updateSettings: (data) => apiRequest('POST', '/settings', data),

  // Notifications
  getNotifications: () => apiRequest('GET', '/notifications'),
  createNotification: (data) => apiRequest('POST', '/notifications', data),
  markNotificationRead: (id) => apiRequest('PUT', `/notifications/${id}/mark-read`),
  markAllNotificationsRead: () => apiRequest('POST', '/notifications/mark-all-read'),
  deleteNotification: (id) => apiRequest('DELETE', `/notifications/${id}`),

  // Audit
  getAudit: () => apiRequest('GET', '/audit'),

  // Auth token management
  setAuthToken: setToken,
  getAuthToken: getToken,
  logout: () => {
    authToken = null;
    localStorage.removeItem('wecare_token');
  }
};
