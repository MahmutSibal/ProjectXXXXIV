import { api, apiRequest } from './client.js';

/** Backend CardPaymentStatus ile aynı. */
export const CardPaymentStatus = Object.freeze({ Pending: 1, Succeeded: 2, Failed: 3 });

export const payTrApi = {
  /** { available, testMode } */
  getStatus: () => apiRequest('/paytr/status', { auth: false }),
  /**
   * İşletme sahibinin paket ödemesi. Kart bilgisi GÖNDERİLMEZ: dönen paymentPageUrl
   * PayTR'nin sayfasıdır, kart orada girilir.
   * { restaurantId, plan, billingPeriodMonths, email, fullName, address, phone, returnPath }
   */
  startSubscriptionPayment: (payload) => api.post('/paytr/subscription-payments', payload),
  getPayment: (merchantOid) => api.get(`/paytr/payments/${encodeURIComponent(merchantOid)}`),
  /** Restoranın kartla alınan ödemeleri (son N gün). */
  listPayments: (restaurantId, days = 30) => api.get(`/paytr/restaurants/${restaurantId}/payments?days=${days}`),
  /** Karta iade (PayTR). amountMinor boşsa kalanın tamamı. */
  refund: (merchantOid, amountMinor, reason) =>
    api.post(`/paytr/payments/${encodeURIComponent(merchantOid)}/refund`, { amountMinor, reason }),
};

/**
 * Ödeme sonrası sayfaya dönüldüğünde (?odeme=...&oid=...) kesin sonucu bekler.
 * PayTR sonucu sunucuya ayrıca bildirir; bildirim birkaç saniye gecikebilir.
 */
export async function waitForCardPayment(getPayment, merchantOid, { attempts = 15, delayMs = 2000 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const payment = await getPayment(merchantOid);
    if (payment?.status !== CardPaymentStatus.Pending) return payment;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { status: CardPaymentStatus.Pending };
}

/** URL'deki ödeme dönüş parametrelerini okur (değiştirmez). */
export function readPaymentReturnParams() {
  const url = new URL(window.location.href);
  const oid = url.searchParams.get('oid');
  const result = url.searchParams.get('odeme');
  if (!oid || !result) return null;
  return { merchantOid: oid, redirectedAsSuccess: result === 'basarili' };
}

/** Ödeme dönüş parametrelerini adres çubuğundan siler (yenilemede tekrar işlenmesin). */
export function clearPaymentReturnParams() {
  window.history.replaceState(null, '', currentReturnPath() + window.location.hash);
}

/** Dönüş yolu: mevcut sayfa, ödeme parametreleri olmadan. */
export function currentReturnPath() {
  const url = new URL(window.location.href);
  url.searchParams.delete('oid');
  url.searchParams.delete('odeme');
  return url.pathname + url.search;
}
