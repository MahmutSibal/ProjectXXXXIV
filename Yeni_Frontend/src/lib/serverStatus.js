const DOWN_EVENT = 'sukran:server-down';

export const SERVER_DOWN_MESSAGE = 'Sunucuya ulaşılamıyor. Lütfen birazdan tekrar deneyin.';

// IIS bakım sayfası (app_offline.htm) 503, ters vekil hataları 502/504 döner.
export function isServerDownStatus(status) {
  return status === 502 || status === 503 || status === 504;
}

export function reportServerDown(reason) {
  window.dispatchEvent(new CustomEvent(DOWN_EVENT, { detail: { reason } }));
}

export function onServerDown(listener) {
  window.addEventListener(DOWN_EVENT, listener);
  return () => window.removeEventListener(DOWN_EVENT, listener);
}

// Sunucunun gerçekten hizmet verip vermediğini sessizce yoklar (api istemcisini kullanmaz; olay döngüsü oluşturmaz).
// /health, Süper Admin sunucuyu kapattığında da 200 döner; bu yüzden durum uç noktasına bakılır.
export async function pingServer(timeoutMs = 8000) {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}/platform-settings/status`, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return false;
    const status = await response.json().catch(() => null);
    return !status?.serverDisabled;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
