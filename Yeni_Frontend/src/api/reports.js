import { api } from './client.js';

export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getDaily: (date) => api.get(`/reports/daily${date ? `?date=${date}` : ''}`),
};
