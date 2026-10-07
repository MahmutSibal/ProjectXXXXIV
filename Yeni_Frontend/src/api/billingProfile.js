import { api } from './client.js';

/**
 * Fatura ve kimlik bilgileri.
 *
 * T.C. kimlik ve MERSİS numaraları sunucudan YALNIZCA MASKELİ döner
 * (maskedNationalId / maskedMersisNumber). Kaydederken bu alanlar boş
 * bırakılırsa mevcut değer korunur — kullanıcı numarayı yeniden yazmak
 * zorunda kalmaz.
 */
export const billingProfileApi = {
  get: (restaurantId) => api.get(`/billing-profiles/restaurant/${restaurantId}`),
  save: (restaurantId, payload) => api.put(`/billing-profiles/restaurant/${restaurantId}`, payload),
};
