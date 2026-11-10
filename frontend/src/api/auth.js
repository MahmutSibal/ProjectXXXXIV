import { api } from './client.js';

export const ROLES = {
  SuperAdmin: 1,
  RestaurantOwner: 2,
  Customer: 4,
  Kitchen: 8,
  Waiter: 16,
};

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }, { auth: false }),
  // Herkese açık kayıt yalnızca müşteri hesabı açar; rol/restoran sunucuda yok sayılır.
  register: ({ name, email, password, phone = null, address = null, marketingConsent = false }) =>
    api.post('/auth/register', { name, email, password, phone, address, marketingConsent }, { auth: false }),
  /** Self-servis işletme kaydı: hesap + restoran + deneme aboneliği tek adımda. */
  registerBusiness: (payload) => api.post('/auth/register-business', payload, { auth: false }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  createQrSession: (restaurantId, tableNo, qrToken) =>
    api.post('/auth/qr-session', { restaurantId, tableNo, qrToken }, { auth: false }),
};
