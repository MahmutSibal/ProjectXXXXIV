import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import PaymentMethods from '../../components/PaymentMethods.jsx';

import './Services.css';

const serviceTags = [
  'QR Menü',
  'Güvenli Ödeme',
  'Garson Çağır',
  'Mutfak Paneli',
  'Admin Paneli',
];

const managementFeatures = [
  {
    icon: 'monitoring',
    title: 'Anlık Takip',
    description:
      'Canlı sipariş akışını ve masa durumlarını anlık olarak takip edin.',
  },
  {
    icon: 'payments',
    title: 'Kazanç Analizi',
    description:
      'Ciro raporlarını ve işletmenizin finansal performansını görüntüleyin.',
  },
  {
    icon: 'table_restaurant',
    title: 'Masa Yönetimi',
    description:
      'Masa aktiflik, müsaitlik ve QR kod durumlarını kolayca yönetin.',
  },
  {
    icon: 'inventory_2',
    title: 'Stok Kontrolü',
    description:
      'Ürün ve kategori bazlı stok bilgilerini gerçek zamanlı takip edin.',
  },
  {
    icon: 'badge',
    title: 'Personel Yönetimi',
    description:
      'Garson ve mutfak personellerine rol ve yetki tanımlamaları yapın.',
  },
  {
    icon: 'analytics',
    title: 'Raporlama',
    description:
      'Gelişmiş veri analitiği ve performans metriklerini inceleyin.',
  },
];

const orderSteps = [
  {
    number: '01',
    icon: 'qr_code_scanner',
    eyebrow: 'QR Menü Erişimi',
    title: 'Tarama',
    description:
      'Misafir masadaki QR kodu taratarak dijital menüye saniyeler içinde ulaşır.',
    benefits: [
      'Temassız başlangıç',
      'Mobil cihazlarla uyumlu',
    ],
  },
  {
    number: '02',
    icon: 'touch_app',
    eyebrow: 'Kişiselleştirilmiş Seçim',
    title: 'Sipariş',
    description:
      'Misafir ürünleri inceler, seçeneklerini belirler ve siparişini oluşturur.',
    benefits: [
      'Zengin ürün görselleri',
      'Kolay ve hızlı seçim',
    ],
  },
  {
    number: '03',
    icon: 'soup_kitchen',
    eyebrow: 'Mutfak Entegrasyonu',
    title: 'Hazırlık',
    description:
      'Ödemesi tamamlanan sipariş anında mutfak ekranına iletilir.',
    benefits: [
      'Hata riskini azaltan akış',
      'Anlık sipariş bildirimi',
    ],
  },
  {
    number: '04',
    icon: 'restaurant',
    eyebrow: 'Operasyonel Verimlilik',
    title: 'Servis',
    description:
      'Hazırlanan sipariş garson paneline düşer ve zamanında masaya ulaştırılır.',
    benefits: [
      'Daha hızlı servis',
      'Daha güçlü müşteri deneyimi',
    ],
  },
];

const pricingPlans = [
  {
    id: 'starter',
    name: 'Başlangıç',
    monthlyPrice: 749,
    description:
      'QR menü sistemine hızlı bir başlangıç yapmak isteyen işletmeler için.',
    features: [
      'Temel QR Menü',
      'Masa Yönetimi',
      'Ürün ve Kategori Yönetimi',
      'Temel Raporlar',
    ],
    buttonText: 'Kayıt Ol',
  },
  {
    id: 'professional',
    name: 'Profesyonel',
    monthlyPrice: 1490,
    description:
      'Sipariş ve ödeme sürecini tamamen dijitalleştirmek isteyen restoranlar için.',
    features: [
      'QR Sipariş ve Ödeme',
      'iyzico Entegrasyonu',
      'Mutfak ve Garson Panelleri',
      'Anlık Kazanç Takibi',
    ],
    buttonText: 'Hemen Başla',
    featured: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 2990,
    description:
      'Operasyonlarını ayrıntılı verilerle yönetmek isteyen işletmeler için.',
    features: [
      'Sınırsız Masa',
      'Gelişmiş Raporlama',
      'Ürün Performans Analizi',
      'Öncelikli Destek',
    ],
    buttonText: 'Kayıt Ol',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    description:
      'Çok şubeli ve özel entegrasyon ihtiyacı olan kurumsal işletmeler için.',
    features: [
      'Çoklu Şube Yönetimi',
      'Süper Admin Paneli',
      'API ve Özel Entegrasyon',
      'Kurumsal Destek',
    ],
    buttonText: 'İletişime Geç',
  },
];

