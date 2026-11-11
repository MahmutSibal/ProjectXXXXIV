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
  // Ödenecek tutar sunucudan okunur (ödenmiş kalemler düşülmüş hâliyle).
  getById: (billId) => customerApi.get(`/bills/${billId}`),
};

export const customerPaymentsApi = {
  // İşletme kartla ödeme alıyor mu? Kapalıysa ödeme formu hiç gösterilmez.
  getOnlinePaymentStatus: (restaurantId) =>
    apiRequest(`/restaurants/${restaurantId}/online-payment`, { auth: false }),

  // PayTR ile kartla ödeme. Sunucu PayTR'nin güvenli ödeme sayfasını döner; kart
  // bilgisi o sayfada girilir, uygulamamıza ve sunucumuza HİÇ gelmez.
  // { billId, itemIds?, amount?, email, fullName, address, phone, returnPath }
  //   -> { merchantOid, amountMinor, testMode, paymentPageUrl }
  startCardPayment: (payload) => customerApi.post('/paytr/table-payments', payload),
  getCardPayment: (merchantOid) => customerApi.get(`/paytr/payments/${encodeURIComponent(merchantOid)}`),
};

export const customerReviewsApi = {
  // ReviewsController kimlik doğrulaması gerektirir; müşteri tarafında QR oturum token'ı ile çağrılır.
  getByRestaurant: (restaurantId) => customerApi.get(`/reviews/restaurant/${restaurantId}`),
  create: (payload) => customerApi.post('/reviews', payload),
};
