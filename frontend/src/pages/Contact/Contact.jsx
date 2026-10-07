import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import './Contact.css';

const helpTopics = [
  {
    icon: 'demography',
    title: 'Demo Talebi',
  },
  {
    icon: 'payments',
    title: 'Fiyatlandırma',
  },
  {
    icon: 'support_agent',
    title: 'Teknik Destek',
  },
  {
    icon: 'handshake',
    title: 'İş Birliği',
  },
];

const contactCards = [
  {
    icon: 'mail',
    title: 'E-posta',
    description: 'Genel bilgi ve iş birliği talepleri',
    value: 'info@sukranapp.com',
    href: 'mailto:info@sukranapp.com',
  },
  {
    icon: 'call',
    title: 'Telefon',
    description: 'Hafta içi 09.00–18.00',
    value: '+90 (000) 000 00 00',
    href: 'tel:+900000000000',
  },
  {
    icon: 'location_on',
    title: 'Konum',
    description: 'Türkiye genelinde dijital hizmet',
    value: 'İzmir, Türkiye',
  },
  {
    icon: 'headset_mic',
    title: 'Destek',
    description: 'Mevcut müşteriler için teknik destek',
    value: 'destek@sukranapp.com',
    href: 'mailto:destek@sukranapp.com',
  },
];

const advantages = [
  {
    icon: 'verified',
    title: 'İşletmeye Özel Kurulum',
    description:
      'Sistem restoranınızın ihtiyaçlarına göre yapılandırılır.',
  },
  {
    icon: 'bolt',
    title: 'Hızlı Başlangıç',
    description:
      'Teknik karmaşa yaşamadan kısa sürede kullanıma başlayın.',
  },
  {
    icon: 'smartphone',
    title: 'Mobil Uyumlu Sistem',
    description:
      'Operasyonunuzu telefon, tablet ve bilgisayardan yönetin.',
  },
  {
    icon: 'security',
    title: 'Güvenli Ödeme Altyapısı',
    description:
      'Ödeme işlemlerini iyzico altyapısıyla güvenle gerçekleştirin.',
  },
  {
    icon: 'support_agent',
    title: 'Kurulum Sonrası Destek',
    description:
      'Kullanım sürecinde ihtiyaç duyduğunuz desteğe ulaşın.',
  },
];

const processSteps = [
  {
    number: '01',
    icon: 'send',
    title: 'Formu Gönderin',
    description:
      'İşletmeniz ve ihtiyaçlarınız hakkında temel bilgileri bize iletin.',
  },
  {
    number: '02',
    icon: 'analytics',
    title: 'İhtiyaç Analizi',
    description:
      'Ekibimiz işletmenizin ihtiyaçlarını değerlendirerek sizinle iletişime geçsin.',
  },
  {
    number: '03',
    icon: 'present_to_all',
    title: 'Ücretsiz Sunum',
    description:
      'Şükran App sistemini ve işletmenize uygun çözümleri canlı olarak inceleyin.',
  },
  {
    number: '04',
    icon: 'rocket_launch',
    title: 'Kurulum',
    description:
      'Gerekli tanımlamaları tamamlayarak dijital dönüşümünüzü başlatın.',
  },
];

const faqItems = [
  {
    id: 'demo',
    question: 'Demo görüşmesi ücretli mi?',
    answer:
      'Hayır. Demo görüşmelerimiz tamamen ücretsizdir. Ekibimiz ihtiyaçlarınızı değerlendirir ve işletmenize uygun özellikleri size tanıtır.',
  },
  {
    id: 'response',
    question:
      'Formu gönderdikten sonra ne zaman dönüş yapılır?',
    answer:
      'Talebiniz çalışma saatleri içerisinde ulaştığında aynı iş günü içerisinde sizinle iletişime geçmeyi hedefliyoruz.',
  },
  {
    id: 'installation',
    question:
      'Türkiye’nin her yerine kurulum yapılıyor mu?',
    answer:
      'Evet. Bulut tabanlı sistemimiz sayesinde Türkiye genelindeki işletmelere uzaktan kurulum ve kullanım desteği sunabiliriz.',
  },
  {
    id: 'custom-plan',
    question:
      'İşletmeme özel paket oluşturulabilir mi?',
    answer:
      'İşletmenizin masa sayısı, şube yapısı ve ihtiyaç duyduğu modüller değerlendirilerek size özel çözüm seçenekleri sunulabilir.',
  },
  {
    id: 'support',
    question: 'Teknik destek nasıl sağlanıyor?',
    answer:
      'Teknik destek talepleriniz destek kanallarımız üzerinden alınır ve ilgili ekip tarafından değerlendirilir.',
  },
];

