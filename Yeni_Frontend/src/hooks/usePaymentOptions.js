import { useEffect, useState } from 'react';

import { api } from '../api/client.js';

const CACHE_MS = 60_000;

let cached = null;
let cachedAt = 0;
let inflight = null;

// Süper Admin'in ödeme altyapısı anahtarları (iyzico logoları ve online kart ödemesi).
// Alınamazsa mevcut davranış korunur (logolar görünür, kart ödemesi açık sayılır).
function loadPaymentOptions() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return Promise.resolve(cached);

  if (!inflight) {
    inflight = api
      .get('/platform-settings/payment-options', { auth: false })
      .then((data) => ({
        showIyzicoLogos: data?.showIyzicoLogos !== false,
        cardPaymentsEnabled: data?.cardPaymentsEnabled !== false,
      }))
      .catch(() => ({ showIyzicoLogos: true, cardPaymentsEnabled: true }))
      .then((value) => {
        cached = value;
        cachedAt = Date.now();
        inflight = null;
        return value;
      });
  }

  return inflight;
}

export function invalidatePaymentOptions() {
  cached = null;
  cachedAt = 0;
}

// İlk yanıt gelene kadar logolar gizli kalır ki kapalıyken bir an görünüp kaybolmasın.
export default function usePaymentOptions() {
  const [options, setOptions] = useState(cached);

  useEffect(() => {
    let active = true;
    loadPaymentOptions().then((value) => {
      if (active) setOptions(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    ready: Boolean(options),
    showIyzicoLogos: options?.showIyzicoLogos ?? false,
    cardPaymentsEnabled: options?.cardPaymentsEnabled ?? true,
  };
}
