import { useState } from 'react';
import { Link } from 'react-router-dom';

import './ForgotPassword.css';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '');

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isRequestSuccessful, setIsRequestSuccessful] =
    useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setFormError('');
    setIsRequestSuccessful(false);

    if (!normalizedEmail) {
      setFormError('Lütfen e-posta adresinizi girin.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setFormError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          'Şifre sıfırlama isteği gönderilemedi.',
        );
      }

      setIsRequestSuccessful(true);
    } catch (error) {
      console.error(
        'Şifre sıfırlama isteği gönderilemedi:',
        error,
      );

      setFormError(
        'Şu anda sıfırlama bağlantısı gönderilemedi. Lütfen daha sonra tekrar deneyin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDifferentEmail = () => {
    setEmail('');
    setFormError('');
    setIsRequestSuccessful(false);
  };

  return (
    <main className="forgot-password-page">
      <section className="forgot-password-showcase">
        <div className="forgot-password-showcase__overlay" />

        <div className="forgot-password-showcase__content">
          <Link
            className="forgot-password-brand"
            to="/"
            aria-label="Şükran App ana sayfa"
          >
            <img
              src="/sukranapp.png"
              alt="Şükran App"
            />

            <span>Şükran App</span>
          </Link>

          <div className="forgot-password-showcase__message">
            <span className="forgot-password-showcase__eyebrow">
              Güvenli hesap kurtarma
            </span>

            <h1>
              Hesabınıza yeniden erişin.
            </h1>

            <p>
              Şifrenizi yenilemek için işletme hesabınıza
              kayıtlı e-posta adresini kullanın. Güvenli
              sıfırlama bağlantısını size gönderelim.
            </p>
          </div>

          <p className="forgot-password-showcase__footer">
            © {new Date().getFullYear()} Şükran App. Tüm
            hakları saklıdır.
          </p>
        </div>
      </section>

      <section className="forgot-password-form-section">
        <Link
          className="forgot-password-back"
          to="/giris-yap"
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            arrow_back
          </span>

          <span>Giriş ekranına dön</span>
        </Link>

        <div className="forgot-password-card">
          <div
            className="forgot-password-icon"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">
              lock_reset
            </span>
          </div>

          <header className="forgot-password-card__header">
            <span className="forgot-password-card__eyebrow">
              Şifre yenileme
            </span>

            <h2>Şifrenizi mi unuttunuz?</h2>

            <p>
              İşletme hesabınıza kayıtlı e-posta adresini
              yazın. Şifrenizi yenileyebilmeniz için size
              bir bağlantı gönderelim.
            </p>
          </header>

          {isRequestSuccessful ? (
            <>
              <div
                className="forgot-password-success"
                role="status"
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  mark_email_read
                </span>

                <div>
                  <strong>E-postanızı kontrol edin</strong>

                  <p>
                    Bu e-posta adresi sistemimizde kayıtlıysa şifre
  sıfırlama bağlantısı gönderildi. Spam klasörünü
  de kontrol etmeyi unutmayın.
                  </p>
                </div>
              </div>

              <button
                className="forgot-password-different-email"
                type="button"
                onClick={handleDifferentEmail}
              >
                Farklı bir e-posta adresi kullan
              </button>
            </>
          ) : (
            <form
              className="forgot-password-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="forgot-password-field">
                <label htmlFor="forgotPasswordEmail">
                  E-posta adresi
                </label>

                <div className="forgot-password-input">
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    mail
                  </span>

                  <input
                    id="forgotPasswordEmail"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="ornek@isletmeLaughs.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {formError && (
                <div
                  className="forgot-password-error"
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
                className="forgot-password-submit"
                type="submit"
                disabled={
                  isSubmitting || !email.trim()
                }
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="forgot-password-spinner"
                      aria-hidden="true"
                    />

                    <span>Gönderiliyor...</span>
                  </>
                ) : (
                  <>
                    <span>Sıfırlama Bağlantısı Gönder</span>

                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          <p className="forgot-password-help">
            Yardıma mı ihtiyacınız var?

            <Link to="/iletisim">
              Destek ekibine ulaşın
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}