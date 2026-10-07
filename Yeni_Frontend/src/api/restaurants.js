import { api } from './client.js';

export const restaurantsApi = {
  getAll: () => api.get('/restaurants'),
  getById: (restaurantId) => api.get(`/restaurants/${restaurantId}`),
  getBySlug: (slug) => api.get(`/restaurants/by-slug/${slug}`),
  getNearby: (longitude, latitude, maxDistanceMeters = 5000) =>
    api.get(`/restaurants/nearby?longitude=${longitude}&latitude=${latitude}&maxDistanceMeters=${maxDistanceMeters}`, { auth: false }),
  validateTableSession: (restaurantId, tableNo, token) =>
    api.get(`/restaurants/${restaurantId}/tables/${tableNo}/session?token=${encodeURIComponent(token)}`, { auth: false }),
  create: (payload) => api.post('/restaurants', payload),
  update: (restaurantId, payload) => api.put(`/restaurants/${restaurantId}`, payload),
};

export const restaurantPaymentApi = {
  // Sahip / SuperAdmin: sır döndürmez (apiKeyMasked, hasCredentials).
  getPaymentSettings: (restaurantId) => api.get(`/restaurants/${restaurantId}/payment-settings`),
  // Boş apiKey/secretKey = mevcut değeri koru.
  savePaymentSettings: (restaurantId, body) => api.put(`/restaurants/${restaurantId}/payment-settings`, body),
  // Anonim: QR menüde online ödeme açık mı?
  getOnlinePayment: (restaurantId) => api.get(`/restaurants/${restaurantId}/online-payment`, { auth: false }),
};

export const tablesApi = {
  getAll: (restaurantId) => api.get(`/restaurants/${restaurantId}/tables`),
  add: (restaurantId, tableNo = null) => api.post(`/restaurants/${restaurantId}/tables`, tableNo ? { tableNo } : {}),
  remove: (restaurantId, tableNo) => api.delete(`/restaurants/${restaurantId}/tables/${tableNo}`),
  openSession: (restaurantId, tableNo) => api.post(`/restaurants/${restaurantId}/tables/${tableNo}/session/open`),
  closeSession: (restaurantId, tableNo) => api.post(`/restaurants/${restaurantId}/tables/${tableNo}/session/close`),
};
