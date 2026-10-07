import { useEffect, useMemo, useState } from 'react';
import './KitchenTables.css';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOrderRealtime } from '../../hooks/useOrderRealtime.js';
import { tablesApi } from '../../api/restaurants.js';
import { ordersApi } from '../../api/orders.js';
import { ApiError } from '../../api/client.js';
import { OrderSessionStatus } from '../../api/enums.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import TableQrCode from '../../components/TableQrCode.jsx';
import RealtimeStatus from '../../components/RealtimeStatus.jsx';
import { buildTableMenuUrl } from '../../lib/qr.js';

function deriveOrderStatus(table, orders) {
  if (table.status !== 'Occupied') {
    return 'Pasif';
  }

  const activeOrder = orders.find((order) => order.tableNo === table.tableNo && order.sessionStatus === 1);
  if (!activeOrder || activeOrder.items.length === 0) {
    return 'Boş';
  }

  if (activeOrder.items.some((item) => item.status === 4)) {
    return 'Servise Hazır';
  }
  if (activeOrder.items.some((item) => item.status === 2 || item.status === 3)) {
    return 'Hazırlanıyor';
  }
  return 'Sipariş Var';
}

export default function KitchenTables() {
  const toast = useToast();
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyTableNo, setBusyTableNo] = useState(null);

  // Masa durumu yalnızca AÇIK siparişlerden türetilir; kapalı sipariş geçmişini
  // indirmeye gerek yok. Açık siparişler masa sayısıyla sınırlı olduğu için tek
  // sayfa yeterlidir.
  const loadData = () => {
    if (!user?.restaurantId) return Promise.resolve();
    return Promise.all([
      tablesApi.getAll(user.restaurantId),
      ordersApi.getByRestaurant(user.restaurantId, {
        sessionStatus: OrderSessionStatus.Active,
        pageSize: MAX_PAGE_SIZE,
      }),
    ]).then(([tablesData, ordersData]) => {
      setTables(tablesData);
      setOrders(toPage(ordersData).items);
    });
  };

  useEffect(() => {
    setIsLoading(true);
    loadData()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Masalar yüklenemedi.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.restaurantId]);

  // Masa doluluk durumu AÇIK siparişlerden türetiliyor; sipariş geldiğinde
  // veya durumu değiştiğinde masa görünümü de tazelenmeli.
  const { status: realtimeStatus } = useOrderRealtime({
    enabled: Boolean(user?.restaurantId),
    onChange: loadData,
  });

  const tablesWithStatus = useMemo(
    () => tables.map((table) => ({ ...table, orderStatus: deriveOrderStatus(table, orders) })),
    [tables, orders],
  );

  const filteredTables = useMemo(
    () => tablesWithStatus.filter((table) => matchesSearch(`Masa ${table.tableNo}`, searchTerm)),
    [tablesWithStatus, searchTerm],
  );

  const handleToggleStatus = async (table) => {
    setBusyTableNo(table.tableNo);
    try {
      if (table.status === 'Occupied') {
        await tablesApi.closeSession(user.restaurantId, table.tableNo);
      } else {
        await tablesApi.openSession(user.restaurantId, table.tableNo);
      }
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Masa durumu güncellenemedi.');
    } finally {
      setBusyTableNo(null);
    }
  };

  const handleOpenMenu = (table) => {
    if (!table.qrToken) {
      toast.warning('QR menüyü açmak için önce masanın oturumunu açın.');
      return;
    }
    window.open(buildTableMenuUrl(user.restaurantId, table.tableNo, table.qrToken), '_blank');
  };

  const activeCount = tablesWithStatus.filter((table) => table.status === 'Occupied').length;
  const passiveCount = tablesWithStatus.filter((table) => table.status !== 'Occupied').length;
  const busyCount = tablesWithStatus.filter((table) =>
    ['Sipariş Var', 'Hazırlanıyor', 'Servise Hazır'].includes(table.orderStatus),
  ).length;

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-md">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="font-headline-lg text-headline-lg text-on-background">
              Mutfak Masaları
            </h2>
            <RealtimeStatus status={realtimeStatus} />
          </div>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Mutfak tarafında masaların aktiflik durumunu ve sipariş yoğunluğunu
            takip edebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-sm w-full lg:w-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Aktif</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {activeCount}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Siparişli</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {busyCount}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Pasif</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {passiveCount}
            </p>
          </div>
        </div>
      </section>

      <section className="relative w-full">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>

        <input
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all ambient-shadow"
          placeholder="Masa ara..."
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {filteredTables.map((table) => (
            <KitchenTableCard
              key={table.tableNo}
              table={table}
              restaurantId={user.restaurantId}
              isBusy={busyTableNo === table.tableNo}
              onToggleStatus={handleToggleStatus}
              onOpenMenu={handleOpenMenu}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function KitchenTableCard({ table, restaurantId, isBusy, onToggleStatus, onOpenMenu }) {
  const isActive = table.status === 'Occupied';
  const isBusyOrder = ['Sipariş Var', 'Hazırlanıyor', 'Servise Hazır'].includes(table.orderStatus);

  return (
    <div
      className={`bg-surface-container-lowest border rounded-xl p-md ambient-shadow hover:shadow-md transition-all flex flex-col gap-4 ${
        !isActive ? 'border-outline-variant opacity-55' : isBusyOrder ? 'border-primary-container' : 'border-outline-variant'
      }`}
    >
      <div className="flex justify-between items-start gap-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-background">
            Masa {table.tableNo}
          </h3>

          <p className="text-label-sm text-on-surface-variant mt-1">
            Mutfak masa takibi
          </p>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
            isActive
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          {isActive ? 'AKTİF' : 'PASİF'}
        </span>
      </div>

      <TableQrCode restaurantId={restaurantId} tableNo={table.tableNo} qrToken={table.qrToken} />

      <div className="flex justify-center">
        <span
          className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
            table.orderStatus === 'Servise Hazır'
              ? 'bg-primary-container text-on-primary-container'
              : table.orderStatus === 'Hazırlanıyor'
              ? 'bg-secondary-container text-on-secondary-container'
              : table.orderStatus === 'Sipariş Var'
              ? 'bg-surface-container-high text-on-surface-variant'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          {table.orderStatus}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpenMenu(table)}
        className="w-full flex items-center justify-center gap-2 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-low transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">
          open_in_new
        </span>
        QR Menüyü Aç
      </button>

      <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onToggleStatus(table)}
          className="flex items-center gap-2 disabled:opacity-50"
        >
          <div
            className={`w-10 h-5 rounded-full relative transition-colors ${
              isActive ? 'bg-primary-container' : 'bg-surface-container-high'
            }`}
          >
            <div
              className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                isActive ? 'right-1' : 'left-1'
              }`}
            />
          </div>

          <span
            className={`text-label-sm font-bold ${
              isActive ? 'text-primary-container' : 'text-on-surface-variant'
            }`}
          >
            {isActive ? 'Aktif' : 'Pasif'}
          </span>
        </button>
      </div>

      <p className="text-[11px] text-on-surface-variant opacity-70 text-center mt-auto">
        Mutfak personeli buradan masa aktifliğini ve sipariş durumunu takip eder.
      </p>
    </div>
  );
}
