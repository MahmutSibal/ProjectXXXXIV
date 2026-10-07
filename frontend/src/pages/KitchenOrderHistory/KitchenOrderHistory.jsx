import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ordersApi } from '../../api/orders.js';
import { OrderSessionStatus, formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import { toPage } from '../../api/pagination.js';
import Pagination from '../../components/Pagination.jsx';
import './KitchenOrderHistory.css';

export default function KitchenOrderHistory() {
  const { user } = useAuth();
  const [result, setResult] = useState(() => toPage(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [appliedTable, setAppliedTable] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAppliedTable(tableFilter.trim()), 350);
    return () => clearTimeout(timer);
  }, [tableFilter]);

  useEffect(() => {
    setPage(1);
  }, [appliedTable, pageSize]);

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    // Süzme ve sıralama sunucuda; sipariş geçmişi sınırsız büyür.
    ordersApi
      .getByRestaurant(user.restaurantId, {
        sessionStatus: OrderSessionStatus.Closed,
        page,
        pageSize,
        tableNo: appliedTable === '' ? undefined : Number(appliedTable),
      })
      .then((data) => {
        if (!cancelled) {
          setResult(toPage(data, pageSize));
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Sipariş geçmişi yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.restaurantId, page, pageSize, appliedTable]);

  const filteredOrders = result.items;

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Mutfak Sipariş Geçmişi
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Mutfaktan çıkan ve tamamlanan siparişleri buradan inceleyebilirsiniz.
          </p>
        </div>

        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>

          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
            placeholder="Masa numarasına göre ara..."
            type="number"
            min="1"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          />
        </div>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Kayıt bulunamadı.</p>
      ) : (
        <section className="flex flex-col gap-md">
          {filteredOrders.map((order) => {
            const created = new Date(order.createdAt);

            return (
              <div
                key={order.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md"
              >
                <div className="flex justify-between items-center gap-md">
                  <h3 className="font-headline-md text-headline-md text-on-background">
                    Masa {order.tableNo}
                  </h3>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-label-sm font-bold bg-primary-container text-on-primary-container">
                    Servisten Çıktı
                  </span>
                </div>

                <ul className="font-body-md text-on-background">
                  {order.items.map((item) => (
                    <li key={item.orderItemId} className="flex justify-between gap-md">
                      <span>{item.name}</span>
                      <span>{formatKurus(item.price)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3 text-[12px] text-on-surface-variant opacity-70 pt-2 border-t border-outline-variant">
                  <span>Tarih: {created.toLocaleDateString('tr-TR')}</span>
                  <span>Saat: {created.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
