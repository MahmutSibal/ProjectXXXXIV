import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { getCustomerSession } from '../../../api/customerClient.js';
import { customerOrdersApi } from '../../../api/customer.js';
import {
  OrderSessionStatus,
  ORDER_ITEM_STATUS_LABEL,
  formatKurus,
} from '../../../api/enums.js';
import { toPage, MAX_PAGE_SIZE } from '../../../api/pagination.js';
import { useOrderRealtime } from '../../../hooks/useOrderRealtime.js';
import { parseApiDate } from '../../../lib/date.js';

import './QrMenuSheets.css';

// Sipariş kalemlerinde "adet" alanı yok (her birim ayrı satır). Aynı ad, fiyat
// ve durumdaki kalemleri "xN" olarak gruplayıp gösteriyoruz.
function groupItems(items) {
  const groups = [];
  const byKey = new Map();

  for (const item of items ?? []) {
    const key = `${item.name}__${item.price}__${item.status}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      const group = {
        key,
        name: item.name,
        price: item.price,
        status: item.status,
        quantity: 1,
      };
      byKey.set(key, group);
      groups.push(group);
    }
  }

  return groups;
}

function formatOrderTime(createdAt) {
  if (!createdAt) return '';
  const date = parseApiDate(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Masanın açık oturumundaki siparişleri listeler; header'da bir düğme ve
// düğmeyle açılan bir alt panel (bottom sheet) çizer.
export default function QrOrdersSheet({ restaurantId, tableNo }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const load = useCallback(
    () =>
      customerOrdersApi
        .getByRestaurant(restaurantId, {
          tableNo: Number(tableNo),
          sessionStatus: OrderSessionStatus.Active,
          pageSize: MAX_PAGE_SIZE,
        })
        .then((data) => {
          setOrders(toPage(data).items);
          setError('');
        })
        .catch((err) => setError(err.message ?? 'Siparişler alınamadı.'))
        .finally(() => setIsLoading(false)),
    [restaurantId, tableNo],
  );

  useEffect(() => {
    load();
  }, [load]);

  // QR oturumu personel oturumundan ayrı depoda durur; token'ı oradan okuyoruz.
  useOrderRealtime({
    enabled: Boolean(getCustomerSession()?.accessToken),
    onChange: load,
    getAccessToken: () => getCustomerSession()?.accessToken ?? '',
  });

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => parseApiDate(b.createdAt).getTime() - parseApiDate(a.createdAt).getTime(),
      ),
    [orders],
  );

  return (
    <>
      <button
        type="button"
        className="qr-menu-header__orders"
        onClick={() => {
          setIsOpen(true);
          load();
        }}
        aria-label={`Siparişlerim. ${orders.length} sipariş`}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          receipt_long
        </span>

        {orders.length > 0 && <strong>{orders.length}</strong>}
      </button>

      {isOpen &&
        createPortal(
          <div className="qr-sheet" role="dialog" aria-modal="true" aria-label="Siparişlerim">
            <button
              type="button"
              className="qr-sheet__backdrop"
              aria-label="Kapat"
              onClick={() => setIsOpen(false)}
            />

            <div className="qr-sheet__panel">
              <div className="qr-sheet__handle" />

              <header className="qr-sheet__header">
                <div>
                  <span>Masa {tableNo}</span>

                  <h2>Siparişlerim</h2>
                </div>

                <button
                  type="button"
                  className="qr-sheet__close"
                  aria-label="Kapat"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </header>

              <div className="qr-sheet__body">
                {error && <p className="qr-sheet__error">{error}</p>}

                {isLoading ? (
                  <p className="qr-sheet__empty">Yükleniyor...</p>
                ) : sortedOrders.length === 0 && !error ? (
                  <p className="qr-sheet__empty">Bu masada henüz sipariş yok.</p>
                ) : (
                  sortedOrders.map((order) => (
                    <article key={order.id} className="qr-orders-card">
                      <div className="qr-orders-card__head">
                        <strong>Sipariş #{order.id}</strong>

                        <span>{formatOrderTime(order.createdAt)}</span>
                      </div>

                      <ul>
                        {groupItems(order.items).map((group) => (
                          <li key={group.key}>
                            <div>
                              <span>
                                <b className="qr-orders-card__qty">x{group.quantity}</b>
                                {group.name}
                              </span>

                              <small>{ORDER_ITEM_STATUS_LABEL[group.status]}</small>
                            </div>

                            <strong>{formatKurus(group.price * group.quantity)}</strong>
                          </li>
                        ))}
                      </ul>

                      <div className="qr-orders-card__total">
                        <span>Toplam</span>

                        <strong>{formatKurus(order.totalAmount)}</strong>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <footer className="qr-sheet__footer">
                <Link
                  className="qr-sheet__link"
                  to={`/menu/${restaurantId}/${tableNo}/bill`}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    receipt
                  </span>
                  Hesabı Gör
                </Link>
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
