import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { restaurantsApi } from '../../api/restaurants.js';
import { usersApi } from '../../api/users.js';
import { ROLES } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import './SuperAdminRestaurant.css';

const emptyForm = { name: '', slug: '', address: '', longitude: '', latitude: '', ownerId: '' };

export default function SuperAdminRestaurant() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Sahip adayları = henüz bir restorana bağlı olmayan kullanıcılar. Süzme sunucuda
    // yapılır: tüm kullanıcı listesini çekip istemcide elemek, liste büyüdüğünde
    // sayfa sınırına takılıp adayların bir kısmını sessizce gizlerdi.
    Promise.all([
      restaurantsApi.getAll(),
      usersApi.getAll({ onlyWithoutRestaurant: true, pageSize: MAX_PAGE_SIZE }),
    ])
      .then(([restaurantsData, usersData]) => {
        setRestaurants(restaurantsData);
        setUsers(toPage(usersData).items);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Restoranlar yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => matchesSearch(restaurant.name, searchTerm));
  }, [restaurants, searchTerm]);

  // Sunucu zaten yalnızca restoransız kullanıcıları döndürüyor.
  const ownerCandidates = users;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.address.trim() || !form.ownerId || !form.longitude || !form.latitude) {
      toast.warning('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsSaving(true);
    try {
      const { restaurantId } = await restaurantsApi.create({
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        ownerId: form.ownerId,
        longitude: Number(form.longitude),
        latitude: Number(form.latitude),
        address: form.address.trim(),
      });

      await usersApi.updateRole(form.ownerId, ROLES.RestaurantOwner, restaurantId);

      const created = await restaurantsApi.getById(restaurantId);
      setRestaurants((prev) => [...prev, created]);
      setUsers((prev) => prev.filter((user) => user.id !== form.ownerId));
      closeModal();
      toast.success('Restoran oluşturuldu.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Restoran oluşturulamadı.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetails = (restaurant) => {
    navigate(`/super-admin/restaurants/${restaurant.id}`);
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Restoranlar
          </h2>

          <p className="font-body-md text-body-md text-on-surface-variant">
            Platforma kayıtlı restoranları buradan inceleyebilir, yeni bir işletme
            başvurusunu onaylayıp restoran kaydı açabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Restoran Ekle
        </button>
      </section>

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>

        <input
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-10 pr-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
          placeholder="Restoran ara..."
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : filteredRestaurants.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Henüz restoran eklenmemiş.</p>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md hover:border-primary-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center text-white shrink-0">
                  <span className="material-symbols-outlined text-[28px]">restaurant</span>
                </div>

                <div className="min-w-0">
                  <h3 className="font-headline-sm text-headline-sm text-on-background mb-1 truncate">
                    {restaurant.name}
                  </h3>

                  {restaurant.slug && (
                    <p className="text-label-sm text-on-surface-variant truncate">/{restaurant.slug}</p>
                  )}
                </div>
              </div>

              <p className="text-body-sm text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">location_on</span>
                <span>{restaurant.address || 'Adres belirtilmemiş'}</span>
              </p>

              <button
                type="button"
                onClick={() => handleViewDetails(restaurant)}
                className="w-full bg-primary-container text-on-primary-container font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Detayları Gör
              </button>
            </div>
          ))}
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overlay-shadow w-full max-w-[520px] overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-start gap-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary-container">
                  Yeni Restoran Ekle
                </h3>

                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Yeni işletme başvurusu için restoran kaydı oluşturun.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1 transition-colors"
                aria-label="Modalı kapat"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-md flex flex-col gap-md">
              <Field label="İşletme Sahibi">
                <select
                  name="ownerId"
                  value={form.ownerId}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                >
                  <option value="">Kullanıcı seçin</option>
                  {ownerCandidates.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Restoran Adı">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                  type="text"
                />
              </Field>

              <Field label="Slug (URL adı)">
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                  type="text"
                  placeholder="ornek-restoran"
                />
              </Field>

              <Field label="Adres">
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                  type="text"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Boylam (Longitude)">
                  <input
                    name="longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    type="number"
                    step="any"
                  />
                </Field>

                <Field label="Enlem (Latitude)">
                  <input
                    name="latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    type="number"
                    step="any"
                  />
                </Field>
              </div>
            </div>

            <div className="p-md bg-surface-container-low flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
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
                {isSaving ? 'Oluşturuluyor...' : 'Restoranı Oluştur'}
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
