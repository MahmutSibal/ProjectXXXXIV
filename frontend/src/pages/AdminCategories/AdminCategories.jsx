import { useEffect, useMemo, useState } from 'react';
import { matchesSearch, normalizeForSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { categoriesApi } from '../../api/categories.js';
import { uploadsApi } from '../../api/uploads.js';
import { ApiError } from '../../api/client.js';
import './AdminCategories.css';

const defaultImage =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';

export default function AdminCategories() {
  const toast = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', desc: '', image: '' });

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    categoriesApi
      .getByRestaurant(user.restaurantId)
      .then((data) => !cancelled && setCategories(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Kategoriler yüklenemedi.'))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [user?.restaurantId]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) =>
      matchesSearch(category.name, searchTerm)
    );
  }, [categories, searchTerm]);

  const isEditMode = editingCategoryId !== null;

  const handleOpenAddModal = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', desc: '', image: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, desc: category.description, image: category.imageUrl });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategoryId(null);
    setCategoryForm({ name: '', desc: '', image: '' });
  };

  const handleSubmitCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.desc.trim()) {
      toast.warning('Lütfen kategori adı ve açıklamasını doldurun.');
      return;
    }

    const cleanName = categoryForm.name.trim();
    const cleanDesc = categoryForm.desc.trim();

    const isDuplicate = categories.some(
      (category) =>
        category.id !== editingCategoryId &&
        normalizeForSearch(category.name) === normalizeForSearch(cleanName)
    );

    if (isDuplicate) {
      toast.warning('Bu kategori adı zaten mevcut.');
      return;
    }

    const payload = { name: cleanName, description: cleanDesc, imageUrl: categoryForm.image || defaultImage };

    try {
      if (isEditMode) {
        await categoriesApi.update(editingCategoryId, payload);
        setCategories((prev) =>
          prev.map((category) => (category.id === editingCategoryId ? { ...category, ...payload } : category)),
        );
      } else {
        const { categoryId } = await categoriesApi.create({ restaurantId: user.restaurantId, ...payload });
        setCategories((prev) => [...prev, { id: categoryId, restaurantId: user.restaurantId, ...payload }]);
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Kategori kaydedilemedi.');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    try {
      await categoriesApi.remove(categoryId);
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Kategori silinemedi.');
    }
  };

  return (
    <>
      <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
              Kategoriler
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Menünüzde bulunan kategorileri buradan yönetebilir, düzenleyebilir
              veya yeni kategoriler ekleyebilirsiniz.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">add</span>
            Kategori Ekle
          </button>
        </section>

        <section className="relative w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>

          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
            placeholder="Kategori ara..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </section>

        {error && <p className="text-error font-body-md text-body-md">{error}</p>}

        {isLoading ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
        ) : filteredCategories.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Henüz kategori eklenmemiş.</p>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteCategory}
              />
            ))}
          </section>
        )}
      </div>

      {isModalOpen && (
        <CategoryModal
          isEditMode={isEditMode}
          form={categoryForm}
          onChange={setCategoryForm}
          onClose={handleCloseModal}
          onSubmit={handleSubmitCategory}
          restaurantId={user?.restaurantId}
        />
      )}
    </>
  );
}

function CategoryCard({ category, onEdit, onDelete }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden ambient-shadow hover:shadow-md transition-all group">
      <div className="h-40 overflow-hidden">
        <img
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={category.imageUrl}
        />
      </div>

      <div className="p-md">
        <h4 className="font-headline-sm text-headline-sm text-on-background mb-1">
          {category.name}
        </h4>

        <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
          {category.description}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="flex-1 flex items-center justify-center gap-2 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Düzenle
          </button>

          <button
            type="button"
            onClick={() => onDelete(category.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 border border-error text-error rounded-lg text-label-md font-label-md hover:bg-error-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              delete
            </span>
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ isEditMode, form, onChange, onClose, onSubmit, restaurantId }) {
  const toast = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (field, value) => {
    onChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await uploadsApi.upload(restaurantId, file);
      handleChange('image', url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Görsel yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-md border-b border-outline-variant flex justify-between items-start">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary-container">
              {isEditMode ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </h3>

            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {isEditMode
                ? 'Kategori bilgilerini güncellemek için alanları düzenleyin.'
                : 'Menüye yeni bir kategori eklemek için kategori bilgilerini girin.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md flex flex-col gap-md">
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-background">
              Kategori Görseli
            </label>

            <div className="h-36 bg-surface-container-low border border-dashed border-outline-variant rounded-lg overflow-hidden flex items-center justify-center">
              {form.image ? (
                <img
                  src={form.image}
                  alt="Kategori görseli"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-[42px] text-on-surface-variant">
                  add_photo_alternate
                </span>
              )}
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {isUploading ? 'Yükleniyor...' : 'Görsel Yükle'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileSelect}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-background">
              Kategori Adı
            </label>

            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 px-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
              placeholder="Örn: Kahveler"
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-background">
              Kategori Açıklaması
            </label>

            <textarea
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 px-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all resize-none"
              placeholder="Örn: Sıcak ve soğuk kahve çeşitleri."
              rows="3"
              value={form.desc}
              onChange={(e) => handleChange('desc', e.target.value)}
            />
          </div>
        </div>

        <div className="p-md bg-surface-container-low flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            İptal
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="px-6 py-2.5 rounded-lg font-label-md text-label-md bg-primary-container text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            {isEditMode ? 'Güncelle' : 'Kategori Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}
