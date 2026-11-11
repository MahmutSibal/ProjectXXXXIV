import { apiRequest } from './client.js';

/** Sitedeki iletişim formu (giriş gerektirmez). Talep Süper Admin → Destek'e düşer. */
export const contactApi = {
  submit: (payload) => apiRequest('/contact', { method: 'POST', body: payload, auth: false }),
};
