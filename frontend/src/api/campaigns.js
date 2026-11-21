import { api } from './client.js';

/**
 * SuperAdmin kampanya e-postaları. Alıcılar, kampanya iznini (açık rıza) vermiş
 * aktif kullanıcılardır; sayıyı sunucu hesaplar.
 */
export const adminCampaignsApi = {
  list: () => api.get('/admin/campaigns'),
  audience: () => api.get('/admin/campaigns/audience'),
  send: (payload) => api.post('/admin/campaigns', payload),
  sendTest: (payload) => api.post('/admin/campaigns/test', payload),
};

/** E-postadaki imzalı bağlantıdan abonelikten çıkış (giriş gerektirmez). */
export const campaignsApi = {
  unsubscribe: (userId, token) => api.post('/campaigns/unsubscribe', { userId, token }, { auth: false }),
};
