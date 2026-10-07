import { useEffect, useMemo, useState } from 'react';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { tablesApi, restaurantsApi } from '../../api/restaurants.js';
import { ApiError } from '../../api/client.js';
import TableQrCode from '../../components/TableQrCode.jsx';
import { buildTableMenuUrl, downloadTableQrCard } from '../../lib/qr.js';
import './AdminTables.css';

const STATUS_LABEL = {
  Available: 'Boş',
  Occupied: 'Oturum Açık',
  Reserved: 'Rezerve',
  Closed: 'Kapalı',
};

export default function AdminTables() {
  const toast = useToast();
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyTableNo, setBusyTableNo] = useState(null);

  const loadTables = () => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }
    return tablesApi
      .getAll(user.restaurantId)
      .then(setTables)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Masalar yüklenemedi.'));
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.resolve(loadTables()).finally(() => setIsLoading(false));
    if (user?.restaurantId) {
      restaurantsApi
        .getById(user.restaurantId)
        .then((restaurant) => setRestaurantName(restaurant?.name ?? ''))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.restaurantId]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => matchesSearch(`Masa ${table.tableNo}`, searchTerm));
  }, [tables, searchTerm]);

  const handleAddTable = async () => {
    try {
      await tablesApi.add(user.restaurantId);
      await loadTables();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Masa eklenemedi.');
    }
  };

  const handleToggleSession = async (table) => {
    setBusyTableNo(table.tableNo);
    try {
      if (table.status === 'Occupied') {
        await tablesApi.closeSession(user.restaurantId, table.tableNo);
      } else {
        await tablesApi.openSession(user.restaurantId, table.tableNo);
      }
      await loadTables();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Masa durumu güncellenemedi.');
    } finally {
      setBusyTableNo(null);
    }
  };

  const handleActivateAll = async () => {
    await Promise.all(tables.filter((t) => t.status !== 'Occupied').map((t) => tablesApi.openSession(user.restaurantId, t.tableNo)));
    await loadTables();
  };

  const handleDeactivateAll = async () => {
    await Promise.all(tables.filter((t) => t.status === 'Occupied').map((t) => tablesApi.closeSession(user.restaurantId, t.tableNo)));
    await loadTables();
  };

  const handleDeleteTable = async (tableNo) => {
    const confirmed = window.confirm('Bu masayı silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    try {
      await tablesApi.remove(user.restaurantId, tableNo);
      setTables((prev) => prev.filter((table) => table.tableNo !== tableNo));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Masa silinemedi.');
    }
  };

  const handleOpenMenu = (table) => {
    if (!table.qrToken) {
      toast.warning('QR menüyü açmak için önce masanın oturumunu açın.');
      return;
    }
    window.open(buildTableMenuUrl(user.restaurantId, table.tableNo, table.qrToken), '_blank');
  };

  const handleDownloadQr = async (table) => {
    if (!table.qrToken) {
      toast.warning('QR kodu indirmek için önce masanın oturumunu açın.');
      return;
    }

    try {
      await downloadTableQrCard({
        restaurantName,
        tableNo: table.tableNo,
        url: buildTableMenuUrl(user.restaurantId, table.tableNo, table.qrToken),
      });
    } catch {
      toast.error('QR kod görseli oluşturulamadı.');
    }
  };

  const handleDownloadAllQr = async () => {
    const openTables = tables.filter((table) => table.qrToken);
    if (openTables.length === 0) {
      toast.warning('İndirilecek QR kodu yok. Önce masaların oturumunu açın.');
      return;
    }

    for (const table of openTables) {
      // Tarayıcıların art arda inen dosyaları engellememesi için araya kısa bir bekleme konur.
      // eslint-disable-next-line no-await-in-loop
      await downloadTableQrCard({
        restaurantName,
        tableNo: table.tableNo,
        url: buildTableMenuUrl(user.restaurantId, table.tableNo, table.qrToken),
      });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  };

  return (
    <>
      <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
              Masalar
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              QR Menü masalarını buradan oluşturabilir, oturumlarını açıp kapatabilirsiniz.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddTable}
            className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Masa Ekle
          </button>
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

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={handleActivateAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">
              check_circle
            </span>
            Tüm Masaların Oturumunu Aç
          </button>

          <button
            type="button"
            onClick={handleDeactivateAll}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-md text-label-sm hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">block</span>
            Tüm Masaların Oturumunu Kapat
          </button>

          <button
            type="button"
            onClick={handleDownloadAllQr}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-md text-label-sm hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">download_for_offline</span>
            Tüm QR Kodlarını İndir
          </button>
        </div>

        {error && <p className="text-error font-body-md text-body-md">{error}</p>}

        {isLoading ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
        ) : filteredTables.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Henüz masa eklenmemiş.</p>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
            {filteredTables.map((table) => (
              <TableCard
                key={table.tableNo}
                table={table}
                restaurantId={user.restaurantId}
                isBusy={busyTableNo === table.tableNo}
                onToggleSession={handleToggleSession}
                onOpenMenu={handleOpenMenu}
                onDownloadQr={handleDownloadQr}
                onDelete={handleDeleteTable}
              />
            ))}
          </section>
        )}
      </div>
    </>
  );
}

function TableCard({ table, restaurantId, isBusy, onToggleSession, onOpenMenu, onDownloadQr, onDelete }) {
  const isOccupied = table.status === 'Occupied';

  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow hover:shadow-md transition-all flex flex-col gap-4 ${
        isOccupied ? '' : 'opacity-70'
      }`}
    >
      <div className="flex justify-between items-center">
        <h3 className="font-headline-sm text-headline-sm text-on-background">
          Masa {table.tableNo}
        </h3>
      </div>

      <TableQrCode restaurantId={restaurantId} tableNo={table.tableNo} qrToken={table.qrToken} />

      <div className="text-center">
        <p className="text-label-sm text-primary-container font-medium truncate">
          {table.qrToken ? `Oturum: ${table.tableSessionId.slice(0, 8)}…` : 'Oturum kapalı'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
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

        <button
          type="button"
          onClick={() => onDownloadQr(table)}
          className="w-full flex items-center justify-center gap-2 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          QR Kodu İndir
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onToggleSession(table)}
          className="flex items-center gap-2 disabled:opacity-50"
        >
          <div
            className={`w-10 h-5 rounded-full relative ${
              isOccupied ? 'bg-primary-container' : 'bg-surface-container-high'
            }`}
          >
            <div
              className={`absolute top-1 w-3 h-3 bg-white rounded-full ${
                isOccupied ? 'right-1' : 'left-1'
              }`}
            />
          </div>

          <span
            className={`text-label-sm font-bold ${
              isOccupied ? 'text-primary-container' : 'text-on-surface-variant'
            }`}
          >
            {STATUS_LABEL[table.status] ?? table.status}
          </span>
        </button>
      </div>

      <p className="text-[11px] text-on-surface-variant opacity-70 text-center mt-auto">
        Bu QR kod müşterilerin dijital menüye erişmesini sağlar.
      </p>

      <button
        type="button"
        onClick={() => onDelete(table.tableNo)}
        className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-error hover:bg-error-container/10 rounded-lg text-label-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
        Masa Sil
      </button>
    </div>
  );
}
