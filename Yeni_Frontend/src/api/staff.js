import { api } from './client.js';

export const staffApi = {
  getAll: () => api.get('/staff'),
  create: (payload) => api.post('/staff', payload),
  setStatus: (userId, isActive) => api.put(`/staff/${userId}/status`, { isActive }),
  remove: (userId) => api.delete(`/staff/${userId}`),
};
