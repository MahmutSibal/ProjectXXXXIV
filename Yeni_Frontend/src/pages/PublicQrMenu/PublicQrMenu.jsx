import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProductOptionsModal from '../components/QrMenu/ProductOptionsModal.jsx';
import QrOrdersSheet from '../components/QrMenu/QrOrdersSheet.jsx';
import QrReviewsSection from '../components/QrMenu/QrReviewsSection.jsx';

import useQrCart from '../../context/useQrCart.js';

import {
  getCustomerSession,
  setCustomerSession,
  isSessionValid,
} from '../../api/customerClient.js';
import {
  qrSessionApi,
  customerMenuApi,
} from '../../api/customer.js';

import './PublicQrMenu.css';

// Backend'in Restaurant/MenuItem DTO'larında logo veya "açık/kapalı" alanı yok
// (eski frontend'de de kullanılmıyor); bu yüzden sabit bir yer tutucu görsel
// kullanıyoruz ve masayı her zaman siparişe açık gösteriyoruz.
const FALLBACK_IMAGE = '/sukranapp.png';

const badgeInformation = {
  chef: {
    icon: 'chef_hat',
    label: 'Şefin Tavsiyesi',
    className: 'qr-badge--chef',
  },
  weekly: {
    icon: 'hotel_class',
    label: 'Haftanın Ürünü',
    className: 'qr-badge--weekly',
  },
  bestseller: {
    icon: 'trending_up',
    label: 'En Çok Satan',
    className: 'qr-badge--bestseller',
  },
  new: {
    icon: 'auto_awesome',
    label: 'Yeni Ürün',
    className: 'qr-badge--new',
  },
};

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);
}

function ProductBadges({ badges }) {
  if (!badges?.length) {
    return null;
  }

  return (
    <div className="qr-product-badges">
      {badges.slice(0, 2).map((badgeKey) => {
        const badge = badgeInformation[badgeKey];

        if (!badge) {
          return null;
        }

        return (
          <span
            className={`qr-product-badge ${badge.className}`}
            key={badgeKey}
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              {badge.icon}
            </span>

            {badge.label}
          </span>
        );
      })}
    </div>
  );
}

