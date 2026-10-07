import { useEffect, useState } from 'react';
import { reportsApi } from '../../api/reports.js';
import { formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import './AdminDailyReports.css';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDailyReports() {
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    reportsApi
      .getDaily(selectedDate)
      .then((data) => {
        setReport(data);
        setError('');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Rapor yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [selectedDate]);

  const stats = report
    ? [
        { id: 1, label: 'Toplam Ciro', value: formatKurus(report.totalRevenue) },
        { id: 2, label: 'Toplam Sipariş', value: `${report.orderCount} Sipariş` },
        { id: 3, label: 'Ortalama Sepet Tutarı', value: formatKurus(report.averageBasket) },
        { id: 4, label: 'En Yoğun Saat', value: report.peakHour || '-' },
      ]
    : [];

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Günlük Raporlar
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Seçtiğiniz güne ait satış performansını, sipariş yoğunluğunu ve saatlik
            istatistikleri buradan takip edebilirsiniz.
          </p>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant font-label-md text-label-md text-primary-container"
        />
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading || !report ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col justify-between h-[140px] border-t-2 border-t-primary-container"
              >
                <span className="font-label-md text-label-md text-on-surface-variant">
                  {stat.label}
                </span>

                <p className="font-headline-lg text-headline-lg text-on-background">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
            <h3 className="font-headline-sm text-headline-sm text-on-background mb-md">
              Saatlik Satış Performansı
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md border-b border-outline-variant">
                    <th className="py-4 px-4 rounded-tl-lg">Saat Aralığı</th>
                    <th className="py-4 px-4">Sipariş Sayısı</th>
                    <th className="py-4 px-4">Toplam Satış</th>
                    <th className="py-4 px-4 rounded-tr-lg">Ortalama Sepet</th>
                  </tr>
                </thead>

                <tbody className="font-body-sm text-body-sm text-on-background">
                  {report.hourly.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 px-4 text-on-surface-variant">
                        Bu tarih için veri yok.
                      </td>
                    </tr>
                  ) : (
                    report.hourly.map((row, index) => (
                      <tr
                        key={row.hour}
                        className={`hover:bg-surface-container-low transition-colors ${
                          index !== report.hourly.length - 1 ? 'border-b border-outline-variant' : ''
                        }`}
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
        </>
      )}
    </div>
  );
}
