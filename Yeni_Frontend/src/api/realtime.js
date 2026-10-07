import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { getTokens } from './client.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5021/api';

/**
 * Hub adresini API taban adresinden türetir.
 *
 * API tabanı iki biçimde olabilir: geliştirmede göreli ("/api", Vite proxy'si
 * arkasında), üretimde tam adres ("https://.../api"). Hub ise "/api" altında
 * değil, kökte "/hubs/orders" yolundadır.
 */
export function orderHubUrl() {
  const base = API_BASE.replace(/\/api\/?$/, '');
  return `${base}/hubs/orders`;
}

/**
 * Sipariş hub'ına bağlanır.
 *
 * Sunucu tarafında hub [Authorize] ile korunur ve bağlantı, token'daki
 * restaurantId'ye ait gruba OTOMATİK eklenir — istemci hangi restoranı
 * dinleyeceğini seçemez. Bu yüzden burada restoran kimliği göndermiyoruz.
 *
 * @param {object} handlers
 * @param {()=>string} [handlers.getAccessToken] Token kaynağı. Varsayılan personel
 *   oturumudur; QR ile bağlanan müşteri kendi oturumunu (sukran_qr_session) ayrı bir
 *   depoda tuttuğu için oradan okuyan bir işlev geçirir.
 * @param {(order:any)=>void} [handlers.onOrderCreated]
 * @param {(order:any)=>void} [handlers.onOrderUpdated]
 * @param {()=>void} [handlers.onReconnected] Bağlantı koptuğu sürede kaçan
 *   olaylar telafi edilemez; yeniden bağlanınca listeyi baştan çekmek gerekir.
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
  const connection = new HubConnectionBuilder()
    .withUrl(orderHubUrl(), {
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

  if (onOrderCreated) connection.on('orderCreated', onOrderCreated);
  if (onOrderUpdated) connection.on('orderUpdated', onOrderUpdated);

  connection.onreconnecting(() => onStatusChange?.('reconnecting'));
  connection.onclose(() => onStatusChange?.('disconnected'));
  connection.onreconnected(() => {
    onStatusChange?.('connected');
    onReconnected?.();
  });

  connection
    .start()
    .then(() => onStatusChange?.('connected'))
    .catch(() => {
      // Bağlantı kurulamadıysa sayfa çalışmaya devam etmeli: veriler zaten
      // normal API isteğiyle yüklendi, yalnızca canlı güncelleme olmaz.
      onStatusChange?.('disconnected');
    });

  return {
    connection,
    stop: () => {
      connection.off('orderCreated');
      connection.off('orderUpdated');
      connection.stop().catch(() => {});
    },
  };
}
