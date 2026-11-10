import { useEffect, useRef, useState } from 'react';
import { connectOrderHub } from '../api/realtime.js';

/**
 * Sipariş ekranlarını canlı tutar.
 *
 * Gelen olayı listeye doğrudan EKLEMİYORUZ, yalnızca "yeniden yükle" sinyali
 * olarak kullanıyoruz. Sunucu hub üzerinden ham Order varlığını yayınlıyor;
 * ekranların beklediği ise API'nin döndürdüğü DTO biçimi. İkisini birleştirmek
 * sessiz biçim uyuşmazlıklarına yol açardı (eksik alan, farklı isim). Yeniden
 * çekmek bir istek daha maliyetli ama her zaman doğru.
 *
 * @param {object} secenekler
 * @param {boolean} secenekler.enabled Kullanıcı bir restorana bağlı değilse bağlanma.
 * @param {() => Promise<any>|void} secenekler.onChange Listeyi yeniden yükleyen işlev.
 * @param {() => string} [secenekler.getAccessToken] Token kaynağı; QR müşterisi için gerekir.
 * @param {() => Promise<any>|void} [secenekler.onRefundChange] İade talepleri listesini
 *   yeniden yükleyen işlev; aynı hub bağlantısı kullanılır, ikinci bağlantı açılmaz.
 * @returns {{ status: 'connected'|'reconnecting'|'disconnected' }}
 */
export function useOrderRealtime({ enabled, onChange, getAccessToken, onRefundChange }) {
  const [status, setStatus] = useState('disconnected');

  // Callback'i ref'te tutuyoruz: her render'da yeni bir işlev gelse bile
  // bağlantı yeniden kurulmasın. Bağımlılığa konsaydı hub sürekli kapanıp açılırdı.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onRefundChangeRef = useRef(onRefundChange);
  useEffect(() => {
    onRefundChangeRef.current = onRefundChange;
  }, [onRefundChange]);

  const tokenRef = useRef(getAccessToken);
  useEffect(() => {
    tokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    if (!enabled) return undefined;

    // Aynı anda gelen birden fazla olay (ör. bir siparişin üç kaleminin durumu
    // arka arkaya değişirse) tek bir yeniden yüklemeye indirilir.
    let timer = null;
    const yenidenYukle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        Promise.resolve(onChangeRef.current?.()).catch(() => {
          // Yeniden yükleme hatası ekranı bozmasın; bir sonraki olayda tekrar denenir.
        });
      }, 250);
    };

    const { stop } = connectOrderHub({
      ...(tokenRef.current ? { getAccessToken: () => tokenRef.current() } : {}),
      onOrderCreated: yenidenYukle,
      onOrderUpdated: yenidenYukle,
      onRefundRequestChanged: () => {
        Promise.resolve(onRefundChangeRef.current?.()).catch(() => {});
      },
      // Bağlantının koptuğu sürede yayınlanan olaylar geri gelmez; yeniden
      // bağlanınca listeyi baştan çekmek tek doğru telafi.
      onReconnected: () => {
        yenidenYukle();
        Promise.resolve(onRefundChangeRef.current?.()).catch(() => {});
      },
      onStatusChange: setStatus,
    });

    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [enabled]);

  return { status };
}
