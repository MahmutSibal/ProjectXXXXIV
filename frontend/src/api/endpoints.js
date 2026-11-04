/**
 * Backend adresleri arasında otomatik geçiş (failover).
 *
 * Ana sunucu VITE_API_BASE_URL, yedekler VITE_API_FALLBACK_URLS (virgülle ayrılmış)
 * ile verilir. Hepsi AYNI veritabanına bağlıdır; hangisine gidildiği veri açısından
 * fark etmez, yalnızca hangisinin ayakta olduğu önemlidir.
 *
 * Kurallar:
 * - Her zaman ana sunucu tercih edilir. Yedekteyken ana sunucu 30 sn'de bir
 *   yoklanır ve ayağa kalkınca geri dönülür. Bütün tarayıcılar aynı kuralı
 *   izlediği için kısa sürede hepsi aynı sunucuda buluşur — bu önemli, çünkü
 *   canlı sipariş bildirimi (SignalR) yalnızca aynı sunucuya bağlı ekranlara ulaşır.
 * - Geçiş kararı tahmine değil /api/health yoklamasına dayanır.
 * - Veri DEĞİŞTİREN istekler (sipariş, ödeme...) bağlantı koptuğunda yedekte
 *   KENDİLİĞİNDEN tekrar gönderilmez: ana sunucu isteği işleyip yanıtı
 *   gönderemeden düşmüş olabilir; tekrar göndermek çift sipariş / çift ödeme
 *   demektir. Sonraki istekler zaten yedeğe gider; kullanıcı sonucu kontrol edip
 *   tekrar dener.
 */

