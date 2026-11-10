import { useCallback, useEffect, useState } from 'react';
import { refundsApi, REFUND_METHOD_LABEL, RefundRequestStatus } from '../api/refunds.js';

/**
 * İşletmenin bekleyen iade talepleri (admin ve mutfak ekranları ortak kullanır).
 *
 * Liste sunucudan çekilir; canlı güncelleme için dönen `reload` işlevi
 * useOrderRealtime'ın onRefundChange'ine verilir (aynı hub bağlantısı).
 */
export function useRefundRequests(restaurantId) {
  const [refunds, setRefunds] = useState([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const rows = await refundsApi.getByRestaurant(restaurantId, RefundRequestStatus.Pending);
      setRefunds(rows.map((row) => ({ ...row, methodLabel: REFUND_METHOD_LABEL[row.method] ?? '-' })));
      setError('');
    } catch (err) {
      setError(err.message ?? 'İade talepleri yüklenemedi.');
    }
  }, [restaurantId]);

  useEffect(() => {
    // İlk yükleme; sonrası canlı olaylarla tetiklenir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  /** Talebi "tamamlandı" ya da "reddedildi" yapar ve listeden düşer. */
  const resolve = useCallback(async (id, status) => {
    await refundsApi.updateStatus(id, status);
    setRefunds((rows) => rows.filter((row) => row.id !== id));
  }, []);

  return { refunds, error, reload, resolve };
}
