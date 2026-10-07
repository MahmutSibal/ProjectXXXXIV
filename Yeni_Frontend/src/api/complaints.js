import { api } from './client.js';

export const complaintsApi = {
  getAll: () => api.get('/complaints'),
  create: (payload) => api.post('/complaints', payload),
  update: (complaintId, payload) => api.put(`/complaints/${complaintId}`, payload),
};