function CategoryCard({
  category,
  isActive,
  onSelect,
}) {
  return (
    <button
      type="button"
      className={
        isActive
          ? 'qr-category-card qr-category-card--active'
          : 'qr-category-card'
      }
      onClick={() => onSelect(category.id)}
    >
      <img
        src={category.image}
        alt=""
        aria-hidden="true"
      />

      <span>{category.name}</span>
    </button>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
  onDecrease,
}) {
  return (
    <article
      className={
        product.isAvailable
          ? 'qr-product-card'
          : 'qr-product-card qr-product-card--unavailable'
      }
    >
      <div className="qr-product-card__image-wrapper">
        <img
          className="qr-product-card__image"
          src={product.image}
          alt={product.name}
          loading="lazy"
        />

        <span className="qr-product-card__calories">
          {product.calories} kcal
        </span>

        {!product.isAvailable && (
          <div className="qr-product-card__sold-out">
            <span>Tükendi</span>
          </div>
        )}
      </div>

      <div className="qr-product-card__content">
        <ProductBadges badges={product.badges} />

        <div className="qr-product-card__heading">
          <h3>{product.name}</h3>

          <span className="qr-product-card__price">
            {formatPrice(product.price)}
          </span>
        </div>

        <p className="qr-product-card__description">
          {product.description}
        </p>

        <div className="qr-product-card__footer">
          <span
            className={
              product.isAvailable
                ? 'qr-stock qr-stock--available'
                : 'qr-stock qr-stock--unavailable'
            }
          >
            <span />

            {product.isAvailable
              ? 'Stokta'
              : 'Şu anda tükendi'}
          </span>

          {!product.isAvailable ? (
            <button
              type="button"
              className="qr-product-card__disabled-button"
              disabled
            >
              Tükendi
            </button>
          ) : quantity > 0 ? (
            <div
              className="qr-quantity-control"
              aria-label={`${product.name} ürün adedi`}
            >
              <button
                type="button"
                onClick={() => onDecrease(product.id)}
                aria-label={`${product.name} ürününü azalt`}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  remove
                </span>
              </button>

              <strong>{quantity}</strong>

              <button
                type="button"
                onClick={() => onAdd(product)}
                aria-label={`${product.name} ürününü artır`}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  add
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="qr-product-card__add-button"
              onClick={() => onAdd(product)}
            >
              <span>
                {product.hasOptions
                  ? 'Seçenekleri Gör'
                  : 'Sepete Ekle'}
              </span>

              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                add
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PublicQrMenu() {

  const {
  summary: cartSummary,
  addSimpleProduct,
  addConfiguredProduct,
  decreaseItem,
  getProductQuantity,
  cartItems,
} = useQrCart();
  const { restaurantId, tableNo } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const [activeCategoryId, setActiveCategoryId] =
    useState(null);

  const [searchTerm, setSearchTerm] = useState('');



    const [selectedProduct, setSelectedProduct] =
  useState(null);

  // Masa oturumunu doğrula (QR token'ı backend'e karşı değiştir) ve ardından
  // gerçek menü verisini çek. Eski CustomerMenu.jsx'teki akışla aynı.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setSessionError('');
      try {
        let current = getCustomerSession();
        const matches =
          current &&
          String(current.restaurantId) === String(restaurantId) &&
          String(current.tableNo) === String(tableNo);

        if (!matches || !isSessionValid(current)) {
          if (!token) {
            throw new Error('QR kodundaki bağlantı eksik veya geçersiz.');
          }
          const result = await qrSessionApi.create(restaurantId, tableNo, token);
          current = {
            accessToken: result.accessToken,
            expiresAt: result.expiresAt,
            restaurantId: result.restaurantId,
            tableNo: result.tableNo,
            tableSessionId: result.tableSessionId,
            qrToken: token,
          };
          setCustomerSession(current);
        }

        if (cancelled) return;

        const [restaurantData, categoriesData, menuItemsData] = await Promise.all([
          customerMenuApi.getRestaurant(restaurantId),
          customerMenuApi.getCategories(restaurantId).catch(() => []),
          customerMenuApi.getMenuItems(restaurantId),
        ]);

        if (cancelled) return;
        setRestaurant(restaurantData);
        setCategories(categoriesData ?? []);
        setMenuItems((menuItemsData ?? []).filter((item) => item.isAvailable));
      } catch (err) {
        if (!cancelled) {
          setSessionError(err.message ?? 'Masa oturumu doğrulanamadı. Lütfen QR kodu tekrar okutun.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, tableNo, token]);

  // Backend MenuItem'ı (fiyat kuruş cinsinden, kategori adı string) bu
  // sayfanın tasarım bileşenlerinin beklediği ürün şekline çeviriyoruz.
  // calories/badges/hasOptions backend'de yok; sabit varsayılan veriyoruz.
  const products = useMemo(
    () =>
      menuItems.map((item) => ({
        id: item.id,
        categoryId: item.category || 'Diğer',
        name: item.name,
        description: item.ingredients?.length ? item.ingredients.join(', ') : '',
        price: (item.price ?? 0) / 100,
        priceKurus: item.price ?? 0,
        calories: null,
        image: item.imageUrl || FALLBACK_IMAGE,
        isAvailable: item.isAvailable !== false,
        badges: [],
        hasOptions: false,
      })),
    [menuItems],
  );

  // Kategori id'si olarak kategori adını kullanıyoruz: backend MenuItem'da
  // categoryId yok, sadece kategori adı (string) var (bkz. CustomerMenu.jsx
  // MenuTab: isim eşleştirmesiyle gruplama). Kategoriler gelmezse ürünlerden
  // türetiyoruz.
  const categoryList = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((category) => ({
        id: category.name,
        name: category.name,
        description: category.description ?? '',
        image: category.imageUrl || FALLBACK_IMAGE,
      }));
    }
    const seen = new Map();
    products.forEach((product) => {
      if (!seen.has(product.categoryId)) {
        seen.set(product.categoryId, {
          id: product.categoryId,
          name: product.categoryId,
          description: '',
          image: FALLBACK_IMAGE,
        });
      }
    });
    return Array.from(seen.values());
  }, [categories, products]);

  useEffect(() => {
    if (categoryList.length === 0) {
      setActiveCategoryId(null);
      return;
    }
    if (!categoryList.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(categoryList[0].id);
    }
  }, [categoryList, activeCategoryId]);

  const activeCategory = categoryList.find(
    (category) =>
      category.id === activeCategoryId,
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = searchTerm
      .trim()
      .toLocaleLowerCase('tr-TR');

    return products.filter((product) => {
      const belongsToCategory =
        product.categoryId === activeCategoryId;

      const matchesSearch =
        !normalizedSearchTerm ||
        product.name
          .toLocaleLowerCase('tr-TR')
          .includes(normalizedSearchTerm) ||
        product.description
          .toLocaleLowerCase('tr-TR')
          .includes(normalizedSearchTerm);

      return belongsToCategory && matchesSearch;
    });
  }, [products, activeCategoryId, searchTerm]);


const handleAddProduct = (product) => {
  if (!product.isAvailable) {
    return;
  }

  if (product.hasOptions) {
    setSelectedProduct(product);
    return;
  }

  addSimpleProduct(product);
};
const handleAddConfiguredProduct = (
  configuredProduct,
) => {
  addConfiguredProduct(configuredProduct);
};
  const handleDecreaseProduct = (
  productId,
) => {
  const lastMatchingItem = [...cartItems]
    .reverse()
    .find(
      (item) =>
        item.product.id === productId,
    );

  if (!lastMatchingItem) {
    return;
  }

  decreaseItem(lastMatchingItem.id);
};

  if (isLoading) {
    return (
      <div className="qr-menu-page">
        <main className="qr-menu-content">
          <div className="qr-products__empty">
            <span className="material-symbols-outlined" aria-hidden="true">
              hourglass_top
            </span>
            <h3>Masa oturumunuz doğrulanıyor</h3>
            <p>Lütfen bir saniye bekleyin...</p>
          </div>
        </main>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="qr-menu-page">
        <main className="qr-menu-content">
          <div className="qr-products__empty">
            <span className="material-symbols-outlined" aria-hidden="true">
              error
            </span>
            <h3>Oturum doğrulanamadı</h3>
            <p>{sessionError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="qr-menu-page">
      <header className="qr-menu-header">
        <div className="qr-menu-header__business">
          <img
            src={FALLBACK_IMAGE}
            alt={`${restaurant?.name ?? 'Şükran App'} logosu`}
          />

          <div>
            <span className="qr-menu-header__label">
              Dijital Menü
            </span>

            <h1>{restaurant?.name}</h1>

            <div className="qr-menu-header__details">
              <span>
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  table_restaurant
                </span>

                Masa {tableNo}
              </span>

              <span className="qr-menu-header__status">
                <i />

                Siparişe Açık
              </span>
            </div>
          </div>
        </div>

        <div className="qr-menu-header__actions">
          <QrOrdersSheet
            restaurantId={restaurantId}
            tableNo={tableNo}
          />

          <Link
            className="qr-menu-header__cart"
            to={`/menu/${restaurantId}/${tableNo}/cart`}
            aria-label={`Sepeti görüntüle. ${cartSummary.totalQuantity} ürün`}
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              shopping_bag
            </span>

            {cartSummary.totalQuantity > 0 && (
              <strong>
                {cartSummary.totalQuantity}
              </strong>
            )}
          </Link>
        </div>
      </header>

      <main className="qr-menu-content">
        <section className="qr-search">
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            search
          </span>

          <input
            type="search"
            placeholder="Menüde ürün ara..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            aria-label="Menüde ürün ara"
          />
        </section>

        <section className="qr-categories">
          <div className="qr-section-heading">
            <div>
              <span>Kategoriler</span>

              <h2>Ne yemek istersiniz?</h2>
            </div>

            <span className="qr-section-heading__count">
              {categoryList.length} kategori
            </span>
          </div>

          <div className="qr-categories__slider">
            {categoryList.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isActive={
                  category.id === activeCategoryId
                }
                onSelect={setActiveCategoryId}
              />
            ))}
          </div>
        </section>

        <section className="qr-products">
          <div className="qr-products__heading">
            <div>
              <span>Seçili kategori</span>

              <h2>{activeCategory?.name}</h2>

              <p>{activeCategory?.description}</p>
            </div>

            <strong>
              {filteredProducts.length} ürün
            </strong>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="qr-products__list">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={getProductQuantity(product.id)}
                  onAdd={handleAddProduct}
                  onDecrease={
                    handleDecreaseProduct
                  }
                />
              ))}
            </div>
          ) : (
            <div className="qr-products__empty">
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                search_off
              </span>

              <h3>Ürün bulunamadı</h3>

              <p>
                Arama ölçütlerinize uygun bir ürün
                bulunamadı.
              </p>

              <button
                type="button"
                onClick={() => setSearchTerm('')}
              >
                Aramayı temizle
              </button>
            </div>
          )}
        </section>

        <QrReviewsSection restaurantId={restaurantId} />

        <aside className="qr-menu-information">
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            info
          </span>

          <p>
            Siparişleriniz mutfak ekranımıza anlık
            olarak iletilir. Alerjen içeriği için ürün
            detaylarını inceleyebilir veya işletme
            personeline danışabilirsiniz.
          </p>
        </aside>

        <footer className="qr-menu-footer">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/sukranapp.png"
              alt="Şükran App"
            />

            <span>
              Powered by <strong>Şükran App</strong>
            </span>
          </a>

          <div>
            <Link to="/gizlilik-politikasi">
              Gizlilik
            </Link>

            <Link to="/kullanim-kosullari">
              Kullanım Koşulları
            </Link>

            <Link to="/kvkk">
              KVKK
            </Link>
          </div>
        </footer>
      </main>

      {cartSummary.totalQuantity > 0 && (
        <Link
          className="qr-floating-cart"
          to={`/menu/${restaurantId}/${tableNo}/cart`}
        >
          <span className="qr-floating-cart__icon">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              shopping_bag
            </span>

            <strong>
              {cartSummary.totalQuantity}
            </strong>
          </span>

          <span className="qr-floating-cart__text">
            <small>
              {cartSummary.totalQuantity} ürün
            </small>

            <strong>Sepeti Gör</strong>
          </span>

          <span className="qr-floating-cart__price">
            {formatPrice(cartSummary.totalPrice)}
          </span>

          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </Link>
      )}
   {selectedProduct && (
  <ProductOptionsModal
    key={selectedProduct.id}
    product={selectedProduct}
    isOpen
    onClose={() =>
      setSelectedProduct(null)
    }
    onAddToCart={
      handleAddConfiguredProduct
    }
  />
)}
    </div>
  );
}