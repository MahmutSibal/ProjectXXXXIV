import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  useParams,
} from 'react-router-dom';

import { getCustomerSession } from '../../api/customerClient.js';
import { customerOrdersApi } from '../../api/customer.js';
import {
  OrderSessionStatus,
  ORDER_ITEM_STATUS_LABEL,
  formatKurus,
} from '../../api/enums.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import { useOrderRealtime } from '../../hooks/useOrderRealtime.js';

import './OrderSuccess.css';

// Sipariş kalemi durumları (bkz. api/enums.js): Pending=1, Kitchen=2,
// Preparing=3, Ready=4, Delivered=5. Siparişteki EN YAVAŞ kalemi esas alarak
// (minStatus) dört adımlık ilerleme çizgisini canlı tutuyoruz.
function getStepState(minStatus, hasOrder, threshold, isLast) {
  if (!hasOrder) return '';
  if (isLast) {
    return minStatus >= threshold ? 'order-status-step--completed' : '';
  }
  if (minStatus > threshold) return 'order-status-step--completed';
  if (minStatus <= threshold) return 'order-status-step--active';
  return '';
}

export default function OrderSuccess() {
  const { restaurantId, tableNo, orderId } =
    useParams();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // QR oturumu personel oturumundan ayrı bir depoda durur (customerClient.js);
  // realtime hub'a bağlanırken token'ı oradan okuyoruz.
  const load = useCallback(
    () =>
      customerOrdersApi
        .getByRestaurant(restaurantId, {
          tableNo: Number(tableNo),
          sessionStatus: OrderSessionStatus.Active,
          pageSize: MAX_PAGE_SIZE,
        })
        .then((data) => setOrders(toPage(data).items))
        .catch((err) => setError(err.message ?? 'Sipariş bilgisi alınamadı.'))
        .finally(() => setIsLoading(false)),
    [restaurantId, tableNo],
  );

  useEffect(() => {
    load();
  }, [load]);

  useOrderRealtime({
    enabled: Boolean(getCustomerSession()?.accessToken),
    onChange: load,
    getAccessToken: () => getCustomerSession()?.accessToken ?? '',
  });

  const order = useMemo(
    () => orders.find((candidate) => String(candidate.id) === String(orderId)),
    [orders, orderId],
  );

  const items = order?.items ?? [];

  const minStatus = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.min(...items.map((item) => item.status));
  }, [items]);

  const hasOrder = Boolean(order);

  if (isLoading) {
    return (
      <main className="order-success-page">
        <section className="order-success-hero">
          <span className="order-success-eyebrow">Sipariş yükleniyor</span>
          <h1>Lütfen bekleyin...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="order-success-page">
      <section className="order-success-hero">
        <div className="order-success-hero__logo">
          <img
            src="/sukranapp.png"
            alt="Şükran App"
          />
        </div>

        <div className="order-success-check">
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            check
          </span>
        </div>

        <span className="order-success-eyebrow">
          Sipariş başarıyla iletildi
        </span>

        <h1>Siparişiniz alındı</h1>

        <p>
          Siparişiniz mutfak ekibine iletildi.
          Hazırlık sürecini bu ekrandan takip
          edebilirsiniz.
        </p>
      </section>

      <div className="order-success-content">
        {error && <p className="customer-error">{error}</p>}

        <section className="order-success-information">
          <div>
            <span>Sipariş numarası</span>

            <strong>
              #{orderId}
            </strong>
          </div>

          <div>
            <span>Masa</span>

            <strong>
              Masa {tableNo}
            </strong>
          </div>

          <div>
            <span>Tahmini süre</span>

            <strong>20–25 dakika</strong>
          </div>
        </section>

        <section className="order-success-status">
          <header>
            <div>
              <span>Canlı sipariş durumu</span>

              <h2>
                {hasOrder
                  ? ORDER_ITEM_STATUS_LABEL[minStatus] ?? 'Sipariş hazırlanıyor'
                  : 'Sipariş bulunamadı'}
              </h2>
            </div>

            <span className="order-success-status__live">
              <i />

              Canlı
            </span>
          </header>

          <div className="order-status-timeline">
            <div
              className={`order-status-step ${getStepState(minStatus, hasOrder, 1, false)}`}
            >
              <span className="order-status-step__icon">
                <span className="material-symbols-outlined">
                  check
                </span>
              </span>

              <div>
                <strong>Sipariş alındı</strong>

                <span>
                  Siparişiniz işletmeye ulaştı.
                </span>
              </div>
            </div>

            <div
              className={`order-status-step ${getStepState(minStatus, hasOrder, 3, false)}`}
            >
              <span className="order-status-step__icon">
                <span className="material-symbols-outlined">
                  soup_kitchen
                </span>
              </span>

              <div>
                <strong>Hazırlanıyor</strong>

                <span>
                  Mutfak ekibi siparişinizi
                  hazırlıyor.
                </span>
              </div>
            </div>

            <div
              className={`order-status-step ${getStepState(minStatus, hasOrder, 4, false)}`}
            >
              <span className="order-status-step__icon">
                <span className="material-symbols-outlined">
                  room_service
                </span>
              </span>

              <div>
                <strong>Servise hazır</strong>

                <span>
                  Siparişiniz servis için
                  bekliyor.
                </span>
              </div>
            </div>

            <div
              className={`order-status-step ${getStepState(minStatus, hasOrder, 5, true)}`}
            >
              <span className="order-status-step__icon">
                <span className="material-symbols-outlined">
                  task_alt
                </span>
              </span>

              <div>
                <strong>Teslim edildi</strong>

                <span>
                  Siparişiniz masanıza ulaştı.
                </span>
              </div>
            </div>
          </div>
        </section>

        {items.length > 0 && (
          <section className="order-success-summary">
            <header>
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                receipt_long
              </span>

              <h2>Sipariş özeti</h2>
            </header>

            <ul>
              {items.map((item) => (
                <li key={item.orderItemId}>
                  <div>
                    <strong>{item.name}</strong>

                    <span>
                      {ORDER_ITEM_STATUS_LABEL[item.status]}
                    </span>
                  </div>

                  <strong>
                    {formatKurus(item.price)}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="order-success-summary__total">
              <span>Toplam</span>

              <strong>
                {formatKurus(order.totalAmount)}
              </strong>
            </div>
          </section>
        )}

        <div className="order-success-actions">
          <Link
            className="order-success-actions__primary"
            to={`/menu/${restaurantId}/${tableNo}`}
          >
            Menüye Dön
          </Link>

          <Link
            className="order-success-actions__secondary"
            to={`/menu/${restaurantId}/${tableNo}/bill`}
          >
            Hesabı İste
          </Link>

          <Link
            className="order-success-actions__secondary"
            to={`/menu/${restaurantId}/${tableNo}/feedback/${orderId}`}
          >
            Deneyimi Değerlendir
          </Link>
        </div>

        <footer className="order-success-footer">
          <img
            src="/sukranapp.png"
            alt="Şükran App"
          />

          <span>
            Powered by <strong>Şükran App</strong>
          </span>
        </footer>
      </div>
    </main>
  );
}
