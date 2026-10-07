import { api } from './client.js';
import { buildQuery } from './pagination.js';

/**
 * Paket kodları. Sayısal değerler backend'deki SubscriptionPlan enum'u ile
 * AYNI olmalıdır (veritabanında bu değerler saklanır).
 */
export const SubscriptionPlan = {
  Trial: 1,
  Lite: 2,
  Pro: 3,
  Business: 4,
  Enterprise: 5,
};

export const SubscriptionStatus = {
  Trialing: 1,
  Active: 2,
  PastDue: 3,
  Expired: 4,
  Cancelled: 5,
};

export const SUBSCRIPTION_STATUS_LABEL = {
  [SubscriptionStatus.Trialing]: 'Deneme Sürümü',
  [SubscriptionStatus.Active]: 'Aktif',
  [SubscriptionStatus.PastDue]: 'Ödeme Gecikti',
  [SubscriptionStatus.Expired]: 'Süresi Doldu',
  [SubscriptionStatus.Cancelled]: 'İptal Edildi',
};

/** Dönem seçimi. Yıllık indirim oranını backend bildirir, burada sabitlenmez. */
export const BILLING_MONTHLY = 1;
export const BILLING_ANNUAL = 12;

/**
 * Paket ve fiyat bilgisi YALNIZCA backend'den gelir; bu dosyada fiyat tutulmaz.
 * Frontend'de sabit fiyat tutmak, backend fiyatı değiştiğinde kullanıcıya yanlış
 * tutar göstermeye ve ödeme ekranıyla çelişmeye yol açar.
 */
export const subscriptionsApi = {
  getPlans: () => api.get('/subscriptions/plans', { auth: false }),

  /** Seçilen paket + dönem için ödenecek tutarı sunucuya hesaplatır. */
  getQuote: (plan, billingPeriodMonths) =>
    api.get(`/subscriptions/quote${buildQuery({ plan, billingPeriodMonths })}`, { auth: false }),

  getByRestaurant: (restaurantId) => api.get(`/subscriptions/restaurant/${restaurantId}`),

  /**
   * Otomatik yenileme kartını tanımlar. Bu istekte TAHSİLAT YAPILMAZ.
   * Kart numarası sunucuda saklanmaz; ödeme sağlayıcısına gönderilip
   * dönen referanslar tutulur.
   */
  saveCard: (restaurantId, payload) => api.put(`/subscriptions/restaurant/${restaurantId}/card`, payload),
  getAll: () => api.get('/subscriptions'),
  changePlan: (restaurantId, payload) => api.post(`/subscriptions/restaurant/${restaurantId}/plan`, payload),
  cancel: (restaurantId) => api.post(`/subscriptions/restaurant/${restaurantId}/cancel`),
  extend: (restaurantId, payload) => api.post(`/subscriptions/restaurant/${restaurantId}/extend`, payload),
};
