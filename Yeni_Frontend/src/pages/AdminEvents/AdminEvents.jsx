import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { eventsApi } from '../../api/events.js';
import { uploadsApi } from '../../api/uploads.js';
import { formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import './AdminEvents.css';

const emptyForm = {
  title: '',
  description: '',
  image: '',
  date: '',
  time: '',
  location: '',
  price: '',
  tags: '',
  isFree: false,
};

export default function AdminEvents() {
  const toast = useToast();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    eventsApi
      .getAll()
      .then(setEvents)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Etkinlikler yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, []);

  const publishedCount = events.filter((event) => event.isPublished).length;

  // Not: eski Tailwind taslağındaki "Yaklaşan Etkinlik" ve "Ortalama Katılım"
  // kartları gerçek bir API alanına karşılık gelmediği için kaldırıldı.
  const stats = [
    { id: 1, label: 'Yayındaki Etkinlik', value: publishedCount },
    { id: 2, label: 'Toplam Etkinlik', value: events.length },
  ];

  const openCreateModal = () => {
    setEditingEventId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      image: event.imageUrl,
      date: event.date,
      time: event.time,
      location: event.location,
      price: event.isFree ? '' : String(event.price / 100),
      tags: event.tags.join(', '),
      isFree: event.isFree,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEventId(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await uploadsApi.upload(user.restaurantId, file);
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Görsel yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.date.trim() || !form.time.trim()) {
      toast.warning('Lütfen etkinlik adı, açıklama, tarih ve saat alanlarını doldurun.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl:
        form.image ||
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
      date: form.date.trim(),
      time: form.time.trim(),
      location: form.location.trim() || 'Etkinlik Alanı',
      price: form.isFree ? 0 : Math.round(Number(form.price || 0) * 100),
      isFree: form.isFree,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    setIsSaving(true);
    try {
      if (editingEventId) {
        await eventsApi.update(editingEventId, { ...payload, isPublished: true });
        setEvents((prev) =>
          prev.map((event) => (event.id === editingEventId ? { ...event, ...payload } : event)),
        );
      } else {
        const { eventId } = await eventsApi.create(payload);
        setEvents((prev) => [{ id: eventId, ...payload, isPublished: true }, ...prev]);
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Etkinlik kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await eventsApi.remove(eventId);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Etkinlik silinemedi.');
    }
  };

  const handleTogglePublish = async (event) => {
    try {
      await eventsApi.update(event.id, {
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price,
        isFree: event.isFree,
        tags: event.tags,
        isPublished: !event.isPublished,
      });
      setEvents((prev) =>
        prev.map((item) => (item.id === event.id ? { ...item, isPublished: !item.isPublished } : item)),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Etkinlik güncellenemedi.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-md">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-background mb-1">
            Etkinlik Tahtası
          </h2>

          <p className="font-body-md text-body-md text-on-surface-variant">
            İşletmenizde düzenleyeceğiniz etkinlikleri oluşturabilir,
            yayınlayabilir ve müşterilerinize duyurabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold shadow-md hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Etkinlik Oluştur
        </button>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 ambient-shadow"
          >
            <p className="text-label-sm text-on-surface-variant mb-1">
              {stat.label}
            </p>
            <p className="text-headline-sm font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : events.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Henüz etkinlik eklenmemiş.</p>
      ) : (
        <section className="flex flex-col gap-lg">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden ambient-shadow flex flex-col md:flex-row"
            >
              <div className="md:w-[40%] h-64 md:h-auto relative bg-surface-container-high">
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="md:w-[60%] p-md flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                      event.isPublished
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {event.isPublished ? 'YAYINDA' : 'YAYINDA DEĞİL'}
                  </span>

                  <span className="text-label-sm text-on-surface-variant md:ml-auto">
                    {event.date}
                  </span>
                </div>

                <h3 className="font-headline-md text-headline-md font-bold mb-2">
                  {event.title}
                </h3>

                <p className="text-body-md text-on-surface-variant mb-4">
                  {event.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-6">
                  <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">
                      calendar_today
                    </span>
                    {event.date}
                  </div>

                  <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">
                      schedule
                    </span>
                    {event.time}
                  </div>

                  <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">
                      location_on
                    </span>
                    {event.location}
                  </div>

                  <div className="flex items-center gap-2 text-body-sm font-bold text-primary">
                    <span className="material-symbols-outlined text-[18px]">
                      payments
                    </span>
                    {event.isFree ? 'Ücretsiz' : formatKurus(event.price)}
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-md">
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-surface-container-high text-on-surface-variant text-[11px] px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDelete(event.id)}
                      className="text-label-sm font-bold text-error hover:underline"
                    >
                      Sil
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(event)}
                      className="px-4 py-2 border border-outline-variant rounded-lg text-label-sm font-bold hover:bg-surface-container-low transition-colors"
                    >
                      {event.isPublished ? 'Yayından Kaldır' : 'Yayına Al'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="px-4 py-2 border border-outline-variant rounded-lg text-label-sm font-bold hover:bg-surface-container-low transition-colors"
                    >
                      Düzenle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overlay-shadow w-full max-w-[760px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-md border-b border-outline-variant">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-background">
                  {editingEventId ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Oluştur'}
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Etkinlik bilgilerini doldurarak yayına hazırlayın.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-md flex flex-col gap-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-label-sm text-on-surface-variant">
                    Etkinlik Görseli
                  </label>

                  <div className="border border-outline-variant rounded-xl bg-surface-container-low p-3">
                    {form.image ? (
                      <img
                        src={form.image}
                        alt="Etkinlik önizleme"
                        className="w-full h-56 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-56 rounded-lg border border-dashed border-outline-variant flex flex-col items-center justify-center text-on-surface-variant mb-3">
                        <span className="material-symbols-outlined text-[48px]">
                          image
                        </span>
                        <p className="text-body-sm">Henüz görsel eklenmedi</p>
                      </div>
                    )}

                    <label className="w-full flex items-center justify-center gap-2 py-2 border border-outline-variant rounded-lg text-label-sm font-bold hover:bg-surface-container-lowest transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      {isUploading ? 'Yükleniyor...' : 'Görsel Yükle'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={isUploading}
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-label-sm text-on-surface-variant">
                    Etkinlik Adı
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    placeholder="Örn: Canlı Müzik Gecesi"
                    type="text"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">
                    Tarih
                  </label>
                  <input
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    placeholder="28 Haziran 2026"
                    type="text"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">
                    Saat
                  </label>
                  <input
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    type="time"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">
                    Konum
                  </label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    placeholder="Ana Salon"
                    type="text"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm text-on-surface-variant">
                    Ücret (₺)
                  </label>
                  <input
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    disabled={form.isFree}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none disabled:opacity-50"
                    placeholder="250"
                    type="number"
                  />
                </div>

                <label className="md:col-span-2 flex items-center gap-2 text-body-sm text-on-surface-variant">
                  <input
                    name="isFree"
                    checked={form.isFree}
                    onChange={handleChange}
                    type="checkbox"
                  />
                  Bu etkinlik ücretsiz
                </label>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-label-sm text-on-surface-variant">
                    Etiketler
                  </label>
                  <input
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    placeholder="Canlı Müzik, Özel Gün"
                    type="text"
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-label-sm text-on-surface-variant">
                    Etkinlik Açıklaması
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none h-28 resize-none"
                    placeholder="Etkinlik içeriğini açıklayın"
                  />
                </div>
              </div>
            </div>

            <div className="p-md border-t border-outline-variant flex justify-end gap-sm">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-3 border border-outline-variant rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-3 bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSaving ? 'Kaydediliyor...' : editingEventId ? 'Etkinliği Güncelle' : 'Etkinliği Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
