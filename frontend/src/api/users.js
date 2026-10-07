import { api } from './client.js';
import { buildQuery } from './pagination.js';

export const usersApi = {
  // { page, pageSize, search } -> PagedResult<UserResponse>
  getAll: (params = {}) => api.get(`/users${buildQuery(params)}`),
  create: (payload) => api.post('/users', payload),
  updateRole: (userId, role, restaurantId = null) => api.put(`/users/${userId}/role`, { role, restaurantId }),
  resetPassword: (userId, newPassword) => api.put(`/users/${userId}/reset-password`, { newPassword }),
  remove: (userId) => api.delete(`/users/${userId}`),
};
