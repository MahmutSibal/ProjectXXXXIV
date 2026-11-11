import { api, apiRequest } from './client.js';

/** Backend CardPaymentStatus ile aynı. */
export const CardPaymentStatus = Object.freeze({ Pending: 1, Succeeded: 2, Failed: 3 });

export const payTrApi = {
  /** { available, testMode } */
  getStatus: () => apiRequest('/paytr/status', { auth: false }),
  /** İşletme sahibinin paket ödemesi: { restaurantId, plan, billingPeriodMonths, email, returnPath } */
  startSubscriptionPayment: (payload) => api.post('/paytr/subscription-payments', payload),
  getPayment: (merchantOid) => api.get(`/paytr/payments/${encodeURIComponent(merchantOid)}`),
};

/**
 * Kartla ödemeyi PayTR'ye gönderir.
 *
 * Kart bilgileri ve müşterinin adı/adresi/telefonu bir HTML formuna konup DOĞRUDAN
 * PayTR'nin adresine gönderilir; sayfa PayTR'nin 3D Secure ekranına geçer. Bu bilgiler
 * bizim sunucumuza hiç gitmez (PayTR'nin zorunlu kuralı ve PCI DSS gereği).
 *
 * @param {{ postUrl: string, fields: Record<string,string> }} form  Sunucunun döndüğü imzalı alanlar
 * @param {{ holder: string, number: string, month: string, year: string, cvc: string }} card
 * @param {{ fullName: string, address: string, phone: string }} buyer
 */
export function submitCardToPayTr(form, card, buyer) {
  const element = document.createElement('form');
  element.method = 'POST';
  element.action = form.postUrl;
  element.style.display = 'none';

  const values = {
    ...form.fields,
    cc_owner: card.holder.trim().slice(0, 50),
    card_number: card.number.replace(/\D/g, ''),
    expiry_month: String(Number(card.month)),
    // PayTR yılı 2 hane bekler (2030 -> 30).
    expiry_year: String(card.year).slice(-2),
    cvv: card.cvc,
    user_name: buyer.fullName.trim().slice(0, 60),
    user_address: buyer.address.trim().slice(0, 400),
    user_phone: buyer.phone.replace(/[^\d+]/g, '').slice(0, 20),
  };

  for (const [name, value] of Object.entries(values)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value ?? '';
    element.appendChild(input);
  }

  document.body.appendChild(element);
  element.submit();
}

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
