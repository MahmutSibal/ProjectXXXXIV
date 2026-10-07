import { parseApiDate } from '../../lib/date.js';
import { useEffect, useState } from 'react';
import { ROLE_LABEL_SHORT as ROLE_LABEL, ROLE_FILTER_OPTIONS } from '../../api/roles.js';
import { auditLogsApi } from '../../api/auditLogs.js';
import { ApiError } from '../../api/client.js';
import { toPage } from '../../api/pagination.js';
import Pagination from '../../components/Pagination.jsx';
import './AdminTransactions.css';

/** Yerel günün başlangıcını ISO olarak verir (sunucu UTC bekler). */
function startOfDayIso(daysAgo = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function getRoleClass(role) {
  if (role === 2) return 'bg-primary-container text-on-primary-container';
  if (role === 1) return 'bg-secondary-container text-on-secondary-container';
  return 'bg-surface-container-high text-on-surface-variant';
}

function actionIconFor(action) {
  const lower = action.toLowerCase();
  if (lower.includes('delet') || lower.includes('remov')) return { icon: 'delete', color: 'text-red-600' };
  if (lower.includes('creat') || lower.includes('add') || lower.includes('open')) return { icon: 'add_circle', color: 'text-primary-container' };
  return { icon: 'edit', color: 'text-blue-600' };
}

export default function AdminTransactions() {
  const [result, setResult] = useState(() => toPage(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [counts, setCounts] = useState({ today: 0, week: 0 });

  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, roleFilter, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    auditLogsApi
      .getAll({ page, pageSize, search: appliedSearch, actorRole: roleFilter })
      .then((data) => {
        if (!cancelled) {
          setResult(toPage(data, pageSize));
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'İşlem kayıtları yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedSearch, roleFilter]);

  // İstatistikler sayfadan değil sunucudan gelir: yalnızca açık sayfadaki kayıtları
  // saymak yanıltıcı olurdu. pageSize=1 ile yalnızca toplam sayıyı okuyoruz.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      auditLogsApi.getAll({ page: 1, pageSize: 1, createdFrom: startOfDayIso(0) }),
      auditLogsApi.getAll({ page: 1, pageSize: 1, createdFrom: startOfDayIso(6) }),
    ])
      .then(([today, week]) => {
        if (!cancelled) {
          setCounts({ today: toPage(today).totalCount, week: toPage(week).totalCount });
        }
      })
      .catch(() => {
        // İstatistik ikincil bilgi; hatası ana listeyi engellemesin.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { id: 1, label: 'Bugünkü İşlem Sayısı', value: String(counts.today) },
    { id: 2, label: 'Son 7 Gün', value: String(counts.week) },
    { id: 3, label: 'Toplam Kayıt', value: String(result.totalCount) },
  ];

  const logs = result.items;
  const today = new Date();

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            İşlem Geçmişi
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            İşletmede gerçekleştirilen tüm yönetim işlemlerini, tarih ve
            kullanıcı bilgileriyle birlikte buradan takip edebilirsiniz.
          </p>
        </div>

        <div className="text-right bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant">
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">
            Bugünün Tarihi
          </p>

          <p className="font-body-md text-body-md font-medium text-on-background">
            {today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col justify-between h-[120px] border-t-2 border-t-primary-container"
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

      <section className="bg-surface-container-low p-md rounded-xl border border-outline-variant flex flex-col gap-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>

          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
            placeholder="İşlem ara..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-body-sm outline-none focus:border-primary-container md:w-64"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tüm Roller</option>
          {ROLE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
        <h3 className="font-headline-sm text-headline-sm text-on-background mb-md">
          Sistem İşlem Kayıtları
        </h3>

        {isLoading ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
        ) : logs.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Kayıt bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md border-b border-outline-variant">
                  <th className="py-4 px-4 rounded-tl-lg">Tarih</th>
                  <th className="py-4 px-4">Saat</th>
                  <th className="py-4 px-4">İşlemi Yapan</th>
                  <th className="py-4 px-4">Rol</th>
                  <th className="py-4 px-4">İşlem Türü</th>
                  <th className="py-4 px-4">Açıklama</th>
                  <th className="py-4 px-4 rounded-tr-lg">İlgili Kayıt</th>
                </tr>
              </thead>

              <tbody className="font-body-sm text-body-sm text-on-background">
                {logs.map((log, index) => {
                  const created = parseApiDate(log.createdAt);
                  const { icon, color } = actionIconFor(log.action);

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-surface-container-low transition-colors ${
                        index !== logs.length - 1 ? 'border-b border-outline-variant' : ''
                      }`}
                    >
                      <td className="py-4 px-4">{created.toLocaleDateString('tr-TR')}</td>
                      <td className="py-4 px-4">{created.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-4 px-4">{log.actorName ?? 'Sistem'}</td>

                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getRoleClass(log.actorRole)}`}>
                          {ROLE_LABEL[log.actorRole] ?? '-'}
                        </span>
                      </td>

                      <td className={`py-4 px-4 flex items-center gap-2 ${color}`}>
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                        {log.actionLabel ?? log.action}
                      </td>

                      <td className="py-4 px-4">{log.details}</td>
                      <td className="py-4 px-4">
                        {log.entityType} · {log.entityId.slice(0, 8)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      </section>

      <section className="bg-surface-container-low p-gutter rounded-xl border border-outline-variant">
        <h3 className="font-headline-sm text-headline-sm text-on-background mb-2 border-l-4 border-secondary-container pl-3">
          Kayıt Bilgilendirmesi
        </h3>

        <p className="font-body-md text-body-md text-on-surface-variant">
          Sistem üzerinde gerçekleştirilen tüm işlemler güvenlik amacıyla kayıt
          altına alınmaktadır. İşlem geçmişi yönetici tarafından görüntülenebilir.
        </p>
      </section>
    </div>
  );
}
