import { api } from './client.js';

const captchaHeaders = (token) => (token ? { 'X-Turnstile-Token': token } : {});

export const ROLES = {
  SuperAdmin: 1,
  RestaurantOwner: 2,
  Customer: 4,
  Kitchen: 8,
  Waiter: 16,
};

export const authApi = {
  // captchaToken: robot doğrulaması jetonu (doğrulama kapalıysa boş).
  login: (email, password, captchaToken) =>
    api.post('/auth/login', { email, password }, { auth: false, headers: captchaHeaders(captchaToken) }),
  // Herkese açık kayıt yalnızca müşteri hesabı açar; rol/restoran sunucuda yok sayılır.
  register: ({ name, email, password, phone = null, address = null, marketingConsent = false }, captchaToken) =>
    api.post('/auth/register', { name, email, password, phone, address, marketingConsent }, { auth: false, headers: captchaHeaders(captchaToken) }),
  /** Self-servis işletme kaydı: hesap + restoran + deneme aboneliği tek adımda. */
  registerBusiness: (payload, captchaToken) =>
    api.post('/auth/register-business', payload, { auth: false, headers: captchaHeaders(captchaToken) }),
  /** Robot doğrulaması açık mı ve site anahtarı: { enabled, siteKey }. */
  getHumanVerification: () => api.get('/auth/human-verification', { auth: false }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  createQrSession: (restaurantId, tableNo, qrToken) =>
    api.post('/auth/qr-session', { restaurantId, tableNo, qrToken }, { auth: false }),
  // Şifremi unuttum: hesap varsa e-postayla sıfırlama bağlantısı gönderilir (yanıt hep aynı).
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }, { auth: false }),
  // E-postadaki bağlantıdaki anahtarla yeni şifre belirlenir.
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }, { auth: false }),
};
