import { api } from './client.js';

export const menuItemsApi = {
  getByRestaurant: (restaurantId) => api.get(`/menuitems/restaurant/${restaurantId}`, { auth: false }),
  getById: (menuItemId) => api.get(`/menuitems/${menuItemId}`, { auth: false }),
  create: (payload) => api.post('/menuitems', payload),
  update: (menuItemId, payload) => api.put(`/menuitems/${menuItemId}`, payload),
  remove: (menuItemId) => api.delete(`/menuitems/${menuItemId}`),
  setAvailability: (menuItemId, isAvailable) => api.put(`/menuitems/${menuItemId}/availability`, { isAvailable }),
};
