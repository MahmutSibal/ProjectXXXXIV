import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantsApi } from '../../api/restaurants.js';
import { reviewsApi } from '../../api/reviews.js';
import { ApiError } from '../../api/client.js';
import PaymentAccountSection from './PaymentAccountSection.jsx';
import './BusinessProfile.css';

function renderStars(count) {
  return Array.from({ length: 5 }).map((_, index) => (
    <span
      key={index}
      className="material-symbols-outlined"
      style={{
        fontVariationSettings: index < count ? "'FILL' 1" : "'FILL' 0",
      }}
    >
      star
    </span>
  ));
}

export default function BusinessProfile() {
  const toast = useToast();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [businessInfo, setBusinessInfo] = useState({ name: '', address: '' });
  const [isSaving, setIsSaving] = useState(false);
  // Haritada aranan adres. Her tuş vuruşunda harita yeniden yüklenmesin diye
  // yazmaya ara verildikten sonra güncellenir.
  const [mapQuery, setMapQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setMapQuery(businessInfo.address.trim()), 700);
    return () => clearTimeout(timer);
  }, [businessInfo.address]);

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }

    Promise.all([restaurantsApi.getById(user.restaurantId), reviewsApi.getByRestaurant(user.restaurantId)])
      .then(([restaurantData, reviewsData]) => {
        setRestaurant(restaurantData);
        setBusinessInfo({ name: restaurantData.name, address: restaurantData.address });
        setReviews(reviewsData);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'İşletme bilgileri yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [user?.restaurantId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBusinessInfo((prev) => ({ ...prev, [name]: value }));
  };

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const summaryCards = [
    { icon: 'star', label: 'Ortalama Puan', value: `${averageRating.toFixed(1)} ★` },
    { icon: 'forum', label: 'Toplam Yorum', value: `${reviews.length} Yorum` },
  ];

  const handleUpdateBusiness = async () => {
    if (!businessInfo.name.trim() || !businessInfo.address.trim()) {
      toast.warning('Lütfen işletme adı ve işletme adresini doldurun.');
      return;
    }

    setIsSaving(true);
    try {
      await restaurantsApi.update(user.restaurantId, {
        name: businessInfo.name.trim(),
        address: businessInfo.address.trim(),
        longitude: restaurant.longitude,
        latitude: restaurant.latitude,
      });
      setRestaurant((prev) => ({ ...prev, name: businessInfo.name.trim(), address: businessInfo.address.trim() }));
      toast.success('İşletme bilgileri güncellendi.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'İşletme bilgileri güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenMap = () => {
    const address = businessInfo.address.trim();
    if (!address) {
      toast.warning('Haritada açmak için işletme adresini girin.');
      return;
    }

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-headline-lg text-headline-lg text-on-background">
          İşletme Profili
        </h2>

        <p className="font-body-lg text-body-lg text-on-surface-variant">
          İşletme bilgilerinizi, adresinizi ve müşteri yorumlarınızı buradan
          yönetebilirsiniz. Adresiniz haritada otomatik olarak gösterilir.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container text-primary-container">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>

            <div>
              <p className="text-label-sm text-on-surface-variant">
                {card.label}
              </p>

              <p className="font-bold text-on-background">{card.value}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
          <h3 className="font-headline-sm text-headline-sm text-on-background mb-md">
            İşletme Bilgileri
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant">
                İşletme Adı
              </label>

              <input
                name="name"
                value={businessInfo.name}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                placeholder="Örn: Şükran App Restaurant"
                type="text"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant">
                İşletme Adresi
              </label>

              <input
                name="address"
                value={businessInfo.address}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                placeholder="İşletme adresinizi girin"
                type="text"
              />
            </div>

            <button
              type="button"
              onClick={handleUpdateBusiness}
              disabled={isSaving}
              className="mt-2 bg-primary-container text-on-primary-container font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSaving ? 'Kaydediliyor...' : 'Bilgileri Güncelle'}
            </button>
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col">
          <h3 className="font-headline-sm text-headline-sm text-on-background mb-md">
            Harita Önizleme
          </h3>

          {mapQuery ? (
            // Yazılan adres Google Haritalar'da aranır ve bulunan konum gösterilir
            // (gömülü harita; API anahtarı gerektirmez).
            <iframe
              key={mapQuery}
              title={`${businessInfo.name || 'İşletme'} konumu`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
              className="flex-1 w-full min-h-[260px] rounded-lg border border-outline-variant"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex-1 bg-surface-container-low rounded-lg border border-outline-variant border-dashed flex flex-col items-center justify-center p-lg text-center gap-3 min-h-[260px]">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-40">
                map
              </span>
              <p className="text-body-sm text-on-surface-variant max-w-[300px] mx-auto">
                Adres girdiğinizde işletme konumu burada görüntülenecek.
              </p>
            </div>
          )}

          <p className="mt-2 text-[11px] text-on-surface-variant">
            Konum yanlış görünüyorsa adrese mahalle, ilçe ve il ekleyin.
          </p>

          <button
            type="button"
            onClick={handleOpenMap}
            className="mt-md border border-primary-container text-primary-container font-label-md text-label-md py-3 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            Haritada Aç
          </button>
        </section>
      </div>

      {user?.restaurantId && restaurant && (
        <PaymentAccountSection
          restaurantId={user.restaurantId}
          defaultBusinessName={restaurant.name}
          defaultFullName={user.name}
        />
      )}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-lg">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-background mb-1">
              Müşteri Yorumları
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-headline-sm">{averageRating.toFixed(1)} / 5</span>

              <div className="flex text-secondary-container">
                {renderStars(Math.round(averageRating))}
              </div>

              <span className="text-label-sm text-on-surface-variant">
                Ortalama Puan
              </span>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Henüz yorum yok.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 border border-outline-variant rounded-lg flex flex-col gap-2"
              >
                <div className="flex justify-between items-start gap-md">
                  <div className="flex flex-col">
                    <span className="font-bold text-on-background">
                      {review.userName}
                    </span>

                    <div className="flex text-secondary-container text-[16px]">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                </div>

                <p className="text-body-md text-on-background">"{review.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
