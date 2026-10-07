import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { supportInformation } from './supportInformation';
import { supportApi } from '../../api/support.js';
import { ApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

import './SupportPage.css';

const supportSubjects = [
  'Genel Destek',
  'Teknik Sorun',
  'Sipariş Sorunu',
  'Ödeme Sorunu',
  'QR Menü Sorunu',
  'Mutfak Paneli Sorunu',
  'Hesap ve Giriş Sorunu',
  'Paket ve Üyelik',
  'Diğer',
];

function createWhatsAppUrl(panelName) {
  const message = [
    'Merhaba Şükran App Destek Ekibi,',
    '',
    `${panelName} üzerinden destek almak istiyorum.`,
  ].join('\n');

  return `https://wa.me/${
    supportInformation.whatsappNumber
  }?text=${encodeURIComponent(message)}`;
}

export default function SupportPage({
  panelType = 'admin',
}) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [subject, setSubject] =
    useState(supportSubjects[0]);

  const [message, setMessage] = useState('');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const panelInformation = useMemo(() => {
    if (panelType === 'kitchen') {
      return {
        panelName: 'Mutfak Paneli',
        title: 'Mutfak Destek Merkezi',
        description:
          'Sipariş ekranı, ürünler, masalar veya mutfak operasyonuyla ilgili sorunlarınız için destek ekibimize ulaşabilirsiniz.',
        backPath: '/kitchen/orders/active',
        backLabel: 'Aktif siparişlere dön',
      };
    }

    return {
      panelName: 'Admin Paneli',
      title: 'İşletme Destek Merkezi',
      description:
        'Hesabınız, ürünleriniz, siparişleriniz, masalarınız veya ödeme süreçlerinizle ilgili destek alabilirsiniz.',
      backPath: '/admin',
      backLabel: 'Admin paneline dön',
    };
  }, [panelType]);

  const whatsappUrl = useMemo(
    () =>
      createWhatsAppUrl(
        panelInformation.panelName,
      ),
    [panelInformation.panelName],
  );

  const handleEmailSubmit = async (event) => {
    event.preventDefault();

    const normalizedMessage = message.trim();

    setFormError('');

    if (!normalizedMessage) {
      setFormError(
        'Lütfen destek talebinizi açıklayın.',
      );

      return;
    }

    const emailSubject =
      `Şükran App Destek Talebi – ${subject}`;

    const emailBody = [
      'Merhaba Şükran App Destek Ekibi,',
      '',
      `Panel: ${panelInformation.panelName}`,
      `Destek konusu: ${subject}`,
      '',
      'Talep açıklaması:',
      normalizedMessage,
      '',
      'İyi çalışmalar.',
    ].join('\n');

    const mailtoUrl =
      `mailto:${supportInformation.email}` +
      `?subject=${encodeURIComponent(emailSubject)}` +
      `&body=${encodeURIComponent(emailBody)}`;

    setIsSubmitting(true);

    try {
      // Talep, Şükran App ekibinin süper admin panelinde görebileceği
      // şekilde kayıt altına alınır (bkz. SuperAdminSupport).
      await supportApi.create({
        businessName: user?.name ?? panelInformation.panelName,
        content: `[${subject}] ${normalizedMessage}`,
        phone: '',
        restaurantId: user?.restaurantId ?? null,
      });

      success('Destek talebiniz kaydedildi. Size en kısa sürede dönüş yapılacaktır.');
      setMessage('');
    } catch (err) {
      showError(
        err instanceof ApiError
          ? err.message
          : 'Destek talebiniz kaydedilemedi. E-posta uygulamanız yine de açılacak.',
      );
    } finally {
      setIsSubmitting(false);
    }

    window.location.href = mailtoUrl;
  };

  return (
    <div className="support-page">
      <section className="support-hero">
        <div>
          <span className="support-hero__eyebrow">
            Şükran App Destek
          </span>

          <h1>{panelInformation.title}</h1>

          <p>{panelInformation.description}</p>
        </div>

        <Link
          className="support-back-button"
          to={panelInformation.backPath}
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            arrow_back
          </span>

          <span>{panelInformation.backLabel}</span>
        </Link>
      </section>

      <section
        className="support-contact-grid"
        aria-label="Destek iletişim seçenekleri"
      >
        <article className="support-contact-card">
          <div className="support-contact-card__icon">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              mail
            </span>
          </div>

          <div className="support-contact-card__content">
            <span className="support-contact-card__label">
              E-posta
            </span>

            <h2>E-posta ile destek</h2>

            <p>
              Detaylı taleplerinizi destek ekibimize
              e-posta yoluyla iletebilirsiniz.
            </p>

            <a
              href={`mailto:${supportInformation.email}`}
            >
              {supportInformation.email}

              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </a>
          </div>
        </article>

        <article className="support-contact-card">
          <div className="support-contact-card__icon support-contact-card__icon--whatsapp">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              chat
            </span>
          </div>

          <div className="support-contact-card__content">
            <span className="support-contact-card__label">
              WhatsApp
            </span>

            <h2>WhatsApp desteği</h2>

            <p>
              Hızlı yardım almak için destek ekibimize
              WhatsApp üzerinden ulaşabilirsiniz.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp’tan yaz

              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                open_in_new
              </span>
            </a>
          </div>
        </article>

        <article className="support-contact-card">
          <div className="support-contact-card__icon support-contact-card__icon--phone">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              call
            </span>
          </div>

          <div className="support-contact-card__content">
            <span className="support-contact-card__label">
              Telefon
            </span>

            <h2>Telefonla iletişim</h2>

            <p>
              Çalışma saatleri içerisinde yetkilimizle
              doğrudan görüşebilirsiniz.
            </p>

            <a
              href={`tel:${supportInformation.phoneLink}`}
            >
              {supportInformation.phoneDisplay}

              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                call
              </span>
            </a>
          </div>
        </article>
      </section>

      <section className="support-content-grid">
        <article className="support-form-card">
          <header className="support-section-header">
            <div>
              <span className="support-section-header__eyebrow">
                Destek talebi
              </span>

              <h2>Bize nasıl yardımcı olabiliriz?</h2>

              <p>
                Konuyu seçin ve yaşadığınız durumu
                açıklayın. E-posta uygulamanız mesajınız
                hazırlanmış şekilde açılacaktır.
              </p>
            </div>

            <span
              className="material-symbols-outlined support-section-header__icon"
              aria-hidden="true"
            >
              support_agent
            </span>
          </header>

          <form
            className="support-form"
            onSubmit={handleEmailSubmit}
            noValidate
          >
            <div className="support-form__field">
              <label htmlFor={`${panelType}-support-subject`}>
                Destek konusu
              </label>

              <div className="support-form__select">
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  topic
                </span>

                <select
                  id={`${panelType}-support-subject`}
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                  }}
                >
                  {supportSubjects.map(
                    (supportSubject) => (
                      <option
                        key={supportSubject}
                        value={supportSubject}
                      >
                        {supportSubject}
                      </option>
                    ),
                  )}
                </select>

                <span
                  className="material-symbols-outlined support-form__select-arrow"
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </div>
            </div>

            <div className="support-form__field">
              <label htmlFor={`${panelType}-support-message`}>
                Talebiniz
              </label>

              <textarea
                id={`${panelType}-support-message`}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                }}
                placeholder="Yaşadığınız sorunu ve size nasıl yardımcı olabileceğimizi açıklayın..."
                rows="7"
                maxLength="1500"
              />

              <div className="support-form__counter">
                {message.length}/1500
              </div>
            </div>

            {formError && (
              <div
                className="support-form__error"
                role="alert"
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  error
                </span>

                <span>{formError}</span>
              </div>
            )}

            <button
              className="support-form__submit"
              type="submit"
              disabled={isSubmitting}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                outgoing_mail
              </span>

              <span>{isSubmitting ? 'Gönderiliyor...' : 'E-posta Oluştur'}</span>
            </button>

            <p className="support-form__notice">
              Bu işlem cihazınızdaki varsayılan e-posta
              uygulamasını açar. Mesaj gönderilmeden önce
              içeriği kontrol edebilirsiniz.
            </p>
          </form>
        </article>

        <aside className="support-information">
          <article className="support-authorized-card">
            <div className="support-authorized-card__top">
              <div className="support-authorized-card__avatar">
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  person
                </span>
              </div>

              <div>
                <span>Telefon destek yetkilisi</span>

                <h2>
                  {supportInformation.authorizedPerson}
                </h2>

                <p>
                  {
                    supportInformation.authorizedPersonTitle
                  }
                </p>
              </div>
            </div>

            <div className="support-authorized-card__status">
              <span />

              Çalışma saatleri içerisinde ulaşılabilir
            </div>

            <a
              href={`tel:${supportInformation.phoneLink}`}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                call
              </span>

              Şimdi ara
            </a>
          </article>

          <article className="support-hours-card">
            <div className="support-hours-card__header">
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                schedule
              </span>

              <h2>Destek saatleri</h2>
            </div>

            <ul>
              <li>
                <span>Hafta içi</span>

                <strong>
                  {
                    supportInformation.workingHours
                      .weekdays
                  }
                </strong>
              </li>

              <li>
                <span>Cumartesi</span>

                <strong>
                  {
                    supportInformation.workingHours
                      .saturday
                  }
                </strong>
              </li>

              <li>
                <span>Pazar</span>

                <strong>
                  {
                    supportInformation.workingHours
                      .sunday
                  }
                </strong>
              </li>
            </ul>
          </article>

          <article className="support-emergency-card">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              priority_high
            </span>

            <div>
              <h2>Acil teknik sorun mu var?</h2>

              <p>
                Sipariş veya ödeme sistemini etkileyen
                acil durumlarda WhatsApp üzerinden
                bizimle iletişime geçin.
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Acil destek iste
              </a>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}