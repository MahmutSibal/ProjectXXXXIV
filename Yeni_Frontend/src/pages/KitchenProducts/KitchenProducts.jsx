import './KitchenProducts.css';
import { matchesSearch } from '../../lib/text.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { menuItemsApi } from '../../api/menuItems.js';
import { formatKurus } from '../../api/enums.js';
import { ApiError } from '../../api/client.js';

export default function KitchenProducts() {
  const toast = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }
    menuItemsApi
      .getByRestaurant(user.restaurantId)
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Ürünler yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [user?.restaurantId]);

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesSearch(product.name, searchTerm)),
    [products, searchTerm],
  );

  const handleToggleAvailability = async (product) => {
    try {
      await menuItemsApi.setAvailability(product.id, !product.isAvailable);
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, isAvailable: !item.isAvailable } : item)),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ürün durumu güncellenemedi.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">
            Mutfak Ürünleri
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Mutfak tarafında ürün durumlarını takip edebilir, ürünleri aktif
            veya tükendi olarak işaretleyebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-sm w-full lg:w-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Toplam</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {products.length}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Aktif</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {products.filter((product) => product.isAvailable).length}
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 ambient-shadow">
            <p className="text-label-sm text-on-surface-variant">Tükendi</p>
            <p className="font-headline-sm text-headline-sm text-on-background">
              {products.filter((product) => !product.isAvailable).length}
            </p>
          </div>
        </div>
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
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
          {filteredProducts.map((product) => (
            <KitchenProductCard
              key={product.id}
              product={product}
              onToggleAvailability={handleToggleAvailability}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function KitchenProductCard({ product, onToggleAvailability }) {
  const isSoldOut = !product.isAvailable;

  return (
    <div
      className={`bg-surface-container-lowest border rounded-xl overflow-hidden ambient-shadow hover:shadow-md transition-all group ${
        isSoldOut ? 'border-error-container opacity-90' : 'border-outline-variant'
      }`}
    >
      <div className="h-48 overflow-hidden relative bg-surface-container-high">
        {product.imageUrl && (
          <img
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={product.imageUrl}
          />
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="bg-error text-on-error px-4 py-2 rounded-full text-label-sm font-bold">
              TÜKENDİ
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2 gap-3">
          <div>
            <h4 className="font-bold text-body-lg text-on-background">
              {product.name}
            </h4>

            <p className="text-label-sm text-on-surface-variant">
              {product.category || 'Kategorisiz'}
            </p>
          </div>

          <span className={`product-status product-status-${isSoldOut ? 'soldout' : 'active'}`}>
            {isSoldOut ? 'TÜKENDİ' : 'AKTİF'}
          </span>
        </div>

        <div className="flex justify-between items-end gap-md">
          <p className="text-headline-sm font-bold text-primary-container">
            {formatKurus(product.price)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleAvailability(product)}
          className={`mt-4 w-full px-4 py-3 rounded-lg font-label-md text-label-md transition-opacity ${
            isSoldOut
              ? 'bg-primary-container text-on-primary-container hover:opacity-90'
              : 'bg-error-container text-on-error-container hover:opacity-90'
          }`}
        >
          {isSoldOut ? 'Tekrar Aktif Yap' : 'Tükendi Olarak İşaretle'}
        </button>
      </div>
    </div>
  );
}
