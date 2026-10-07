import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { subscriptionsApi } from '../../api/subscriptions.js';
import './Home.css';

const processSteps = [
  {
    icon: 'qr_code_scanner',
    title: 'QR Kod Tara',
  },
  {
    icon: 'menu_book',
    title: 'Menüyü İncele',
  },
  {
    icon: 'touch_app',
    title: 'Sipariş Ver',
  },
  {
    icon: 'payments',
    title: 'Ödemeyi Tamamla',
  },
  {
    icon: 'restaurant',
    title: 'Mutfağa İlet',
  },
];

const platformFeatures = [
  {
    icon: 'soup_kitchen',
    title: 'Mutfak Paneli',
    description:
      'Siparişleri anlık görüntüleyin, hazırlık sürecini yönetin ve mutfak akışını düzenli şekilde takip edin.',
  },
  {
    icon: 'admin_panel_settings',
    title: 'Yönetim Paneli',
    description:
      'Masaları, ürünleri, kategorileri, personelleri ve sipariş geçmişini tek merkezden yönetin.',
  },
  {
    icon: 'room_service',
    title: 'Garson Paneli',
    description:
      'Masa çağrılarını, teslimat bekleyen siparişleri ve servis sürecini daha hızlı yönetin.',
  },
  {
    icon: 'monitoring',
    title: 'Sistem Takibi',
    description:
      'İşletmenizde gerçekleşen sipariş hareketlerini ve operasyonel süreci anlık olarak izleyin.',
  },
  {
    icon: 'payments',
    title: 'Anlık Kazanç Takibi',
    description:
      'Günlük gelir, sipariş yoğunluğu ve genel işletme performansını kolayca görüntüleyin.',
  },
  {
    icon: 'bolt',
    title: 'Kolay Kurulum',
    description:
      'Teknik karmaşayla uğraşmadan sisteminizi kısa sürede kullanmaya başlayın.',
  },
];

/**
 * Paketlerin PAZARLAMA metinleri. Fiyat, limit ve indirim burada TUTULMAZ —
 * bunların tek kaynağı backend'dir (GET /api/subscriptions/plans).
 * Anahtar, backend'in döndürdüğü "code" alanıyla eşleşir.
 */
const planCopy = {
  lite: {
    description: 'QR menüyle hızlı bir başlangıç yapmak isteyen işletmeler için.',
    features: ['QR Menü', 'Ürün ve Kategori Yönetimi', 'Masa Yönetimi'],
    buttonText: 'Kayıt Ol',
  },
  pro: {
    description: 'Sipariş sürecini dijitalleştirmek isteyen restoranlar için.',
    features: ['QR Sipariş ve Ödeme', 'Mutfak ve Garson Paneli', 'Detaylı Raporlama'],
    buttonText: 'Hemen Başla',
    featured: true,
  },
  business: {
    description: 'Tüm hizmetleri ve panelleri kullanmak isteyen işletmeler için.',
    features: ['Tüm Paneller', 'Gelişmiş Raporlama', 'Öncelikli Teknik Destek'],
    buttonText: 'Kayıt Ol',
  },
  enterprise: {
    description: 'Çok şubeli ve özel entegrasyon ihtiyacı bulunan işletmeler için.',
    features: ['Çoklu Şube Yönetimi', 'API ve Özel Entegrasyon', 'Kurumsal Destek'],
    buttonText: 'İletişime Geç',
  },
};

/** Enterprise "İletişime Geç" butonunun yönlendirileceği WhatsApp hattı. */
const ENTERPRISE_WHATSAPP = import.meta.env.VITE_ENTERPRISE_WHATSAPP ?? '';

const faqItems = [
  {
    id: 'installation',
    question: 'Kurulum süreci ne kadar sürer?',
    answer:
      'İşletme ve menü bilgileriniz hazırsa sistem ortalama 1–2 iş günü içerisinde kullanıma alınabilir. Kurulum boyunca gerekli tanımlamalar konusunda ekibimiz size destek olur.',
  },
  {
    id: 'hardware',
    question: 'Ek bir donanım satın almam gerekir mi?',
    answer:
      'Hayır. Şükran App modern telefon, tablet ve bilgisayarlarda tarayıcı üzerinden çalışır. Mevcut cihazlarınızı kullanarak sistemi yönetebilirsiniz.',
  },
  {
    id: 'payment',
    question: 'Müşteri ödemeleri güvenli mi?',
    answer:
      'Evet. Ödeme işlemleri iyzico altyapısı üzerinden gerçekleştirilir. Hassas kart bilgileri doğrudan ödeme sağlayıcısı tarafından güvenli şekilde işlenir.',
  },
  {
    id: 'menu-update',
    question: 'Menü ve fiyat bilgilerini kendim değiştirebilir miyim?',
    answer:
      'Evet. Yönetim panelinden ürünlerinizi, kategorilerinizi, fiyatlarınızı, stok durumlarını ve ürün görsellerini istediğiniz zaman güncelleyebilirsiniz.',
  },
];

