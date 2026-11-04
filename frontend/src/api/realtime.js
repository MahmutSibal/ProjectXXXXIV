import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { getTokens } from './client.js';
import { getApiBase, onApiBaseChange, reportFailure } from './endpoints.js';

/**
 * Hub adresini API taban adresinden türetir.
 *
 * API tabanı iki biçimde olabilir: geliştirmede göreli ("/api", Vite proxy'si
 * arkasında), üretimde tam adres ("https://.../api"). Hub ise "/api" altında
 * değil, kökte "/hubs/orders" yolundadır.
 */
export function orderHubUrl(apiBase = getApiBase()) {
  const base = apiBase.replace(/\/api\/?$/, '');
  return `${base}/hubs/orders`;
}

/**
 * Sipariş hub'ına bağlanır.
 *
 * Sunucu tarafında hub [Authorize] ile korunur ve bağlantı, token'daki
 * restaurantId'ye ait gruba OTOMATİK eklenir — istemci hangi restoranı
 * dinleyeceğini seçemez. Bu yüzden burada restoran kimliği göndermiyoruz.
 *
 * Yedek sunucu: aktif API adresi değişirse (bkz. endpoints.js) bağlantı yeni
 * sunucuya taşınır. Bildirim yalnızca aynı sunucuya bağlı ekranlara ulaştığı
 * için eski sunucuda kalmak, siparişlerin mutfağa hiç düşmemesi demek olurdu.
 *
 * @param {object} handlers
 * @param {()=>string} [handlers.getAccessToken] Token kaynağı. Varsayılan personel
 *   oturumudur; QR ile bağlanan müşteri kendi oturumunu (sukran_qr_session) ayrı bir
 *   depoda tuttuğu için oradan okuyan bir işlev geçirir.
 * @param {(order:any)=>void} [handlers.onOrderCreated]
 * @param {(order:any)=>void} [handlers.onOrderUpdated]
 * @param {()=>void} [handlers.onReconnected] Bağlantı koptuğu sürede kaçan
 *   olaylar telafi edilemez; yeniden bağlanınca (ya da başka sunucuya geçince)
 *   listeyi baştan çekmek gerekir.
 * @param {(durum:'connected'|'reconnecting'|'disconnected')=>void} [handlers.onStatusChange]
 * @returns {{ connection: import('@microsoft/signalr').HubConnection, stop: ()=>void }}
 */
export function connectOrderHub({
  getAccessToken = () => getTokens()?.accessToken ?? '',
  onOrderCreated,
  onOrderUpdated,
  onReconnected,
  onStatusChange,
} = {}) {
  let connection = null;
  let stopped = false;

  function build(apiBase) {
    const created = new HubConnectionBuilder()
      .withUrl(orderHubUrl(apiBase), {
        // WebSocket başlık gönderemez; sunucu token'ı access_token sorgu
        // parametresinden okuyacak şekilde yapılandırıldı.
        //
        // Fabrika HER bağlantı denemesinde çağrılır: token yenilenmişse yeniden
        // bağlanma güncel token'la yapılır. Sabit bir değer verilseydi, erişim
        // token'ının ömrü dolduktan sonraki tüm yeniden bağlanmalar 401 alırdı.
        accessTokenFactory: () => getAccessToken() ?? '',
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      // Varsayılan gecikmeler: 0, 2, 10, 30 sn — sonra vazgeçer. Mutfak ekranı
      // gün boyu açık kalır, o yüzden vazgeçmeden denemeye devam etmesini istiyoruz.
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000])
      .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    // Sunucu değişiminde eski bağlantı kapatılırken onun olayları ekranı
    // "bağlantı koptu" durumuna düşürmesin.
    const isCurrent = () => created === connection && !stopped;

    if (onOrderCreated) created.on('orderCreated', onOrderCreated);
    if (onOrderUpdated) created.on('orderUpdated', onOrderUpdated);

    created.onreconnecting(() => {
      if (!isCurrent()) return;
      onStatusChange?.('reconnecting');
      // Mutfak ekranı başka istek atmayabilir; sunucunun düştüğünü buradan da
      // bildiriyoruz. Sunucu ayaktaysa (anlık kopma) adres değişmez.
      reportFailure(apiBase);
    });
    created.onclose(() => {
      if (isCurrent()) onStatusChange?.('disconnected');
    });
    created.onreconnected(() => {
      if (!isCurrent()) return;
      onStatusChange?.('connected');
      onReconnected?.();
    });

    return created;
  }

  function start({ isSwitch }) {
    const apiBase = getApiBase();
    const created = build(apiBase);
    connection = created;

    created
      .start()
      .then(() => {
        if (created !== connection || stopped) return;
        onStatusChange?.('connected');
        if (isSwitch) onReconnected?.();
      })
      .catch(() => {
        if (created !== connection || stopped) return;
        // Bağlantı kurulamadıysa sayfa çalışmaya devam etmeli: veriler zaten
        // normal API isteğiyle yüklendi, yalnızca canlı güncelleme olmaz.
        onStatusChange?.('disconnected');
        reportFailure(apiBase);
      });
  }

  start({ isSwitch: false });

  const unsubscribe = onApiBaseChange(() => {
    if (stopped) return;
    const previous = connection;
    onStatusChange?.('reconnecting');
    start({ isSwitch: true });
    previous?.stop().catch(() => {});
  });

  return {
    get connection() {
      return connection;
    },
    stop: () => {
      stopped = true;
      unsubscribe();
      connection?.off('orderCreated');
      connection?.off('orderUpdated');
      connection?.stop().catch(() => {});
    },
  };
}
