import './ProductManagement.css';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { menuItemsApi } from '../../api/menuItems.js';
import { ApiError } from '../../api/client.js';

function formatPrice(priceInKurus) {
  return `₺${(priceInKurus / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ProductManagement() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    menuItemsApi
      .getByRestaurant(user.restaurantId)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Ürünler yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.restaurantId]);

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesSearch(product.name, searchTerm)),
    [products, searchTerm],
  );

  const handleDelete = async (productId) => {
    const confirmed = window.confirm('Bu ürünü silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    try {
      await menuItemsApi.remove(productId);
      setProducts((prev) => prev.filter((product) => product.id !== productId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ürün silinemedi.');
    }
  };

  const handleEdit = (productId) => {
    navigate(`/admin/products/edit/${productId}`);
  };

  const handleToggleAvailable = async (product) => {
    try {
      const updated = await menuItemsApi.update(product.id, {
        category: product.category,
        name: product.name,
        imageUrl: product.imageUrl,
        ingredients: product.ingredients,
        recipe: product.recipe,
        averagePreparationTime: product.averagePreparationTime,
        price: product.price,
        isAvailable: !product.isAvailable,
      });
      setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, isAvailable: updated?.isAvailable ?? !product.isAvailable } : item)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ürün güncellenemedi.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Ürünler
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Ürünlerinizi görüntüleyin, arayın ve yeni ürün ekleyin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/products/add')}
          className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Yeni Ürün Ekle
        </button>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>

          <input
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-12 pr-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
            placeholder="Ürün ara..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Henüz ürün eklenmemiş.</p>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onToggleAvailable={handleToggleAvailable}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ProductCard({ product, onDelete, onEdit, onToggleAvailable }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden ambient-shadow hover:shadow-md transition-all group">
      <div className="p-4 pb-3 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center justify-between gap-3">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {product.category || 'Kategorisiz'}
          </span>

          <button
            type="button"
            onClick={() => onToggleAvailable(product)}
            className="flex items-center gap-2"
            aria-label="Ürünü satışa aç veya kapat"
          >
            <span
              className={`text-label-sm font-bold ${
                product.isAvailable ? 'text-primary-container' : 'text-on-surface-variant'
              }`}
            >
              {product.isAvailable ? 'Aktif' : 'Pasif'}
            </span>

            <span
              className={`w-11 h-6 rounded-full relative transition-colors ${
                product.isAvailable ? 'bg-primary-container' : 'bg-surface-container-high'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  product.isAvailable ? 'right-1' : 'left-1'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="h-48 overflow-hidden relative bg-surface-container-high">
        {product.imageUrl && (
          <img
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={product.imageUrl}
          />
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2 gap-3">
          <h4 className="font-bold text-body-lg text-on-background">
            {product.name}
          </h4>

          <span className={`product-status product-status-${product.isAvailable ? 'active' : 'passive'}`}>
            {product.isAvailable ? 'AKTİF' : 'PASİF'}
          </span>
        </div>

        {product.recipe && (
          <p className="text-body-sm text-on-surface-variant mb-4 line-clamp-2">
            {product.recipe}
          </p>
        )}

        <div className="flex justify-between items-center">
          <div>
            <p className="text-headline-sm font-bold text-primary-container">
              {formatPrice(product.price)}
            </p>

            <p className="text-label-sm text-on-surface-variant">
              Hazırlanma: {product.averagePreparationTime} dk
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(product.id)}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                edit
              </span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(product.id)}
              className="p-2 rounded-lg hover:bg-error-container hover:text-error text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                delete
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
