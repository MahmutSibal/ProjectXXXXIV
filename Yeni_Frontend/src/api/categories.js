import { api } from './client.js';

export const categoriesApi = {
  getByRestaurant: (restaurantId) => api.get(`/categories/restaurant/${restaurantId}`, { auth: false }),
  create: (payload) => api.post('/categories', payload),
  update: (categoryId, payload) => api.put(`/categories/${categoryId}`, payload),
  remove: (categoryId) => api.delete(`/categories/${categoryId}`),
};