function Contact() {
  const [activeFaqId, setActiveFaqId] = useState(
    faqItems[0].id,
  );

  const [isFormSubmitted, setIsFormSubmitted] =
    useState(false);

  useEffect(() => {
    const revealElements = document.querySelectorAll(
      '.contact-page [data-reveal]',
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

  const handleSubmit = (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setIsFormSubmitted(true);
    form.reset();
  };

  const handleFaqToggle = (faqId) => {
    setActiveFaqId((currentFaqId) =>
      currentFaqId === faqId ? null : faqId,
    );
  };

  const scrollToForm = () => {
    document
      .getElementById('iletisim-formu')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  };

  return (
    <div className="contact-page">
      {/* HERO */}

      <section className="contact-hero">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuynb6EJ321xq41zkhVgGdbUdkMVU8TYdLECLnBCKe5djhOgPZsFFfKu1ILXhc7hzbNQtp3VWRX8WgWQ4fnB5V8tSLXaQZe7F1LWtOoV0bHNoQBUo3Uh92qRA62RmP_ATmm1yN3nor3f0bDPmHM6D98rvk9uC8GpxhPkg7u6UDLxuhbEDKIDjdW6zrlbGC_5mJljqOd5B4-BYJaD0xTIh1Htohj2phlf7J49klPTfV7w5HXsdHprytU0RmDL1JG892sC4BHRNOG78"
          alt=""
          className="contact-hero__background"
        />

        <div className="contact-hero__overlay" />

        <div className="contact-hero__container">
          <div
            className="contact-hero__content"
            data-reveal
          >
            <div className="contact-eyebrow">
              <span />
              <strong>Bizimle İletişime Geçin</strong>
            </div>

            <h1>
              Restoranınızın Dijital Dönüşümünü
              <span> Birlikte Planlayalım</span>
            </h1>

            <p>
              Şükran App hakkında bilgi almak, ücretsiz demo
              talep etmek veya işletmenize özel çözümleri
              görüşmek için ekibimizle iletişime geçin.
            </p>

            <div className="contact-hero__trust">
              <div>
                <span className="material-symbols-outlined">
                  check_circle
                </span>
                Hızlı geri dönüş
              </div>

              <div>
                <span className="material-symbols-outlined">
                  check_circle
                </span>
                İşletmeye özel danışmanlık
              </div>

              <div>
                <span className="material-symbols-outlined">
                  check_circle
                </span>
                Ücretsiz ürün sunumu
              </div>
            </div>
          </div>

          <div
            className="contact-hero__help"
            data-reveal
          >
            <span className="contact-hero__help-label">
              İhtiyacınızı Belirleyin
            </span>

            <h2>
              Hangi konuda yardıma ihtiyacınız var?
            </h2>

            <div className="contact-hero__help-grid">
              {helpTopics.map((helpTopic) => (
                <button
                  type="button"
                  key={helpTopic.title}
                  onClick={scrollToForm}
                >
                  <span className="material-symbols-outlined">
                    {helpTopic.icon}
                  </span>

                  <strong>{helpTopic.title}</strong>

                  <span className="material-symbols-outlined contact-hero__help-arrow">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* İLETİŞİM KARTLARI */}

      <section className="contact-info">
        <div className="contact-container contact-info__grid">
          {contactCards.map((contactCard) => {
            const content = (
              <>
                <span className="material-symbols-outlined">
                  {contactCard.icon}
                </span>

                <small>{contactCard.title}</small>

                <p>{contactCard.description}</p>

                <strong>{contactCard.value}</strong>
              </>
            );

            if (contactCard.href) {
              return (
                <a
                  href={contactCard.href}
                  className="contact-info__card"
                  key={contactCard.title}
                  data-reveal
                >
                  {content}
                </a>
              );
            }

            return (
              <article
                className="contact-info__card"
                key={contactCard.title}
                data-reveal
              >
                {content}
              </article>
            );
          })}
        </div>
      </section>

      {/* FORM VE AVANTAJLAR */}

      <section
        id="iletisim-formu"
        className="contact-form-section"
      >
        <div className="contact-container">
          <div
            className="contact-section-heading"
            data-reveal
          >
            <span>Ücretsiz Görüşme</span>

            <h2>
              İşletmeniz İçin Özel Bir Görüşme Planlayalım
            </h2>

            <p>
              Formu doldurun, ihtiyaçlarınızı değerlendirdikten
              sonra ekibimiz sizinle iletişime geçsin.
            </p>
          </div>

          <div className="contact-form-section__grid">
            <div
              className="contact-form-card"
              data-reveal
            >
              {isFormSubmitted && (
                <div
                  className="contact-form__success"
                  role="status"
                >
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>

                  <div>
                    <strong>Talebiniz alındı</strong>
                    <p>
                      Ekibimiz sizinle en kısa sürede iletişime
                      geçecektir.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFormSubmitted(false);
                    }}
                    aria-label="Başarı mesajını kapat"
                  >
                    <span className="material-symbols-outlined">
                      close
                    </span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="contact-form__grid">
                  <div className="contact-field">
                    <label htmlFor="contact-full-name">
                      Ad Soyad
                      <span>*</span>
                    </label>

                    <input
                      id="contact-full-name"
                      name="fullName"
                      type="text"
                      placeholder="Adınız ve soyadınız"
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-business-name">
                      İşletme Adı
                      <span>*</span>
                    </label>

                    <input
                      id="contact-business-name"
                      name="businessName"
                      type="text"
                      placeholder="Restoran veya café adı"
                      required
                      autoComplete="organization"
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-email">
                      E-posta Adresi
                      <span>*</span>
                    </label>

                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="ornek@isletme.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-phone">
                      Telefon Numarası
                      <span>*</span>
                    </label>

                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      required
                      autoComplete="tel"
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-city">
                      Şehir
                      <span>*</span>
                    </label>

                    <input
                      id="contact-city"
                      name="city"
                      type="text"
                      placeholder="Bulunduğunuz şehir"
                      required
                      autoComplete="address-level2"
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-business-type">
                      İşletme Türü
                      <span>*</span>
                    </label>

                    <select
                      id="contact-business-type"
                      name="businessType"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        İşletme türünü seçin
                      </option>
                      <option value="restaurant">
                        Restoran
                      </option>
                      <option value="cafe">
                        Café / Bistro
                      </option>
                      <option value="fine-dining">
                        Fine Dining
                      </option>
                      <option value="hotel">Otel</option>
                      <option value="chain">
                        Zincir İşletme
                      </option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-subject">
                      İlgilendiğiniz Konu
                      <span>*</span>
                    </label>

                    <select
                      id="contact-subject"
                      name="subject"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        Görüşme konusunu seçin
                      </option>
                      <option value="demo">
                        Ücretsiz Demo
                      </option>
                      <option value="pricing">
                        Paket ve Fiyat Bilgisi
                      </option>
                      <option value="qr-menu">
                        QR Menü
                      </option>
                      <option value="payment">
                        Online Ödeme
                      </option>
                      <option value="panels">
                        Mutfak ve Garson Panelleri
                      </option>
                      <option value="enterprise">
                        Kurumsal Çözüm
                      </option>
                      <option value="support">
                        Teknik Destek
                      </option>
                    </select>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="contact-table-count">
                      Yaklaşık Masa Sayısı
                    </label>

                    <input
                      id="contact-table-count"
                      name="tableCount"
                      type="number"
                      min="1"
                      placeholder="Örneğin: 24"
                    />
                  </div>
                </div>

                <div className="contact-field contact-field--full">
                  <label htmlFor="contact-message">
                    Mesajınız
                    <span>*</span>
                  </label>

                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="İhtiyaçlarınızdan kısaca bahsedin..."
                    rows="5"
                    required
                  />
                </div>

                <div className="contact-form__consent">
                  <input
                    id="contact-kvkk"
                    name="kvkk"
                    type="checkbox"
                    required
                  />

                  <label htmlFor="contact-kvkk">
                    KVKK bilgilendirmesini okudum ve iletişim
                    amacıyla bilgilerimin işlenmesini kabul
                    ediyorum.
                  </label>
                </div>

                <button
                  type="submit"
                  className="contact-button contact-button--primary"
                >
                  Demo Talebi Gönder

                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>
              </form>
            </div>

            <aside
              className="contact-advantages"
              data-reveal
            >
              <span className="contact-advantages__eyebrow">
                Neden Şükran App?
              </span>

              <h2>
                İşletmenizi Dinliyor, İhtiyacınıza Göre Çözüm
                Sunuyoruz
              </h2>

              <p className="contact-advantages__description">
                Hazır bir sistemi dayatmak yerine işletmenizin
                çalışma yapısına uygun bir başlangıç planlarız.
              </p>

              <div className="contact-advantages__list">
                {advantages.map((advantage) => (
                  <div key={advantage.title}>
                    <span className="material-symbols-outlined">
                      {advantage.icon}
                    </span>

                    <div>
                      <strong>{advantage.title}</strong>
                      <p>{advantage.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="contact-advantages__response">
                <span className="material-symbols-outlined">
                  schedule
                </span>

                <div>
                  <small>Ortalama geri dönüş süresi</small>
                  <strong>
                    Aynı iş günü içerisinde
                  </strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* SÜREÇ */}

      <section className="contact-process">
        <div className="contact-container">
          <div
            className="contact-section-heading"
            data-reveal
          >
            <span>Süreç Nasıl İlerliyor?</span>
            <h2>Talebinizden Kuruluma Kadar</h2>

            <p>
              İşletmenize uygun çözümü belirleyerek sistemi
              kontrollü ve anlaşılır adımlarla kullanıma alırız.
            </p>
          </div>

          <div className="contact-process__wrapper">
            <div className="contact-process__line" />

            <div className="contact-process__grid">
              {processSteps.map((processStep) => (
                <article
                  key={processStep.number}
                  data-reveal
                >
                  <span className="contact-process__number">
                    {processStep.number}
                  </span>

                  <div className="contact-process__icon">
                    <span className="material-symbols-outlined">
                      {processStep.icon}
                    </span>
                  </div>

                  <h3>{processStep.title}</h3>
                  <p>{processStep.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* KONUM */}

      <section className="contact-location">
        <div className="contact-container contact-location__grid">
          <div
            className="contact-location__content"
            data-reveal
          >
            <span className="contact-location__eyebrow">
              Merkezimiz
            </span>

            <h2>Bizi Ziyaret Edin</h2>

            <p>
              Türkiye genelindeki restoran ve konaklama
              işletmelerine uzaktan kurulum ve dijital destek
              sunuyoruz.
            </p>

            <div className="contact-location__details">
              <div>
                <span className="material-symbols-outlined">
                  business
                </span>

                <div>
                  <strong>Genel Merkez</strong>
                  <p>İzmir, Türkiye</p>
                </div>
              </div>

              <div>
                <span className="material-symbols-outlined">
                  schedule
                </span>

                <div>
                  <strong>Çalışma Saatleri</strong>
                  <p>
                    Pazartesi–Cuma: 09.00–18.00
                    <br />
                    Cumartesi: 10.00–14.00
                    <br />
                    Pazar: Kapalı
                  </p>
                </div>
              </div>
            </div>

            <a
              href="https://www.google.com/maps/search/?api=1&query=Izmir%2C%20Turkey"
              target="_blank"
              rel="noreferrer"
              className="contact-button contact-button--outline"
            >
              Google Haritalarda Görüntüle

              <span className="material-symbols-outlined">
                open_in_new
              </span>
            </a>
          </div>

          <div
            className="contact-location__map"
            data-reveal
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBB-MuPp9ynlA3_j8gaMTWFNLEYKjLWVhSbJonb_yt2vLX8q_i4YvQEEYFHvK7VQtAmh2LjwXEvs-psXFZ3Pj0lCxIDdmEVkLCvK9IY8CKeTY9JarY1hbTyZtE9AjlNG2aNGEEwL6bA16NvhM6YzC3hxP-SmG9yUzdcu004UrjPX2Pcef9mC-fwQQmU61wKXRzzs6PHoMpxP5fsTi5XFOT73GKCq4FJ7uQRCR0kuW9Bd7Oj850xv3WCXhl5KJt8h7fJH8GApYVZBM"
              alt="İzmir harita görünümü"
            />

            <div className="contact-location__marker">
              <span className="material-symbols-outlined">
                location_on
              </span>

              <strong>Şükran App</strong>
              <small>İzmir, Türkiye</small>
            </div>
          </div>
        </div>
      </section>

      {/* SIK SORULAN SORULAR */}

      <section className="contact-faq">
        <div className="contact-faq__container">
          <div
            className="contact-section-heading"
            data-reveal
          >
            <span>Merak Edilenler</span>
            <h2>Sıkça Sorulan Sorular</h2>
          </div>

          <div
            className="contact-faq__list"
            data-reveal
          >
            {faqItems.map((faqItem) => {
              const isActive =
                activeFaqId === faqItem.id;

              return (
                <article
                  className={`contact-faq__item ${
                    isActive
                      ? 'contact-faq__item--active'
                      : ''
                  }`}
                  key={faqItem.id}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleFaqToggle(faqItem.id);
                    }}
                    aria-expanded={isActive}
                  >
                    <span>{faqItem.question}</span>

                    <span className="material-symbols-outlined">
                      expand_more
                    </span>
                  </button>

                  <div className="contact-faq__answer">
                    <div>
                      <p>{faqItem.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* SON CTA */}

      <section className="contact-final-cta">
        <div
          className="contact-final-cta__card"
          data-reveal
        >
          <span>Dijital Dönüşümü Başlatın</span>

          <h2>
            Restoranınız İçin Doğru Teknolojiyi Birlikte
            Seçelim
          </h2>

          <p>
            Ücretsiz ürün sunumu ve işletmenize özel
            değerlendirme için bugün bizimle iletişime geçin.
          </p>

          <div className="contact-final-cta__actions">
            <button
              type="button"
              className="contact-button contact-button--brass"
              onClick={scrollToForm}
            >
              Ücretsiz Demo Talep Et
            </button>

            <Link
              to="/hizmetler"
              className="contact-button contact-button--light-outline"
            >
              Paketleri İncele
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;