import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { payTrApi, CardPaymentStatus } from '../../api/paytr.js';
import { formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';

const TransferStatus = Object.freeze({ NotApplicable: 0, Pending: 1, Requested: 2, Failed: 3 });

const TRANSFER_LABEL = {
  [TransferStatus.NotApplicable]: '—',
  [TransferStatus.Pending]: 'Hesabınıza aktarılacak',
  [TransferStatus.Requested]: 'Hesabınıza aktarıldı',
  [TransferStatus.Failed]: 'Aktarım hatası (destek ile iletişime geçin)',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
}

/**
 * Kartla (PayTR) alınan masa ödemeleri ve karta iade. Restoran payı hesaba aktarılmadan
 * önce iade buradan yapılır; aktarıldıktan sonra iade için Süper Admin'e başvurulur.
 */
export default function AdminCardPayments() {
  const { user } = useAuth();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refunding, setRefunding] = useState(null);
  const restaurantId = user?.restaurantId;

  const load = useCallback(
    () =>
      payTrApi
        .listPayments(restaurantId, 60)
        .then((data) => setPayments(data ?? []))
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Ödemeler yüklenemedi.'))
        .finally(() => setIsLoading(false)),
    [restaurantId],
  );

  useEffect(() => {
    if (restaurantId) load();
  }, [restaurantId, load]);

  const tablePayments = payments.filter((p) => p.purpose === 1);

  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-lg">
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Kart Ödemeleri</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Müşterilerin masadan PayTR ile kartla yaptığı ödemeler. Restoran payınız ödemeden sonraki
          sabah hesabınıza aktarılır. Aktarımdan önce buradan karta iade yapabilirsiniz.
        </p>
      </section>

      {error && <p className="text-error font-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant">Yükleniyor...</p>
      ) : tablePayments.length === 0 ? (
        <p className="text-on-surface-variant">Son 60 günde kartla alınmış ödeme yok.</p>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="p-3">Tarih</th>
                <th className="p-3">Masa</th>
                <th className="p-3">Tutar</th>
                <th className="p-3">İade</th>
                <th className="p-3">Durum</th>
                <th className="p-3">Aktarım</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {tablePayments.map((p) => {
                const canRefund = p.status === CardPaymentStatus.Succeeded && p.refundableMinor > 0
                  && p.transferStatus !== TransferStatus.Requested;
                return (
                  <tr key={p.merchantOid} className="border-b border-outline-variant last:border-0">
                    <td className="p-3 whitespace-nowrap">{formatDate(p.completedAt ?? p.createdAt)}</td>
                    <td className="p-3">{p.tableNo ?? '-'}</td>
                    <td className="p-3 font-semibold">{formatKurus(p.amountMinor)}</td>
                    <td className="p-3">{p.refundedMinor > 0 ? formatKurus(p.refundedMinor) : '-'}</td>
                    <td className="p-3">
                      {p.status === CardPaymentStatus.Succeeded ? 'Başarılı' : 'Başarısız'}
                      {p.testMode && <span className="ml-1 text-[11px] text-on-surface-variant">(test)</span>}
                    </td>
                    <td className="p-3">{TRANSFER_LABEL[p.transferStatus] ?? '-'}</td>
                    <td className="p-3 text-right">
                      {canRefund && (
                        <button type="button" onClick={() => setRefunding(p)}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 hover:bg-surface-container-high">
                          İade Et
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {refunding && (
        <RefundDialog
          payment={refunding}
          onClose={() => setRefunding(null)}
          onDone={(message) => {
            setRefunding(null);
            toast.success(message);
            load();
          }}
        />
      )}
    </div>
  );
}

function RefundDialog({ payment, onClose, onDone }) {
  const maxTl = payment.refundableMinor / 100;
  const [amountTl, setAmountTl] = useState(String(maxTl));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const minor = Math.round(Number(String(amountTl).replace(',', '.')) * 100);
    if (!Number.isFinite(minor) || minor <= 0 || minor > payment.refundableMinor) {
      setError(`İade tutarı 0 ile ${formatKurus(payment.refundableMinor)} arasında olmalı.`);
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await payTrApi.refund(payment.merchantOid, minor, reason.trim() || null);
      onDone(`${formatKurus(minor)} müşterinin kartına iade edildi. Bankaya göre hesaba geçmesi birkaç gün sürebilir.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İade yapılamadı.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="font-headline-sm text-on-background">Karta iade</h3>
        <p className="text-sm text-on-surface-variant">
          Masa {payment.tableNo ?? '-'} · {formatKurus(payment.amountMinor)} ödeme. İade edilebilir:{' '}
          <strong>{formatKurus(payment.refundableMinor)}</strong>
        </p>
        <label className="flex flex-col gap-1 text-sm">
          İade tutarı (TL)
          <input type="text" inputMode="decimal" value={amountTl} onChange={(e) => setAmountTl(e.target.value)}
            className="border border-outline-variant rounded-lg py-2 px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sebep (isteğe bağlı)
          <input type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Örn. ürün iptal edildi" className="border border-outline-variant rounded-lg py-2 px-3" />
        </label>
        <p className="text-[11px] text-on-surface-variant">
          İade PayTR üzerinden müşterinin kartına yapılır ve geri alınamaz.
        </p>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm">Vazgeç</button>
          <button type="submit" disabled={isSaving}
            className="rounded-lg bg-primary-container text-on-primary-container px-4 py-2 text-sm disabled:opacity-50">
            {isSaving ? 'İade ediliyor...' : 'İade Et'}
          </button>
        </div>
      </form>
    </div>
  );
}