function Services() {
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const revealElements = document.querySelectorAll(
      '.services-page [data-reveal]',
    );

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => {
        element.classList.add('is-visible');
      });

      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
      },
    );

    revealElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToManagement = () => {
    document
      .getElementById('yonetim-merkezi')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  };

  const getDisplayedPrice = (monthlyPrice) => {
    if (!monthlyPrice) {
      return null;
    }

    if (!isYearly) {
      return monthlyPrice;
    }

    return Math.round((monthlyPrice * 10) / 12);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR').format(price);
  };

  return (
    <div className="services-page">
      {/* HERO */}

      <section className="services-hero">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5WpF-kHr_wfalvRZO6t7UywMmS-qheCiGDZqDKjlkMgra3r-S0Z4-rCxra3EQWqSMG2BtP4iGqy35lJl1Umqq8QuTLQPdJQ_ZHpYlc4ZeuKqjrsDcJO5xjnxikmroV9PO9_EBUd2CJZQL1rg056777u1gGl00e9JTrAiT5cL8w-gWCWxMdQQcB5a3C8pxkuSociOe1goIX6PltDeBkb2c0iobSZp_1PL7QD06oVCZtvD3aad5EPs3iVJVV6F1Mliy44sMJ_ivrqc"
          alt=""
          className="services-hero__background"
        />

        <div className="services-hero__overlay" />

        <div className="services-hero__container">
          <div
            className="services-hero__content"
            data-reveal
          >
            <div className="services-eyebrow">
              <span />
              <strong>
                Restoran Teknolojileri
              </strong>
            </div>

            <h1 className="services-hero__title">
              Restoranınız İçin
              <span> Uçtan Uca </span>
              Dijital Hizmetler
            </h1>

            <p className="services-hero__description">
              Şükran App; QR menü, iyzico ile güvenli ödeme,
              garson çağırma, mutfak paneli ve admin yönetim
              araçlarıyla işletmenizin ihtiyaç duyduğu tüm
              dijital hizmetleri tek sistemde sunar.
            </p>

            <div className="services-hero__actions">
              <button
                type="button"
                className="services-button services-button--brass"
                onClick={scrollToManagement}
              >
                Hizmetleri İncele
              </button>

              <Link
                to="/iletisim"
                className="services-button services-button--light-outline"
              >
                Özel Sunum Talep Et
              </Link>
            </div>

            <div className="services-hero__tags">
              {serviceTags.map((serviceTag) => (
                <span key={serviceTag}>
                  {serviceTag}
                </span>
              ))}
            </div>
          </div>

          <div
            className="services-hero__visual"
            data-reveal
          >
            <div className="services-hero__visual-glow" />

            <div className="services-hero__visual-frame">
              <div className="services-hero__visual-frame-border" />

              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2wVkBIl_GFQmqmw-XDrjID_zFbmn7bmvQPvpjpzdnRuGs32OEBK2eN8-Qsb_Pic3nHiJWZwlNNZffRgdc-iRvT9zTFwkkvMgZxIbTsqFUUJlFPi-8aoKYZ8p1n-qMXEmktK9BDi9ugIJfQDWzr6c4vrFoSiZxtpDDgFeoGVkS1iGnPfhewRaD1v1p_gLmiBTYAAWHOr8114BlGaoWGfHdnKFdsYW378k5yH0q24FIapiZTIcREbHSDZtfWL9vsZOjBIzJG63waX4"
                alt="Şükran App restoran teknolojileri"
              />
            </div>
          </div>
        </div>

        <div className="services-hero__bottom-accent" />
      </section>

      {/* DEKORATİF AYRAÇ */}

      <div className="services-divider">
        <span />
        <span className="material-symbols-outlined">
          restaurant_menu
        </span>
        <span />
      </div>

      {/* YÖNETİM MERKEZİ */}

      <section
        id="yonetim-merkezi"
        className="services-management"
      >
        <div className="services-container">
          <div
            className="services-section-heading services-section-heading--light"
            data-reveal
          >
            <span className="services-section-heading__eyebrow">
              Yönetim Merkezi
            </span>

            <h2>
              İşletmenizin Tüm Kontrolü
              <span> Tek Bir Ekranda</span>
            </h2>

            <p>
              Şükran App; siparişlerin, masaların ve
              personellerin tek merkezden yönetilebildiği güçlü
              bir altyapı sunar.
            </p>
          </div>

          <div
            className="services-management__visual"
            data-reveal
          >
            <div className="services-management__glow" />

            <div className="services-management__image-frame">
  <img
    src="/src/assets/img/screen.png"
    alt="Şükran App yönetim paneli"
  />
</div>

            <div className="services-management__stat services-management__stat--revenue">
              <small>Günlük Ciro</small>
              <strong>₺42.850</strong>
            </div>

            <div className="services-management__stat services-management__stat--orders">
              <small>Aktif Sipariş</small>
              <strong>18</strong>
            </div>

            <div className="services-management__stat services-management__stat--tables">
              <small>Masa Doluluk</small>
              <strong>%82</strong>
            </div>
          </div>

          <div className="services-management__features">
            {managementFeatures.map((managementFeature) => (
              <article
                className="services-management__feature"
                key={managementFeature.title}
                data-reveal
              >
                <span className="material-symbols-outlined">
                  {managementFeature.icon}
                </span>

                <h3>{managementFeature.title}</h3>

                <p>
                  {managementFeature.description}
                </p>
              </article>
            ))}
          </div>

          <div className="services-management__actions">
            <Link
              to="/kayit-ol"
              className="services-button services-button--brass"
            >
              Paneli İncele
            </Link>

            <Link
              to="/iletisim"
              className="services-button services-button--light-outline"
            >
              Demo Talep Et
            </Link>
          </div>
        </div>
      </section>

      {/* DİJİTAL SİPARİŞ SÜRECİ */}

      <section className="services-process">
        <div className="services-container">
          <div
            className="services-section-heading"
            data-reveal
          >
            <span className="services-section-heading__eyebrow">
              Dijital Sipariş Deneyimi
            </span>

            <h2>
              QR Menüden Servise Akıcı ve Kusursuz Bir Deneyim
            </h2>

            <p>
              Müşterilerinizin masaya oturduğu andan siparişin
              teslim edilmesine kadar geçen bütün süreci
              dijitalleştirin.
            </p>
          </div>

          <div className="services-process__wrapper">
            <div className="services-process__line" />

            <div className="services-process__grid">
              {orderSteps.map((orderStep) => (
                <article
                  className="services-process__card"
                  key={orderStep.number}
                  data-reveal
                >
                  <span className="services-process__number">
                    {orderStep.number}
                  </span>

                  <span className="material-symbols-outlined services-process__icon">
                    {orderStep.icon}
                  </span>

                  <span className="services-process__eyebrow">
                    {orderStep.eyebrow}
                  </span>

                  <h3>{orderStep.title}</h3>

                  <p>
                    {orderStep.description}
                  </p>

                  <ul>
                    {orderStep.benefits.map((benefit) => (
                      <li key={benefit}>
                        <span className="material-symbols-outlined">
                          check
                        </span>

                        {benefit}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FİYATLANDIRMA */}

      <section className="services-pricing">
        <div className="services-container">
          <div
            className="services-section-heading"
            data-reveal
          >
            <span className="services-section-heading__eyebrow">
              Yatırım Planları
            </span>

            <h2>Sizin İçin En Doğru Seçim</h2>

            <p>
              İşletmenizin ölçeğine uygun paketle başlayın,
              ihtiyaçlarınız arttığında sisteminizi kolayca
              büyütün.
            </p>

            <div className="services-billing">
              <span
                className={
                  !isYearly
                    ? 'services-billing__label services-billing__label--active'
                    : 'services-billing__label'
                }
              >
                Aylık
              </span>

              <button
                type="button"
                className={`services-billing__switch ${
                  isYearly
                    ? 'services-billing__switch--active'
                    : ''
                }`}
                onClick={() => {
                  setIsYearly((currentValue) => !currentValue);
                }}
                aria-label="Faturalandırma dönemini değiştir"
                aria-pressed={isYearly}
              >
                <span />
              </button>

              <span
                className={
                  isYearly
                    ? 'services-billing__label services-billing__label--active'
                    : 'services-billing__label'
                }
              >
                Yıllık
              </span>

              <strong className="services-billing__discount">
                2 Ay Ücretsiz
              </strong>
            </div>
          </div>

          <div className="services-pricing__grid">
            {pricingPlans.map((pricingPlan) => {
              const displayedPrice = getDisplayedPrice(
                pricingPlan.monthlyPrice,
              );

              return (
                <article
                  className={`services-price-card ${
                    pricingPlan.featured
                      ? 'services-price-card--featured'
                      : ''
                  }`}
                  key={pricingPlan.id}
                  data-reveal
                >
                  {pricingPlan.featured && (
                    <span className="services-price-card__popular">
                      En Çok Tercih Edilen
                    </span>
                  )}

                  <h3>{pricingPlan.name}</h3>

                  <p className="services-price-card__description">
                    {pricingPlan.description}
                  </p>

                  <div className="services-price-card__price">
                    {displayedPrice ? (
                      <>
                        <strong>
                          ₺{formatPrice(displayedPrice)}
                        </strong>

                        <span>/ay</span>
                      </>
                    ) : (
                      <strong>Özel Teklif</strong>
                    )}
                  </div>

                  {isYearly && displayedPrice && (
                    <small className="services-price-card__yearly-note">
                      Yıllık ödemede aylık ortalama
                    </small>
                  )}

                  <ul className="services-price-card__features">
                    {pricingPlan.features.map((feature) => (
                      <li key={feature}>
                        <span className="material-symbols-outlined">
                          check
                        </span>

                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={
                      pricingPlan.id === 'enterprise'
                        ? '/iletisim'
                        : '/kayit-ol'
                    }
                    className={`services-button services-price-card__button ${
                      pricingPlan.featured
                        ? 'services-button--brass'
                        : 'services-button--dark-outline'
                    }`}
                  >
                    {pricingPlan.buttonText}
                  </Link>
                </article>
              );
            })}
          </div>

          <PaymentMethods />
        </div>
      </section>
    </div>
  );
}

export default Services;