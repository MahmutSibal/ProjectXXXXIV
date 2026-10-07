import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { reportsApi } from '../../api/reports.js';
import { formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import './AdminDashboard.css';
import '../AdminDashboard/AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([reportsApi.getDashboard(), reportsApi.getDaily()])
      .then(([summaryData, dailyData]) => {
        setSummary(summaryData);
        setDaily(dailyData);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Rapor verileri yüklenemedi.'));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Tekrar hoş geldiniz,{' '}
            <span className="text-primary-container">{user?.name}</span>
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            İşletmenizin günlük performans özeti ve analitik verileri.
          </p>
        </div>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {summary && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          <KpiHighlight value={formatKurus(summary.dailyRevenue)} />
          <KpiCard title="Aktif Siparişler" icon="receipt_long" value={String(summary.activeOrders)} desc={`Bugün ${summary.dailyOrderCount} sipariş alındı`} />
          <KpiCard title="Ortalama Sepet Tutarı" icon="shopping_basket" value={formatKurus(summary.averageBasket)} desc="" />
          <KpiCard title="Toplam Ürün" icon="inventory_2" value={String(summary.productCount)} desc="Menü Öğesi" />
          <KpiCard title="Toplam Masa" icon="table_restaurant" value={String(summary.tableCount)} desc="" />
          <KpiCard title="Personel Sayısı" icon="group" value={String(summary.staffCount)} desc="" />
        </section>
      )}

      {daily && <SalesTable hourly={daily.hourly} />}

      <section className="bg-surface-container-low p-gutter rounded-xl border border-outline-variant">
        <h3 className="font-headline-sm text-headline-sm text-on-background mb-md border-l-4 border-secondary-container pl-3">
          Hızlı İşlemler
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <QuickAction icon="add_circle" label="Ürün Ekle" onClick={() => navigate('/admin/products')} />
          <QuickAction icon="category" label="Kategori Oluştur" onClick={() => navigate('/admin/categories')} />
          <QuickAction icon="add_box" label="Masa Ekle" onClick={() => navigate('/admin/tables')} />
          <QuickAction icon="person_add" label="Personel Ekle" onClick={() => navigate('/admin/staff')} />
        </div>
      </section>
    </div>
  );
}

function KpiHighlight({ value }) {
  return (
    <div className="bg-primary-container text-on-primary-container rounded-xl p-md ambient-shadow flex flex-col justify-between h-[160px] border-t-2 border-t-primary-container">
      <div className="flex justify-between items-start">
        <span className="font-label-md text-label-md opacity-90">Günlük Ciro</span>
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          payments
        </span>
      </div>

      <div>
        <p className="font-headline-xl text-headline-xl mb-1 text-white">{value}</p>
      </div>
    </div>
  );
}

function KpiCard({ title, icon, value, desc }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col justify-between h-[160px] border-t-2 border-t-primary-container">
      <div className="flex justify-between items-start">
        <span className="font-label-md text-label-md text-on-surface-variant">{title}</span>
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary-container">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>

      <div>
        <p className="font-headline-lg text-headline-lg text-on-background">{value}</p>
        {desc && <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{desc}</p>}
      </div>
    </div>
  );
}

function SalesTable({ hourly }) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
      <div className="flex justify-between items-center mb-md">
        <h3 className="font-headline-sm text-headline-sm text-on-background">
          Saatlik Satış Performansı
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md border-b border-outline-variant">
              <th className="py-4 px-4 rounded-tl-lg">Saat</th>
              <th className="py-4 px-4">Sipariş Sayısı</th>
              <th className="py-4 px-4">Toplam Satış</th>
              <th className="py-4 px-4 rounded-tr-lg">Ortalama Sepet</th>
            </tr>
          </thead>

          <tbody className="font-body-sm text-body-sm text-on-background">
            {hourly.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-on-surface-variant">
                  Bugün için henüz veri yok.
                </td>
              </tr>
            ) : (
              hourly.map((row) => (
                <tr
                  key={row.hour}
                  className="border-b border-outline-variant hover:bg-surface-container-low transition-colors last:border-b-0"
                >
                  <td className="py-4 px-4 font-medium">{row.label}</td>
                  <td className="py-4 px-4">{row.orderCount}</td>
                  <td className="py-4 px-4">{formatKurus(row.totalSales)}</td>
                  <td className="py-4 px-4">{formatKurus(row.averageBasket)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surface-container-lowest border border-outline-variant hover:border-primary-container rounded-xl p-md flex flex-col items-center justify-center gap-3 transition-all group ambient-shadow hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-full bg-surface-container group-hover:bg-primary-container transition-colors flex items-center justify-center text-on-surface-variant group-hover:text-on-primary-container">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <span className="font-label-md text-label-md text-on-background">{label}</span>
    </button>
  );
}
