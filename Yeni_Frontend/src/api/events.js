import { api } from './client.js';

export const eventsApi = {
  getAll: () => api.get('/events'),
  create: (payload) => api.post('/events', payload),
  update: (eventId, payload) => api.put(`/events/${eventId}`, payload),
  remove: (eventId) => api.delete(`/events/${eventId}`),
};