function Home() {
  const [isYearly, setIsYearly] = useState(false);

  // Paketler ve fiyatlar SUNUCUDAN gelir; bu sayfada sabit fiyat tutulmaz.
  const [plans, setPlans] = useState([]);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    let cancelled = false;

    subscriptionsApi
      .getPlans()
      .then((data) => {
        if (!cancelled) setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Fiyatları uydurmak yerine boş bırakıyoruz: yanlış fiyat göstermek,
        // hiç göstermemekten kötüdür.
        if (!cancelled) setPlansError('Paket bilgileri şu anda yüklenemedi. Lütfen sayfayı yenileyin.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // WhatsApp numarası tanımlı değilse iletişim sayfasına düşülür.
  const enterpriseContactHref = ENTERPRISE_WHATSAPP
    ? `https://wa.me/${ENTERPRISE_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(
        'Merhaba, Şükran App Enterprise paketi hakkında bilgi almak istiyorum.',
      )}`
    : '/iletisim';
  const [activeFaqId, setActiveFaqId] = useState(
    faqItems[0].id,
  );

  useEffect(() => {
    const revealElements =
      document.querySelectorAll('[data-reveal]');

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((element) => {
        element.classList.add('is-visible');
      });

      return undefined;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
      },
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });

    return () => {
      revealObserver.disconnect();
    };
    // Paket kartları API'den SONRADAN geliyor. Bağımlılık boş bırakılırsa gözlemci
    // yalnızca ilk render'da kurulur, sonradan eklenen kartlar hiç gözlenmez ve
    // opacity:0 ile görünmez kalır (fiyat bölümü boş görünüyordu).
  }, [plans]);

  const handleScrollToPricing = () => {
    const pricingSection =
      document.getElementById('paketler');

    pricingSection?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleToggleFaq = (faqId) => {
    setActiveFaqId((currentFaqId) =>
      currentFaqId === faqId ? null : faqId,
    );
  };

  // Kurus -> "1.900" bicimi. Tutarlar backend'den kurus cinsinden gelir.
  const formatPrice = (kurus) =>
    new Intl.NumberFormat('tr-TR').format(Math.round(kurus / 100));

  /** Kart uzerinde gosterilecek tutar; hesap backend'de yapilmistir. */
  const displayedTotal = (plan) => (isYearly ? plan.annualTotal : plan.monthlyTotal);

  return (
    <div className="home-page">
      {/* HERO */}

      <section className="home-hero">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1CFa0b3-a3B-6GRFjZeigQTDn3QcFUVt0OtAjkAKaGVsQ1vro6U03MXs3kwGbIaPI88KPDSjj2DeP4LVMgRrCi7QcHNbZxDSD88FVhfcKHbbfSoyi4Rtmj6pHGVO4K2TZocQl_-mOoAV5sN50tRunmB0u14guVRDOnZAut4DVwlvD_4WmcEYVKH-8_NsAwea8o1GgCXOOV5OEWiW9rYkSdUDh7tShie4ci1p4zxFXDEMEkDBvYPqJMbShzw-IpSWc_OJk7twXOWM"
          alt=""
          className="home-hero__background"
        />

        <div className="home-hero__overlay" />

        <div className="home-hero__container">
          <div
            className="home-hero__content"
            data-reveal
          >
            <span className="home-eyebrow home-eyebrow--light">
              Yeni Nesil Restoran Yönetimi
            </span>

            <h1 className="home-hero__title">
              QR Menü ve Güvenli Ödeme ile Restoranınızı
              <span> Dijitalleştirin</span>
            </h1>

            <p className="home-hero__description">
              Şükran App ile müşterileriniz QR menüye saniyeler
              içinde ulaşır, siparişlerini kolayca oluşturur ve
              ödemelerini iyzico güvencesiyle tamamlar. Siz de
              siparişleri, masaları ve tüm operasyon sürecini tek
              panelden yönetirsiniz.
            </p>

            <div className="home-hero__actions">
              <Link
                to="/kayit-ol"
                className="home-button home-button--brass"
              >
                Ücretsiz Demo İncele
              </Link>

              <button
                type="button"
                className="home-button home-button--outline-light"
                onClick={handleScrollToPricing}
              >
                Paketleri Gör
              </button>
            </div>

            <div className="home-hero__trust">
              <div className="home-hero__trust-item">
                <span className="material-symbols-outlined">
                  verified_user
                </span>

                <span>iyzico ile güvenli ödeme</span>
              </div>

              <div className="home-hero__trust-item">
                <span className="material-symbols-outlined">
                  qr_code_scanner
                </span>

                <span>QR menü ile temassız deneyim</span>
              </div>

              <div className="home-hero__trust-item">
                <span className="material-symbols-outlined">
                  monitoring
                </span>

                <span>Anlık operasyon takibi</span>
              </div>
            </div>
          </div>

          <div
            className="home-hero__visual"
            data-reveal
          >
            <div className="home-hero__visual-border" />

            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeFabfrIO95TwTpuIec5JGh7DBeQ9MnYA9MID-5DgVjfo7AsjDgGgyAYnfegzEPzUVARvAobMpeAvdQ3tEDM1Az9V3cQMFkDYK56YtUzl2N54OQ_TPkrdOht_GgIKhBwXYm3rTsYElySQDv_VJzEvTo23i2G1G-mo8zU61C55ym03j49JASb9IzgHi1B3v8rSkBMXaGcVEPizdDty-d7X7Oz0tBHM1mWYtxJ6GtExgU3usbQukH0GxUDkfSz6WjUdImkIFEg9ncqE"
              alt="Şükran App restoran yönetim paneli"
              className="home-hero__image"
            />

            <div className="home-hero__floating-card">
              <span className="material-symbols-outlined">
                trending_up
              </span>

              <div>
                <small>Günlük operasyon</small>
                <strong>Tek merkezden kontrol</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEKORATİF AYRAÇ */}

      <div className="home-divider">
        <span />
        <span className="material-symbols-outlined">
          restaurant
        </span>
        <span />
      </div>

      {/* ÖZELLİKLER */}

      <section
        id="ozellikler"
        className="home-section home-features"
      >
        <div
          className="home-section-heading"
          data-reveal
        >
          <span className="home-eyebrow">
            Uçtan Uca Operasyon
          </span>

          <h2>
            Siparişten Ödemeye, Tüm Süreç Anında Yönetilir
          </h2>

          <p>
            Müşterileriniz QR menü üzerinden sipariş verir,
            ödemesini güvenle tamamlar ve sipariş anında mutfak
            ekranına ulaşır.
          </p>
        </div>

        <div
          className="home-process"
          data-reveal
        >
          {processSteps.map((processStep, index) => (
            <div
              className="home-process__group"
              key={processStep.title}
            >
              <div className="home-process__step">
                <span className="material-symbols-outlined">
                  {processStep.icon}
                </span>

                <strong>{processStep.title}</strong>
              </div>

              {index < processSteps.length - 1 && (
                <span className="material-symbols-outlined home-process__arrow">
                  arrow_forward
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="home-bento">
          <article
            className="home-bento__card home-bento__card--large home-bento__card--dark"
            data-reveal
          >
            <span className="material-symbols-outlined home-bento__decoration">
              qr_code_2
            </span>

            <span className="home-bento__label">
              Temassız Deneyim
            </span>

            <h3>QR Menü ile Hızlı Erişim</h3>

            <p>
              Müşteriler masadaki QR kodu okutarak saniyeler
              içinde menüye ulaşır, ürünleri inceler ve kolayca
              sipariş oluşturmaya başlar.
            </p>

            <div className="home-bento__line" />
          </article>

          <article
            className="home-bento__card"
            data-reveal
          >
            <span className="material-symbols-outlined home-bento__icon">
              shield_with_heart
            </span>

            <span className="home-bento__label">
              Ödeme Güvencesi
            </span>

            <h3>iyzico ile Güvenli Tahsilat</h3>

            <p>
              Ödemeler iyzico altyapısı üzerinden güvenli, hızlı
              ve sorunsuz şekilde tamamlanır.
            </p>
          </article>

          <article
            className="home-bento__card"
            data-reveal
          >
            <span className="material-symbols-outlined home-bento__icon">
              notifications_active
            </span>

            <span className="home-bento__label">
              Anlık Sipariş Akışı
            </span>

            <h3>Siparişler Doğrudan Mutfağa Ulaşır</h3>

            <p>
              Ödeme sonrasında sipariş anında mutfak ekranına
              düşer ve hazırlık süreci başlar.
            </p>
          </article>

          <article
            className="home-bento__card home-bento__card--large home-bento__card--dark"
            data-reveal
          >
            <span className="material-symbols-outlined home-bento__decoration">
              speed
            </span>

            <span className="home-bento__label">
              Operasyonel Hız
            </span>

            <h3>Daha Hızlı, Daha Düzenli, Daha Verimli</h3>

            <p>
              Sipariş, ödeme, mutfak ve servis süreçlerini tek
              sistemde birleştirerek personel yükünü azaltın.
            </p>

            <div className="home-bento__line" />
          </article>
        </div>
      </section>

      {/* PLATFORM TANITIMI */}

      <section
        id="platform"
        className="home-platform"
      >
        <div className="home-platform__container">
          <div
            className="home-platform__content"
            data-reveal
          >
            <span className="home-eyebrow home-eyebrow--light">
              Tek Platformda Tam Kontrol
            </span>

            <h2>
              Restoran Operasyonunun Tüm Gücü Tek Sistemde
            </h2>

            <p className="home-platform__description">
              Şükran App; mutfak, admin ve garson panellerini tek
              bir sistemde birleştirerek işletmenizin günlük
              operasyonunu sadeleştirir.
            </p>

            <div className="home-platform__features">
              {platformFeatures.map((platformFeature) => (
                <div
                  className="home-platform__feature"
                  key={platformFeature.title}
                >
                  <span className="material-symbols-outlined">
                    {platformFeature.icon}
                  </span>

                  <div>
                    <h3>{platformFeature.title}</h3>

                    <p>{platformFeature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="home-platform__visual"
            data-reveal
          >
            <div className="home-platform__visual-border" />

            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXsFt-J6UeOi_osy4BC2TuFHnccrH2pToTnZTulKo6oxme0QUFoaOTOA-QAByx_w73ivCXzpkjtRpajG16QnS6MTtxsU6jrDtmGFdpgB8jvBu0LjgvSZH1f9PV7DaBDrSU716wxf8nzFtwtKnYIrfVI7HYgxQAccUNovD0i_ZqyLTO7aTcUSG57HZBuKzGM5xHq2TO2FbIVMORb4hHyXESSnaWtFoqPAN3Y5rSPNcedz4OLu6TZP1C2P82Q6c946wS6lcL1h8bjiI"
              alt="Şükran App yönetim ekranları"
              className="home-platform__image"
            />

            <div className="home-platform__metric">
              <span className="material-symbols-outlined">
                bolt
              </span>

              <div>
                <strong>Hızlı kurulum</strong>
                <small>1–2 iş gününde kullanıma hazır</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAKETLER */}

      <section
        id="paketler"
        className="home-section home-pricing"
      >
        <div
          className="home-section-heading"
          data-reveal
        >
          <span className="home-eyebrow">
            Yatırım Planları
          </span>

          <h2>Sizin İçin En Doğru Seçim</h2>

          <p>
            İşletmenizin ölçeğine göre başlayın, ihtiyaçlarınız
            arttığında paketinizi kolayca büyütün.
          </p>

          <div className="home-billing">
            <span
              className={
                !isYearly
                  ? 'home-billing__label home-billing__label--active'
                  : 'home-billing__label'
              }
            >
              Aylık
            </span>

            <button
              type="button"
              className={`home-billing__switch ${
                isYearly ? 'home-billing__switch--active' : ''
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
                  ? 'home-billing__label home-billing__label--active'
                  : 'home-billing__label'
              }
            >
              Yıllık
            </span>

            <strong className="home-billing__discount">
              %{plans[0]?.annualDiscountPercent ?? 10} İndirim
            </strong>
          </div>
        </div>

        <div className="home-pricing__grid">
          {plansError && (
            <p className="home-price-card__description">{plansError}</p>
          )}

          {plans.map((plan) => {
            const copy = planCopy[plan.code] ?? {};
            const total = displayedTotal(plan);

            return (
              <article
                className={`home-price-card ${
                  copy.featured
                    ? 'home-price-card--featured'
                    : ''
                }`}
                key={plan.code}
                data-reveal
              >
                {copy.featured && (
                  <span className="home-price-card__popular">
                    En Çok Tercih Edilen
                  </span>
                )}

                {/* Paket adları İngilizce ürün adıdır (Lite, Pro, Business, Enterprise).
                    Sayfa lang="tr" olduğu için text-transform: uppercase bunları
                    "BUSİNESS"/"ENTERPRİSE" yapıyordu; lang="en" İngilizce kuralı uygular. */}
                <h3 lang="en">{plan.displayName}</h3>

                <p className="home-price-card__description">
                  {copy.description ?? plan.summary}
                </p>

                <div className="home-price-card__price">
                  {plan.isQuoteOnly ? (
                    <strong>Özel Teklif</strong>
                  ) : (
                    <>
                      <strong>₺{formatPrice(total)}</strong>
                      <span>{isYearly ? '/yıl' : '/ay'}</span>
                    </>
                  )}
                </div>

                {isYearly && !plan.isQuoteOnly && plan.annualSavings > 0 && (
                  <span className="home-price-card__yearly-note">
                    <s>₺{formatPrice(plan.annualListTotal)}</s>{' '}
                    · %{plan.annualDiscountPercent} indirim, ₺{formatPrice(plan.annualSavings)} kazanç
                  </span>
                )}

                <ul className="home-price-card__features">
                  {(copy.features ?? []).map((feature) => (
                    <li key={feature}>
                      <span className="material-symbols-outlined">
                        check
                      </span>

                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.isQuoteOnly ? (
                  // Enterprise: sabit fiyat yok, dogrudan WhatsApp'a yonlendirilir.
                  <a
                    href={enterpriseContactHref}
                    target={ENTERPRISE_WHATSAPP ? '_blank' : undefined}
                    rel={ENTERPRISE_WHATSAPP ? 'noreferrer noopener' : undefined}
                    className="home-button home-price-card__button home-button--outline-dark"
                  >
                    {copy.buttonText ?? 'İletişime Geç'}
                  </a>
                ) : (
                  <Link
                    to="/kayit-ol"
                    className={`home-button home-price-card__button ${
                      copy.featured
                        ? 'home-button--brass'
                        : 'home-button--outline-dark'
                    }`}
                  >
                    {copy.buttonText ?? 'Kayıt Ol'}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* SIK SORULAN SORULAR */}

      <section className="home-section home-faq">
        <div
          className="home-section-heading"
          data-reveal
        >
          <span className="home-eyebrow">
            Merak Edilenler
          </span>

          <h2>Zihninizdeki Sorular</h2>

          <p>
            Şükran App hakkında en sık sorulan soruların
            yanıtlarını inceleyin.
          </p>
        </div>

        <div
          className="home-faq__list"
          data-reveal
        >
          {faqItems.map((faqItem) => {
            const isActive =
              activeFaqId === faqItem.id;

            return (
              <article
                className={`home-faq__item ${
                  isActive
                    ? 'home-faq__item--active'
                    : ''
                }`}
                key={faqItem.id}
              >
                <button
                  type="button"
                  className="home-faq__question"
                  onClick={() => {
                    handleToggleFaq(faqItem.id);
                  }}
                  aria-expanded={isActive}
                >
                  <span>{faqItem.question}</span>

                  <span className="material-symbols-outlined">
                    expand_more
                  </span>
                </button>

                <div className="home-faq__answer">
                  <div>
                    <p>{faqItem.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SON CTA */}

      <section className="home-final-cta">
        <div
          className="home-final-cta__content"
          data-reveal
        >
          <span className="home-eyebrow home-eyebrow--light">
            Dönüşüm Bugün Başlıyor
          </span>

          <h2>Restoranınızı Geleceğe Taşıyın</h2>

          <p>
            Operasyonunuzu sadeleştiren, ekibinizin hızını
            artıran ve müşterilerinize modern bir deneyim sunan
            Şükran App ile tanışın.
          </p>

          <div className="home-final-cta__actions">
            <Link
              to="/kayit-ol"
              className="home-button home-button--brass"
            >
              Hemen Başla
            </Link>

            <Link
              to="/iletisim"
              className="home-button home-button--outline-light"
            >
              Özel Sunum Talebi
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;