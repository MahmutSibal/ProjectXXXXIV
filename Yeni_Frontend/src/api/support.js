import { api } from './client.js';

export const supportApi = {
  getAll: () => api.get('/support-requests'),
  create: (payload) => api.post('/support-requests', payload),
  setCalled: (id, isCalled) => api.put(`/support-requests/${id}/called`, { isCalled }),
  remove: (id) => api.delete(`/support-requests/${id}`),
};
