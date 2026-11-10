import { api } from './client.js';

/**
 * WhatsApp ile telefon doğrulama.
 *
 * Akış: send -> kullanıcı WhatsApp'tan gelen 6 haneli kodu girer -> verify
 * verify, kayıt isteğinde gönderilecek tek kullanımlık bir jeton döner.
 */
export const phoneVerificationApi = {
  /** { enabled, whatsApp, email } — hiçbir kanal açık değilse kayıt doğrulamayı atlar. */
  getStatus: () => api.get('/phone-verification/status', { auth: false }),

  // { phone } -> { maskedPhone, expiresInSeconds, resendAfterSeconds }
  send: (phone) =>
    api.post('/phone-verification/send', { phone }, { auth: false }),

  // { phone, code } -> { verificationTicket, ticketExpiresInSeconds }
  verify: (phone, code) =>
    api.post('/phone-verification/verify', { phone, code }, { auth: false }),

  // WhatsApp'ı olmayanlar için e-posta ile doğrulama. Aynı kurallar, aynı jeton.
  // { email } -> { maskedEmail, expiresInSeconds, resendAfterSeconds }
  sendEmail: (email) =>
    api.post('/phone-verification/send-email', { email }, { auth: false }),

  verifyEmail: (email, code) =>
    api.post('/phone-verification/verify-email', { email, code }, { auth: false }),
};

export const whatsAppApi = {
  getStatus: () => api.get('/whatsapp/status'),
  startSession: () => api.post('/whatsapp/session/start'),
  logout: () => api.post('/whatsapp/session/logout'),
};
