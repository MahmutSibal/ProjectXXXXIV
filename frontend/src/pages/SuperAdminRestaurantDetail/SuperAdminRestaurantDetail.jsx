import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { restaurantsApi, tablesApi } from '../../api/restaurants.js';
import { usersApi } from '../../api/users.js';
import { reviewsApi } from '../../api/reviews.js';
import { ROLES } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import './SuperAdminRestaurantDetail.css';

function renderStars(count) {
  return Array.from({ length: 5 }).map((_, index) => (
    <span
      key={index}
      className="material-symbols-outlined text-[16px]"
      style={{ fontVariationSettings: index < count ? "'FILL' 1" : "'FILL' 0" }}
    >
      star
    </span>
  ));
}

export default function SuperAdminRestaurantDetail() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [owner, setOwner] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      restaurantsApi.getById(restaurantId),
      // Yalnızca bu restoranın kullanıcıları: sahibi bulmak ve personeli saymak için
      // platformdaki tüm kullanıcıları indirmek hem gereksiz hem de sayfa sınırında
      // yanlış sayı üretirdi.
      usersApi.getAll({ restaurantId, pageSize: MAX_PAGE_SIZE }),
      tablesApi.getAll(restaurantId).catch(() => []),
      reviewsApi.getByRestaurant(restaurantId).catch(() => []),
    ])
      .then(([restaurantData, usersData, tables, reviewsData]) => {
        if (cancelled) return;
        if (!restaurantData) {
          setNotFound(true);
          return;
        }
        const users = toPage(usersData).items;
        setRestaurant(restaurantData);
        setOwner(users.find((user) => user.role === ROLES.RestaurantOwner) ?? null);
        setStaffCount(users.filter((user) => user.role === ROLES.Kitchen || user.role === ROLES.Waiter).length);
        setTableCount(tables.length);
        setReviews(reviewsData);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Restoran yüklenemedi.'))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const averageRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  if (notFound || !restaurant) {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col gap-md items-start">
        <Link
          to="/super-admin/restaurants"
          className="inline-flex items-center gap-2 text-primary-container font-label-md text-label-md hover:underline"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Restoranlara Geri Dön
        </Link>
        <p className="text-error font-body-md text-body-md">Bu restoran bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <div>
        <Link
          to="/super-admin/restaurants"
          className="inline-flex items-center gap-2 text-primary-container font-label-md text-label-md hover:underline mb-md"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Restoranlara Geri Dön
        </Link>
      </div>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[32px]">
              restaurant
            </span>
          </div>

          <div>
            <h2 className="font-headline-md text-headline-md text-on-background">
              {restaurant.name}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              /{restaurant.slug}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoItem icon="location_on" text={restaurant.address} />
          <InfoItem icon="table_restaurant" text={`${tableCount} Masa`} />
          <InfoItem icon="badge" text={`${staffCount} Aktif Personel`} />
          <InfoItem icon="person" text={owner ? `İşletme Sahibi: ${owner.name} (${owner.email})` : 'İşletme sahibi atanmamış'} />
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
        <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary">security</span>
          Ödeme Entegrasyonu
        </h3>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Restoran bazlı iyzico entegrasyon ayarları henüz eklenmedi — bu özellik
          ayrı bir işte ele alınacak (bkz. proje planı).
        </p>
      </section>

      <section className="flex flex-col gap-md">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col md:flex-row items-center gap-lg">
          <div className="text-center md:border-r border-outline-variant md:pr-lg">
            <p className="text-[48px] font-bold text-on-background leading-none">
              {averageRating.toFixed(1)}
            </p>

            <div className="flex justify-center text-secondary-container my-2">
              {renderStars(Math.round(averageRating))}
            </div>

            <p className="font-label-sm text-label-sm text-on-surface-variant">
              5 üzerinden puanlama
            </p>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-md w-full">
            <div className="bg-surface-container-low p-4 rounded-lg text-center">
              <p className="font-headline-sm text-headline-sm text-primary">
                {reviews.length}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Yazılı Yorum
              </p>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Henüz yorum yok.</p>
        ) : (
          <div className="flex flex-col gap-sm">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 ambient-shadow"
              >
                <div className="flex justify-between items-start mb-2 gap-md">
                  <span className="font-label-md text-label-md text-on-background">
                    {review.userName}
                  </span>

                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>

                <div className="flex text-secondary-container mb-2">
                  {renderStars(review.rating)}
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoItem({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-on-surface-variant">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span className="font-body-md text-body-md">{text}</span>
    </div>
  );
}
