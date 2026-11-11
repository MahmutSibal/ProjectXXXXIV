import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrderRealtime } from '../../hooks/useOrderRealtime.js';
import { useRefundRequests } from '../../hooks/useRefundRequests.js';
import { RefundRequestStatus, RefundMethod } from '../../api/refunds.js';
import RealtimeStatus from '../../components/RealtimeStatus.jsx';
import { ordersApi } from '../../api/orders.js';
import { OrderSessionStatus, ORDER_ITEM_STATUS_LABEL, formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import './AdminActiveOrders.css';

export default function AdminActiveOrders() {
  const toast = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePanel, setActivePanel] = useState('orders');
  // Bekleyen iade talepleri sunucudan gelir; canlı güncelleme sipariş hub'ı üzerinden.
  const { refunds, reload: reloadRefunds, resolve: resolveRefund } = useRefundRequests(user?.restaurantId);

  const handleResolveRefund = async (id, status) => {
    try {
      await resolveRefund(id, status);
    } catch (err) {
      toast.error(err.message ?? 'İade talebi güncellenemedi.');
    }
  };

  // Açık siparişler masa sayısıyla doğal olarak sınırlıdır; tek sayfada göstermek
  // güvenli. Durum süzgeci sunucuda uygulanır, kapalı siparişler hiç taşınmaz.
  const loadOrders = () =>
    ordersApi
      .getByRestaurant(user.restaurantId, {
        sessionStatus: OrderSessionStatus.Active,
        pageSize: MAX_PAGE_SIZE,
      })
      .then((data) => setOrders(toPage(data).items));

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadOrders()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Siparişler yüklenemedi.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.restaurantId]);

  // Sipariş ve kalem durumu değişince liste kendiliğinden tazelensin.
  const { status: realtimeStatus } = useOrderRealtime({
    enabled: Boolean(user?.restaurantId),
    onChange: loadOrders,
    onRefundChange: reloadRefunds,
  });

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesSearch(`Masa ${order.tableNo}`, searchTerm)),
    [orders, searchTerm],
  );

  const handleDelivered = async (orderId) => {
    try {
      await ordersApi.updateStatus(orderId, OrderSessionStatus.Closed);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sipariş güncellenemedi.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-md">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              Aktif Siparişler
            </h2>
            <RealtimeStatus status={realtimeStatus} />
          </div>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Hazırlanmayı bekleyen siparişleri buradan takip edebilir ve teslim
            edildi olarak işaretleyebilirsiniz.
          </p>
        </div>

<div className="flex flex-wrap gap-2" aria-label="Sipariş ekranları">
  <button
    type="button"
    aria-pressed={activePanel === 'orders'}
    onClick={() => setActivePanel('orders')}
    className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
      activePanel === 'orders'
        ? 'border-primary-container bg-primary-container text-on-primary-container'
        : 'border-outline-variant bg-surface-container-lowest text-on-background'
    }`}
  >
    Aktif Siparişler
  </button>

  <button
    type="button"
    aria-pressed={activePanel === 'refunds'}
    onClick={() => setActivePanel('refunds')}
    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
      refunds.length > 0
        ? 'border-[#F3AA5C] bg-[#F3AA5C] text-[#2D1909]'
        : activePanel === 'refunds'
          ? 'border-primary-container bg-primary-container text-on-primary-container'
          : 'border-outline-variant bg-surface-container-lowest text-on-background'
    }`}
  >
    Müşteri İade
    <span aria-live="polite" className="min-w-6 rounded-full bg-black/10 px-2 py-0.5 text-center tabular-nums">
      {refunds.length}
    </span>
  </button>
</div>

{activePanel === 'refunds' && (
  <section className="flex flex-col gap-md" aria-labelledby="admin-refund-title">
    <h3 id="admin-refund-title" className="font-headline-sm text-headline-sm text-on-background">
      Müşteri İade Talepleri
    </h3>

    {refunds.length === 0 ? (
      <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-on-surface-variant">
        Bekleyen iade talebi yok.
      </p>
    ) : (
      refunds.map((request) => (
        <article
          key={request.id}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md ambient-shadow"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-on-background">Masa {request.tableNo}</h4>
            <span className="rounded-full bg-[#F3AA5C]/25 px-3 py-1 text-xs font-bold text-[#67370E]">
              İade yöntemi · {request.methodLabel}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant">
            {request.content}
          </p>
          {request.iban && (
            <p className="mt-2 text-sm text-on-background">
              IBAN: <span className="font-mono">{request.iban}</span>
              {request.accountHolderName ? ` · ${request.accountHolderName}` : ''}
            </p>
          )}
          {request.method === RefundMethod.Card && (
            <p className="mt-2 text-sm text-on-background">
              Kartla iade için ödemeyi{' '}
              <Link to="/admin/card-payments" className="font-semibold underline">Kart Ödemeleri</Link>
              {' '}sayfasından bulup &quot;İade Et&quot;e basın; ardından bu talebi &quot;İade Yapıldı&quot; olarak işaretleyin.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleResolveRefund(request.id, RefundRequestStatus.Completed)}
              className="min-h-10 rounded-lg bg-primary-container px-4 text-sm font-semibold text-on-primary-container"
            >
              İade Yapıldı
            </button>
            <button
              type="button"
              onClick={() => handleResolveRefund(request.id, RefundRequestStatus.Rejected)}
              className="min-h-10 rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-background"
            >
              Reddet
            </button>
          </div>
        </article>
      ))
    )}
  </section>
)}


        <div className={activePanel === 'orders' ? 'relative w-full' : 'hidden'}>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-body-md font-headline-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
            placeholder="Masa adına göre ara..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Şu anda aktif sipariş yok.</p>
      ) : (
        <section className="flex flex-col gap-md">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDelivered={handleDelivered}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function OrderCard({ order, onDelivered }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
      <div className="flex justify-between items-center">
        <h3 className="font-headline-md text-headline-md text-on-background">
          Masa {order.tableNo}
        </h3>

        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-label-sm font-bold">
          {order.items.length} ürün
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          Siparişler
        </p>

        <ul className="font-body-md text-on-background">
          {order.items.map((item) => (
            <li
              key={item.orderItemId}
              className="flex justify-between border-b border-outline-variant/40 py-1 last:border-0"
            >
              <span>
                {item.name}
                <span className="text-label-sm text-on-surface-variant ml-2">
                  {ORDER_ITEM_STATUS_LABEL[item.status] ?? item.status}
                </span>
              </span>
              <span>{formatKurus(item.price)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
        <p className="font-headline-sm text-headline-sm text-on-background">
          Toplam Tutar :{' '}
          <span className="text-primary-container">{formatKurus(order.totalAmount)}</span>
        </p>

        <button
          type="button"
          onClick={() => onDelivered(order.id)}
          className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-label-md hover:opacity-90 transition-opacity"
        >
          Teslim Edildi
        </button>
      </div>
    </div>
  );
}
