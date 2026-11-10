import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { menuItemsApi } from '../../api/menuItems.js';
import { categoriesApi } from '../../api/categories.js';
import { uploadsApi } from '../../api/uploads.js';
import { ApiError } from '../../api/client.js';
import '../AddProduct/AddProduct.css';

const emptyForm = {
  category: '',
  name: '',
  recipe: '',
  imageUrl: '',
  price: '',
  stockQuantity: '',
  averagePreparationTime: '',
  calories: '',
  isAvailable: true,
};

export default function AddProduct() {
  const toast = useToast();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(productId);

  const [form, setForm] = useState(emptyForm);
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientPriceInput, setIngredientPriceInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.restaurantId) {
      categoriesApi.getByRestaurant(user.restaurantId).then(setCategories).catch(() => {});
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    if (!isEditMode) return;

    let cancelled = false;
    menuItemsApi
      .getById(productId)
      .then((product) => {
        if (cancelled || !product) return;
        setForm({
          category: product.category ?? '',
          name: product.name ?? '',
          recipe: product.recipe ?? '',
          imageUrl: product.imageUrl ?? '',
          price: product.price ? String(product.price / 100) : '',
          calories: product.calories == null ? '' : String(product.calories),
          stockQuantity: product.stockQuantity == null ? '' : String(product.stockQuantity),
          averagePreparationTime: product.averagePreparationTime ? String(product.averagePreparationTime) : '',
          isAvailable: product.isAvailable ?? true,
        });
        setIngredients(
  (product.ingredients ?? []).map((name, index) => ({
    name,
    price: product.ingredientPrices?.[index] ?? null,
  })),
);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Ürün yüklenemedi.'))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [isEditMode, productId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await uploadsApi.upload(user.restaurantId, file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Görsel yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddIngredient = () => {
  const name = ingredientInput.trim();

  if (!name) {
    toast.warning('Malzeme adını girin.');
    return;
  }

  const hasPrice = ingredientPriceInput !== '';
  const price = hasPrice ? Math.round(Number(ingredientPriceInput) * 100) : null;

  if (
    hasPrice &&
    (!/^\d+(?:\.\d{1,2})?$/.test(ingredientPriceInput) ||
      !Number.isSafeInteger(price))
  ) {
    toast.warning('Malzeme fiyatı sıfır veya daha büyük olmalı ve en fazla iki ondalık basamak içermeli.');
    return;
  }

  setIngredients((prev) => [...prev, { name, price }]);
  setIngredientInput('');
  setIngredientPriceInput('');
};
  const handleRemoveIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  const handleSave = async () => {
    if (!form.category || !form.name.trim() || !form.price || !form.averagePreparationTime) {
      toast.warning('Lütfen kategori, ürün adı, fiyat ve hazırlanma süresini doldurun.');
      return;
    }

    if (ingredientInput.trim() || ingredientPriceInput !== '') {
  toast.warning('Kaydetmeden önce yazdığınız malzemeyi Ekle düğmesiyle listeye ekleyin.');
  return;
}

const calories = form.calories === '' ? null : Number(form.calories);

if (calories !== null && (!Number.isSafeInteger(calories) || calories < 0)) {
  toast.warning('Kalori değeri sıfır veya daha büyük bir tam sayı olmalı.');
  return;
}

const stockQuantity =
  form.stockQuantity === '' ? null : Number(form.stockQuantity);

if (stockQuantity !== null && (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0)) {
  toast.warning('Stok miktarı sıfır veya daha büyük bir tam sayı olmalı.');
  return;
}

    const payload = {
      restaurantId: user.restaurantId,
      category: form.category,
      name: form.name.trim(),
      imageUrl: form.imageUrl.trim(),
      calories,
      stockQuantity,
ingredients: ingredients.map(({ name }) => name),
ingredientPrices: ingredients.map(({ price }) => price),
      recipe: form.recipe.trim() || null,
      averagePreparationTime: Number(form.averagePreparationTime),
      price: Math.round(Number(form.price) * 100),
      isAvailable: form.isAvailable,
    };

    setIsSaving(true);
    setError('');
    try {
      if (isEditMode) {
        await menuItemsApi.update(productId, payload);
      } else {
        await menuItemsApi.create(payload);
      }
      navigate('/admin/products');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ürün kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
          Ürün Yönetimi
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Yeni ürün ekleyin veya mevcut ürün bilgilerini güncelleyin.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col items-center justify-center h-[400px] lg:h-full">
          <div className="flex flex-col items-center gap-md w-full px-6">
            <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant overflow-hidden">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Ürün görseli"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-[48px]">
                  add_a_photo
                </span>
              )}
            </div>

            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-background mb-1">
                Ürün Görseli
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                PNG, JPG veya WEBP (Maks. 5MB)
              </p>
            </div>

            <label className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined">upload</span>
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
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
          <h3 className="font-headline-sm text-headline-sm text-on-background border-l-4 border-secondary-container pl-3">
            Ürün Bilgileri
          </h3>

          <div className="flex flex-col gap-6">
            <Field label="Kategori">
              {categories.length > 0 ? (
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="admin-input"
                >
                  <option value="">Ürün kategorisi seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="admin-input"
                  placeholder="Örn: Kahveler"
                  type="text"
                />
              )}
            </Field>

            <Field label="Ürün Adı">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="admin-input"
                placeholder="Örn: Izgara Köfte"
                type="text"
              />
            </Field>

            <Field label="Tarif / Açıklama">
              <textarea
                name="recipe"
                value={form.recipe}
                onChange={handleChange}
                className="admin-input resize-none"
                placeholder="Ürün içeriği ve detayları..."
                rows="3"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fiyat (₺)">
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="admin-input"
                  placeholder="0.00"
                  type="number"
                />
              </Field>

              <Field label="Hazırlanma Süresi (dk)">
                <input
                  name="averagePreparationTime"
                  value={form.averagePreparationTime}
                  onChange={handleChange}
                  className="admin-input"
                  placeholder="0"
                  type="number"
                />
              </Field>
              <Field label="Kalori (kcal)">
  <input
    name="calories"
    type="number"
    min="0"
    step="1"
    value={form.calories}
    onChange={handleChange}
    className="admin-input"
    placeholder="Örn: 350"
  />
</Field>
<Field label="Stok Miktarı (adet)">
  <input
    name="stockQuantity"
    type="number"
    min="0"
    step="1"
    inputMode="numeric"
    value={form.stockQuantity}
    onChange={handleChange}
    className="admin-input"
    placeholder="Örn: 25"
  />
</Field>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface-variant">
                Ürün Durumu
              </label>

              <div className="flex bg-surface-container-low p-1 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, isAvailable: true }))}
                  className={`px-6 py-2 rounded-md font-label-md text-label-md ${
                    form.isAvailable
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high transition-colors'
                  }`}
                >
                  Aktif
                </button>

                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, isAvailable: false }))}
                  className={`px-6 py-2 rounded-md font-label-md text-label-md ${
                    !form.isAvailable
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high transition-colors'
                  }`}
                >
                  Tükendi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
        <h3 className="font-headline-sm text-headline-sm text-on-background mb-md border-l-4 border-secondary-container pl-3">
          Malzemeler
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
          <Field label="Malzeme">
            <input
              className="admin-input"
              placeholder="Örn: Kaşar Peyniri"
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIngredient();
                }
              }}
            />
          </Field>

          <Field label="Malzeme Fiyatı (₺)">
  <input
    type="number"
    min="0"
    step="0.01"
    inputMode="decimal"
    value={ingredientPriceInput}
    onChange={(e) => setIngredientPriceInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddIngredient();
      }
    }}
    className="admin-input"
    placeholder="0,00"
  />
</Field>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full bg-primary-container text-on-primary-container py-2 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
            >
              Ekle
            </button>
          </div>
        </div>

        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={`${ingredient.name}-${index}`}
                className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2"
              >
                <span className="font-label-md text-label-md text-on-background">
  {ingredient.name}
</span>

{ingredient.price !== null && (
  <span className="font-label-md text-label-md text-on-surface-variant">
    {new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(ingredient.price / 100)}
  </span>
)}

                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end gap-md pt-md">
        <button
          type="button"
          onClick={handleCancel}
          className="px-8 py-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors"
        >
          Vazgeç
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isSaving ? 'Kaydediliyor...' : isEditMode ? 'Ürünü Güncelle' : 'Ürünü Kaydet'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-md text-label-md text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}
