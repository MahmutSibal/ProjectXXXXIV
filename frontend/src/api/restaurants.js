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
  // Ödemelerin aktarılacağı banka hesabı (IBAN, hesap sahibi) ve masada kart ödemesi.
  getPaymentSettings: (restaurantId) => api.get(`/restaurants/${restaurantId}/payment-settings`),
  updatePaymentSettings: (restaurantId, payload) => api.put(`/restaurants/${restaurantId}/payment-settings`, payload),
  // SuperAdmin: valör (gün) ve platform komisyonu (%).
  updatePayoutTerms: (restaurantId, settlementDays, commissionPercent) =>
    api.put(`/restaurants/${restaurantId}/payout-terms`, { settlementDays, commissionPercent }),
  // Son N günün sipariş adedi, brüt, komisyon ve net tutarı (kuruş).
  getEarnings: (restaurantId, days = 15) => api.get(`/restaurants/${restaurantId}/earnings?days=${days}`),
};

export const tablesApi = {
  getAll: (restaurantId) => api.get(`/restaurants/${restaurantId}/tables`),
  add: (restaurantId, tableNo = null) => api.post(`/restaurants/${restaurantId}/tables`, tableNo ? { tableNo } : {}),
  remove: (restaurantId, tableNo) => api.delete(`/restaurants/${restaurantId}/tables/${tableNo}`),
  openSession: (restaurantId, tableNo) => api.post(`/restaurants/${restaurantId}/tables/${tableNo}/session/open`),
  closeSession: (restaurantId, tableNo) => api.post(`/restaurants/${restaurantId}/tables/${tableNo}/session/close`),
};
