import { parseApiDate } from '../../lib/date.js';
import { useEffect, useState } from 'react';
import { ROLE_LABEL_SHORT as ROLE_LABEL, ROLE_FILTER_OPTIONS } from '../../api/roles.js';
import { auditLogsApi } from '../../api/auditLogs.js';
import { ApiError } from '../../api/client.js';
import { toPage } from '../../api/pagination.js';
import Pagination from '../../components/Pagination.jsx';

function actionIconFor(action) {
  const lower = action.toLowerCase();
  if (lower.includes('delet') || lower.includes('remov')) return { icon: 'delete', color: 'text-red-600' };
  if (lower.includes('creat') || lower.includes('add') || lower.includes('open') || lower.includes('regist')) {
    return { icon: 'add_circle', color: 'text-primary-container' };
  }
  return { icon: 'edit', color: 'text-blue-600' };
}

export default function SuperAdminAuditLogs() {
  const [result, setResult] = useState(() => toPage(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Yazarken her tuşta istek atmamak için aramayı geciktir.
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtre değişince 1. sayfaya dön: yoksa boş sayfa görünebilir.
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
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Denetim kayıtları yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Eski istek geç dönerse yeni sonucun üzerine yazmasın.
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedSearch, roleFilter]);

  const logs = result.items;

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-headline-lg text-headline-lg text-on-background">
          Denetim Kayıtları
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Platform genelinde (tüm restoranlar) gerçekleşen yönetim işlemlerini
          buradan izleyebilirsiniz.
        </p>
      </section>

      <div className="flex flex-col md:flex-row gap-md bg-surface-container-low p-4 rounded-xl border border-outline-variant">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
            placeholder="Kullanıcı, işlem veya kayıt türü ara..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-4 text-body-sm outline-none focus:border-primary-container md:w-56"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tüm Roller</option>
          {ROLE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
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
                  <th className="py-4 px-4">Kullanıcı</th>
                  <th className="py-4 px-4">Rol</th>
                  <th className="py-4 px-4">İşlem</th>
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
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                          {ROLE_LABEL[log.actorRole] ?? '-'}
                        </span>
                      </td>
                      <td className={`py-4 px-4 flex items-center gap-2 ${color}`}>
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                        {log.actionLabel ?? log.action}
                      </td>
                      <td className="py-4 px-4">{log.details}</td>
                      <td className="py-4 px-4">
                        {log.entityType} · {log.entityId?.slice(0, 8)}
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
    </div>
  );
}