const PRIMARY = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5021/api';
const FALLBACKS = (import.meta.env.VITE_API_FALLBACK_URLS ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const BASES = [...new Set([PRIMARY, ...FALLBACKS].map((url) => url.replace(/\/+$/, '')))];

const STORAGE_KEY = 'sukran_api_active';
const HEALTH_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 20000;
const PRIMARY_PROBE_INTERVAL_MS = 30000;

/** IIS'in "uygulamaya ulaşamadım" yanıtları: istek uygulamaya hiç varmamıştır. */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

/**
 * Tekrar gönderilmesi zararsız POST'lar. Giriş ve token yenileme veri üretmez
 * (en kötü ihtimalle fazladan bir oturum kaydı oluşur); sunucu düştüğünde
 * kullanıcının yeniden giriş yapmak zorunda kalmaması için tekrar denenir.
 */
const SAFE_TO_RETRY_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/qr-session']);

let activeIndex = loadActiveIndex();
let switching = null;
let probeTimer = null;
const listeners = new Set();

function loadActiveIndex() {
  try {
    const index = BASES.indexOf(localStorage.getItem(STORAGE_KEY));
    return index >= 0 ? index : 0;
  } catch {
    return 0;
  }
}

/** Şu an kullanılan API taban adresi (ör. "https://mahmutapp.tryasp.net/api"). */
export function getApiBase() {
  return BASES[activeIndex];
}

/** Aktif adres değiştiğinde çağrılır (canlı bağlantıyı yeni sunucuya taşımak için). */
export function onApiBaseChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setActive(index) {
  if (index === activeIndex) return;

  activeIndex = index;
  try {
    // Yeni sekme açıldığında ölü sunucuyu bekleyip zaman kaybetmesin.
    if (index === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, BASES[index]);
  } catch {
    // Depolama kapalıysa geçiş yine bu sekmede geçerli.
  }

  schedulePrimaryProbe();
  listeners.forEach((listener) => listener(BASES[index]));
}

async function isHealthy(base) {
  try {
    const response = await fetch(`${base}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function schedulePrimaryProbe() {
  if (activeIndex === 0) {
    clearInterval(probeTimer);
    probeTimer = null;
    return;
  }

  if (probeTimer) return;

  probeTimer = setInterval(async () => {
    if (activeIndex !== 0 && (await isHealthy(BASES[0]))) {
      setActive(0);
    }
  }, PRIMARY_PROBE_INTERVAL_MS);
}

schedulePrimaryProbe();

/**
 * Bir adres yanıt vermediğinde çağrılır: adresleri öncelik sırasıyla yoklar ve
 * ayakta olan ilkine geçer. Aynı anda gelen hatalar tek taramayı paylaşır.
 *
 * @returns {Promise<string>} Artık kullanılacak adres (değişmediyse aynısı).
 */
export function reportFailure(failedBase) {
  // Başka bir istek geçişi çoktan yaptıysa yeniden taramaya gerek yok.
  if (BASES.length < 2 || failedBase !== getApiBase()) {
    return Promise.resolve(getApiBase());
  }

  if (!switching) {
    switching = (async () => {
      // Düşen adres de yoklanır: hata anlık olabilir, o zaman yerinde kalırız.
      for (let index = 0; index < BASES.length; index += 1) {
        if (await isHealthy(BASES[index])) {
          setActive(index);
          return BASES[index];
        }
      }
      return getApiBase();
    })().finally(() => {
      switching = null;
    });
  }

  return switching;
}

function isGatewayFailure(response) {
  if (!GATEWAY_STATUSES.has(response.status)) return false;

  // Uygulamanın kendi 503'ü (SuperAdmin'in "sunucuyu kapat" ayarı) JSON döner ve
  // iki sunucuda da aynıdır; ona bakıp yedeğe geçmek bir şey değiştirmez.
  // IIS/ANCM'nin "uygulama çalışmıyor" sayfaları ise HTML'dir.
  const contentType = response.headers.get('content-type') ?? '';
  return !contentType.includes('json');
}

export class ServerUnreachableError extends Error {
  constructor() {
    super(
      'Sunucuyla bağlantı koptu ve yedek sunucuya geçildi. İşlemin tamamlanıp ' +
        'tamamlanmadığını kontrol edip gerekirse tekrar deneyin.',
    );
    this.name = 'ServerUnreachableError';
  }
}

/**
 * fetch'in yerine geçer: `${aktif adres}${path}` adresine istek atar, sunucu
 * ulaşılamazsa yedeğe geçer.
 *
 * @param {string} path Taban adresten sonraki kısım, ör. "/orders".
 * @param {RequestInit} init
 * @param {{ retryable?: boolean }} [options] retryable: istek ikinci kez
 *   gönderilirse zararı yok mu? Varsayılan: GET ve giriş uçları için evet.
 */
export async function fetchApi(path, init = {}, { retryable } = {}) {
  const method = (init.method ?? 'GET').toUpperCase();
  const canRetry = retryable ?? (method === 'GET' || SAFE_TO_RETRY_PATHS.has(path));

  // Zaman aşımı yalnızca tekrar gönderilebilen isteklerde: bir ödeme isteğini
  // tarayıcıda kesmek sunucudaki işlemi durdurmaz, sadece sonucunu kaybettirir.
  const send = (base) =>
    fetch(`${base}${path}`, canRetry ? { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) } : init);

  const base = getApiBase();
  let response;

  try {
    response = await send(base);
  } catch (error) {
    const next = await reportFailure(base);
    if (next === base) throw error;
    if (!canRetry) throw new ServerUnreachableError();
    return send(next);
  }

  if (!isGatewayFailure(response)) {
    return response;
  }

  // 502/503: istek uygulamaya hiç ulaşmadı (IIS yanıtladı), her tür istek güvenle
  // tekrarlanır. 504 ise "uygulama geç kaldı" demektir; uygulama isteği işliyor
  // olabilir, bu yüzden veri değiştiren istek tekrar gönderilmez.
  const next = await reportFailure(base);
  if (next === base) return response;
  if (response.status === 504 && !canRetry) throw new ServerUnreachableError();
  return send(next);
}
