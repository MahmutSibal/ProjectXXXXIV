import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { usersApi } from '../../api/users.js';
import { ROLES } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { toPage } from '../../api/pagination.js';
import Pagination from '../../components/Pagination.jsx';

const ROLE_LABEL = {
  [ROLES.SuperAdmin]: 'SuperAdmin',
  [ROLES.RestaurantOwner]: 'İşletme Sahibi',
  [ROLES.Customer]: 'Müşteri',
  [ROLES.Kitchen]: 'Mutfak',
  [ROLES.Waiter]: 'Garson',
};

const emptyForm = { name: '', email: '', password: '', role: ROLES.Customer, restaurantId: '' };

export default function SuperAdminUsers() {
  const toast = useToast();
  const [result, setResult] = useState(() => toPage(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, roleFilter, pageSize]);

  // Arama/filtre sunucuda uygulanır; kullanıcı sayısı büyüdükçe tüm listeyi çekmek sürdürülemez.
  const loadUsers = () =>
    usersApi
      .getAll({ page, pageSize, search: appliedSearch, role: roleFilter })
      .then((data) => {
        setResult(toPage(data, pageSize));
        setError('');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Kullanıcılar yüklenemedi.'));

  useEffect(() => {
    setIsLoading(true);
    loadUsers().finally(() => setIsLoading(false));
    // loadUsers her render'da yeniden kurulur; bağımlılık olarak sorgu girdileri yeterli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, appliedSearch, roleFilter]);

  const filteredUsers = result.items;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.warning('Lütfen ad, e-posta ve şifre alanlarını doldurun.');
      return;
    }

    setIsSaving(true);
    try {
      await usersApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: Number(form.role),
        restaurantId: form.restaurantId.trim() || null,
      });
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Kullanıcı oluşturulamadı.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeRole = async (user) => {
    const roleNames = Object.entries(ROLE_LABEL).map(([value, label]) => `${value}=${label}`).join(', ');
    const input = window.prompt(`Yeni rol numarasını girin (${roleNames}):`, String(user.role));
    if (!input) return;

    const nextRole = Number(input);
    if (!ROLE_LABEL[nextRole]) {
      toast.warning('Geçersiz rol.');
      return;
    }

    let restaurantId = user.restaurantId;
    if (nextRole === ROLES.RestaurantOwner || nextRole === ROLES.Kitchen || nextRole === ROLES.Waiter) {
      restaurantId = window.prompt('Restaurant ID (bu role bağlı restoran):', user.restaurantId || '') || null;
    } else {
      restaurantId = null;
    }

    try {
      await usersApi.updateRole(user.id, nextRole, restaurantId);
      // Rol filtresi açıkken kullanıcı sayfadan düşebilir; listeyi sunucudan tazele.
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Rol güncellenemedi.');
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(`${user.name} için yeni şifre girin (en az 8 karakter):`);
    if (!newPassword) return;

    try {
      await usersApi.resetPassword(user.id, newPassword);
      toast.success('Şifre güncellendi.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Şifre sıfırlanamadı.');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`${user.name} (${user.email}) kullanıcısını silmek istediğinize emin misiniz?`)) return;

    try {
      await usersApi.remove(user.id);
      // Sayfadaki son kayıt silindiyse boş sayfada kalmamak için bir geri git;
      // sayfa değişimi zaten yeniden yüklemeyi tetikler.
      if (result.items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadUsers();
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Kullanıcı silinemedi.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Kullanıcı Yönetimi
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Platformdaki tüm kullanıcıları görüntüleyebilir, rol atayabilir, şifre
            sıfırlayabilir veya hesap silebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined">person_add</span>
          Kullanıcı Ekle
        </button>
      </section>

      <div className="flex flex-col md:flex-row gap-md">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
            placeholder="İsim veya e-posta ara..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 text-body-sm outline-none focus:border-primary-container md:w-56"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tüm Roller</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md border-b border-outline-variant">
                <th className="py-4 px-6">İsim</th>
                <th className="py-4 px-6">E-posta</th>
                <th className="py-4 px-6">Rol</th>
                <th className="py-4 px-6">Restoran</th>
                <th className="py-4 px-6">Durum</th>
                <th className="py-4 px-6 text-right">İşlem</th>
              </tr>
            </thead>

            <tbody className="font-body-sm text-body-sm text-on-background">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-10 px-6 text-center text-on-surface-variant">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 px-6 text-center text-on-surface-variant">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      index !== filteredUsers.length - 1 ? 'border-b border-outline-variant' : ''
                    }`}
                  >
                    <td className="py-4 px-6 font-medium">{user.name}</td>
                    <td className="py-4 px-6">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">
                      {user.restaurantId ? user.restaurantId.slice(0, 8) + '…' : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          user.isActive ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {user.isActive ? 'AKTİF' : 'PASİF'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleChangeRole(user)}
                          className="text-on-surface-variant hover:text-primary-container transition-colors"
                          title="Rol değiştir"
                        >
                          <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          className="text-on-surface-variant hover:text-primary-container transition-colors"
                          title="Şifre sıfırla"
                        >
                          <span className="material-symbols-outlined text-[20px]">key</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-xl border border-outline-variant overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-start">
              <h3 className="font-headline-sm text-headline-sm text-primary-container">
                Yeni Kullanıcı Ekle
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-md flex flex-col gap-md">
              <Field label="Ad Soyad">
                <input name="name" value={form.name} onChange={handleChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none" type="text" />
              </Field>
              <Field label="E-posta">
                <input name="email" value={form.email} onChange={handleChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none" type="email" />
              </Field>
              <Field label="Şifre">
                <input name="password" value={form.password} onChange={handleChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none" type="password" />
              </Field>
              <Field label="Rol">
                <select name="role" value={form.role} onChange={handleChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none">
                  {Object.entries(ROLE_LABEL)
                    .filter(([value]) => Number(value) !== ROLES.SuperAdmin)
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Restoran ID (opsiyonel)">
                <input name="restaurantId" value={form.restaurantId} onChange={handleChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none" type="text" />
              </Field>
            </div>

            <div className="p-md bg-surface-container-low flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-lg font-label-md text-label-md bg-primary-container text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
              >
                {isSaving ? 'Oluşturuluyor...' : 'Kullanıcı Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-md text-label-md text-on-surface-variant">{label}</label>
      {children}
    </div>
  );
}
