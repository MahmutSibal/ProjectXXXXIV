import { apiRequest } from './client.js';
import { customerApi } from './customerClient.js';
import { buildQuery } from './pagination.js';

// QR oturumu açma, personel oturumunu etkilemeyen paylaşılan istemciden (auth:false) gider;
// dönen access token ayrı bir depoya (customerClient) yazılır.
export const qrSessionApi = {
  create: (restaurantId, tableNo, qrToken) =>
    apiRequest('/auth/qr-session', { method: 'POST', body: { restaurantId, tableNo: Number(tableNo), qrToken }, auth: false }),
  validateTable: (restaurantId, tableNo, token) =>
    apiRequest(`/restaurants/${restaurantId}/tables/${tableNo}/session?token=${encodeURIComponent(token)}`, { auth: false }),
};

export const customerMenuApi = {
  getRestaurant: (restaurantId) => apiRequest(`/restaurants/${restaurantId}`, { auth: false }),
  getMenuItems: (restaurantId) => apiRequest(`/menuitems/restaurant/${restaurantId}`, { auth: false }),
  getCategories: (restaurantId) => apiRequest(`/categories/restaurant/${restaurantId}`, { auth: false }),
};

export const customerOrdersApi = {
  create: (payload) => customerApi.post('/orders', payload),
  // Müşteri yalnızca açık oturumdaki siparişleri görür; PagedResult döner.
  getByRestaurant: (restaurantId, params = {}) =>
    customerApi.get(`/orders/restaurant/${restaurantId}${buildQuery(params)}`),
};

export const customerBillsApi = {
  create: (payload) => customerApi.post('/bills', payload),
};

/**
 * QR müşterisinin ödeme kartı. Kart numarası sunucuda SAKLANMAZ; yalnızca
 * özeti, markası ve son 4 hanesi tutulur (CustomerCard).
 */
export const customerCardsApi = {
  create: (payload) => customerApi.post('/customercards', payload),
  getMine: () => customerApi.get('/customercards/me'),
};

export const customerPaymentsApi = {
  splitEqually: (payload) => customerApi.post('/payments/split-equally', payload),
  paySpecificItems: (payload) => customerApi.post('/payments/specific-items', payload),
};

export const customerReviewsApi = {
  // ReviewsController kimlik doğrulaması gerektirir; müşteri tarafında QR oturum token'ı ile çağrılır.
  getByRestaurant: (restaurantId) => customerApi.get(`/reviews/restaurant/${restaurantId}`),
  create: (payload) => customerApi.post('/reviews', payload),
};
