import { api } from './client.js';

export const customerCardsApi = {
  getMine: () => api.get('/customercards/me'),
  create: (payload) => api.post('/customercards', payload),
  verify: (payload) => api.post('/customercards/verify', payload),
  remove: (customerCardId) => api.delete(`/customercards/${customerCardId}`),
};
