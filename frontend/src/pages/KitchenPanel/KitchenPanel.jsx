import { useEffect, useMemo, useState } from 'react';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrderRealtime } from '../../hooks/useOrderRealtime.js';
import RealtimeStatus from '../../components/RealtimeStatus.jsx';
import { ordersApi } from '../../api/orders.js';
import { OrderSessionStatus, OrderItemStatus, formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import './KitchenPanel.css';

function orderOverallStatus(order) {
  if (order.items.every((item) => item.status === OrderItemStatus.Ready || item.status === OrderItemStatus.Delivered)) {
    return 'Servise Hazır';
  }
  if (order.items.some((item) => item.status === OrderItemStatus.Preparing)) {
    return 'Hazırlanıyor';
  }
  return 'Mutfakta';
}

export default function KitchenPanel() {
  const toast = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyOrderId, setBusyOrderId] = useState(null);

  // Mutfak yalnızca açık siparişleri görür; durum süzgeci sunucuda uygulanır.
  // Açık siparişler masa sayısıyla sınırlı olduğu için tek sayfa yeterlidir.
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

  // Masadan sipariş geldiğinde ekran kendiliğinden güncellensin. Öncesinde
  // hiçbir otomatik yenileme yoktu: sipariş, biri sayfayı elle yenileyene
  // kadar mutfakta görünmüyordu.
  const { status: realtimeStatus } = useOrderRealtime({
    enabled: Boolean(user?.restaurantId),
    onChange: loadOrders,
  });

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesSearch(`Masa ${order.tableNo}`, searchTerm)),
    [orders, searchTerm],
  );

  const setAllItemsStatus = async (order, status) => {
    setBusyOrderId(order.id);
    try {
      await Promise.all(order.items.map((item) => ordersApi.updateItemStatus(order.id, item.orderItemId, status)));
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sipariş güncellenemedi.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleStartPreparing = (order) => setAllItemsStatus(order, OrderItemStatus.Preparing);
  const handleReady = (order) => setAllItemsStatus(order, OrderItemStatus.Ready);

  const handleDelivered = async (order) => {
    setBusyOrderId(order.id);
    try {
      await Promise.all(order.items.map((item) => ordersApi.updateItemStatus(order.id, item.orderItemId, OrderItemStatus.Delivered)));
      await ordersApi.updateStatus(order.id, OrderSessionStatus.Closed);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sipariş kapatılamadı.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const readyCount = orders.filter((order) => orderOverallStatus(order) === 'Servise Hazır').length;

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-md">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              Mutfak Aktif Siparişleri
            </h2>
            <RealtimeStatus status={realtimeStatus} />
          </div>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Mutfağa düşen siparişleri takip edebilir, hazırlama durumunu
            güncelleyebilir ve servise hazır olarak işaretleyebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-sm w-full lg:w-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Aktif</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {orders.length}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Hazır</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {readyCount}
            </p>
          </div>
        </div>
      </section>

      <section className="relative w-full">
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
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="flex flex-col gap-md">
        {isLoading ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              isBusy={busyOrderId === order.id}
              onStartPreparing={handleStartPreparing}
              onReady={handleReady}
              onDelivered={handleDelivered}
            />
          ))
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg ambient-shadow text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-50">
              room_service
            </span>
            <p className="font-headline-sm text-headline-sm text-on-background mt-2">
              Aktif sipariş bulunmuyor
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Yeni siparişler mutfağa düştüğünde burada listelenecek.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function KitchenOrderCard({ order, isBusy, onStartPreparing, onReady, onDelivered }) {
  const status = orderOverallStatus(order);
  const isReady = status === 'Servise Hazır';

  return (
    <div
      className={`bg-surface-container-lowest border rounded-xl p-md ambient-shadow flex flex-col gap-md ${
        isReady ? 'border-primary-container' : 'border-outline-variant'
      }`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-md">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-background">
            Masa {order.tableNo}
          </h3>

          <p className="text-body-sm text-on-surface-variant mt-1">
            Mutfak sipariş detayı
          </p>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-bold ${
            isReady
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          Hazırlanacak Ürünler
        </p>

        <ul className="font-body-md text-on-background flex flex-col gap-1">
          {order.items.map((item) => (
            <li key={item.orderItemId} className="flex items-center justify-between gap-md">
              <span>{item.name}</span>
              <span className="font-bold text-primary-container">{formatKurus(item.price)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-md pt-2 border-t border-outline-variant">
        <p className="font-headline-sm text-headline-sm text-on-background">
          Toplam Tutar :{' '}
          <span className="text-primary-container">{formatKurus(order.totalAmount)}</span>
        </p>

        <div className="flex flex-wrap gap-sm">
          {status === 'Mutfakta' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStartPreparing(order)}
              className="px-5 py-2 border border-outline-variant rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              Hazırlamaya Başla
            </button>
          )}

          {status !== 'Servise Hazır' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onReady(order)}
              className="bg-primary-container text-on-primary-container px-5 py-2 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Servise Hazır
            </button>
          )}

          {status === 'Servise Hazır' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onDelivered(order)}
              className="bg-primary-container text-on-primary-container px-5 py-2 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Teslim Edildi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
