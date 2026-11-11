import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import './Login.css';

const loginFeatures = [
  {
    icon: 'verified_user',
    text: 'Güvenli hesap erişimi',
  },
  {
    icon: 'badge',
    text: 'Rol bazlı panel yönetimi',
  },
  {
    icon: 'devices',
    text: 'Tüm cihazlardan tam kontrol',
  },
];

export default function Login({ recovery = false, resetPassword = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isLoginSuccessful, setIsLoginSuccessful] = useState(false);

  const isFormValid =
    email.trim().length > 0 &&
    password.trim().length >= 6;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError('');
    setIsLoginSuccessful(false);

    if (!email.trim()) {
      setFormError('Lütfen e-posta adresinizi girin.');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    if (!password.trim()) {
      setFormError('Lütfen şifrenizi girin.');
      return;
    }

    if (password.length < 6) {
      setFormError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await login(email.trim(), password);
      setIsLoginSuccessful(true);
      const redirectTo = location.state?.from?.pathname ?? homePathForRole(profile.role);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.status === 401
            ? 'E-posta veya şifre hatalı.'
            : error.message
          : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-showcase">
        <img
          className="login-showcase__background"
          src="/images/giris-restoran.jpg"
          alt=""
          aria-hidden="true"
        />

        <div className="login-showcase__overlay" />

        <div className="login-showcase__content">
          <div className="login-showcase__top">
            <Link className="login-brand" to="/" aria-label="Şükran ana sayfa">
              <img src="/sukranapp.png?v=2" alt="Şükran App" />
              <span>Şükran App</span>
            </Link>

            <span className="login-showcase__badge">
              Güvenli Yönetim Paneli
            </span>
          </div>

          <div className="login-showcase__main">
            <div className="login-showcase__eyebrow">
              Restoran Yönetim Merkezi
            </div>

            <h1>
              İşletmenizin kontrolü
              <span>yeniden elinizde.</span>
            </h1>

            <p className="login-showcase__description">
              Siparişlerinizi, masalarınızı, ürünlerinizi ve ekip
              operasyonunuzu tek panelden yönetmeye devam edin.
            </p>

            <div className="login-features">
              {loginFeatures.map((feature) => (
                <div className="login-feature" key={feature.text}>
                  <span className="login-feature__icon">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      {feature.icon}
                    </span>
                  </span>

                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="login-system-status">
              <span className="login-system-status__indicator" />
              <span>Tüm sistemler çalışıyor</span>
            </div>
          </div>

          <p className="login-showcase__footer">
            © {new Date().getFullYear()} Şükran App. Tüm hakları saklıdır.
          </p>
        </div>
      </section>

      <section className="login-form-section">
        <Link className="login-home-link" to="/">
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
          <span>Ana sayfaya dön</span>
        </Link>

        <div className="login-form-wrapper">
          <div className="login-mobile-brand">
            <Link className="login-brand" to="/">
              <img src="/sukranapp.png?v=2" alt="Şükran App" />
              <span>Şükran App</span>
            </Link>
          </div>

          {resetPassword ? (
  <ResetPasswordCard />
) : recovery ? (
  <PasswordRecoveryCard />
) : (
  <div className="login-form-card">
            <header className="login-form-card__header">
              <span>Tekrar hoş geldiniz</span>

              <h2>Şükran App’e giriş yapın</h2>

              <p>
                İşletme hesabınıza güvenli şekilde erişin.
              </p>

              <div className="login-form-card__register">
                <span>Henüz hesabınız yok mu?</span>
                <Link to="/kayit-ol">Kayıt ol</Link>
              </div>
            </header>

            {formError && (
              <div
                className="login-alert login-alert--error"
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

            {isLoginSuccessful && (
              <div
                className="login-alert login-alert--success"
                role="status"
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                >
                  check_circle
                </span>

                <span>Giriş doğrulandı. Yönlendiriliyorsunuz…</span>
              </div>
            )}

            <form
              className="login-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="login-field">
                <label htmlFor="loginEmail">
                  E-posta adresi
                </label>

                <div className="login-input">
                  <span
                    className="login-input__icon material-symbols-outlined"
                    aria-hidden="true"
                  >
                    mail
                  </span>

                  <input
                    id="loginEmail"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFormError('');
                      setIsLoginSuccessful(false);
                    }}
                    placeholder="isletme@sukran.app"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="loginPassword">
                  Şifre
                </label>

                <div className="login-input login-input--password">
                  <span
                    className="login-input__icon material-symbols-outlined"
                    aria-hidden="true"
                  >
                    lock
                  </span>

                  <input
                    id="loginPassword"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFormError('');
                      setIsLoginSuccessful(false);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setIsPasswordVisible((current) => !current)
                    }
                    aria-label={
                      isPasswordVisible
                        ? 'Şifreyi gizle'
                        : 'Şifreyi göster'
                    }
                    aria-pressed={isPasswordVisible}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      {isPasswordVisible
                        ? 'visibility_off'
                        : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="login-form__options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                  />

                  <span>Beni hatırla</span>
                </label>

                <Link
                  className="login-forgot-password"
                  to="/sifremi-unuttum"
                >
                  Şifremi unuttum
                </Link>
              </div>

              <button
                className="login-submit"
                type="submit"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="login-submit__spinner" />
                    <span>Kontrol ediliyor</span>
                  </>
                ) : (
                  <>
                    <span>Giriş yap</span>

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

            <div className="login-role-info">
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                shield
              </span>

              <p>
                Hesabınızın rolüne göre Yönetim, Mutfak veya Garson
                paneline yönlendirilirsiniz.
              </p>
            </div>

                        <p className="login-support">
              Giriş yapmakta sorun mu yaşıyorsunuz?
              <Link to="/iletisim">Destek ekibine ulaşın</Link>
            </p>
          </div>
          )}

          <div className="login-secure-note">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              lock_person
            </span>

            <span>
              Bağlantınız güvenli şekilde şifrelenmektedir
            </span>
          </div>

          <p className="login-mobile-copyright">
            © {new Date().getFullYear()} Şükran App. Tüm hakları
            saklıdır.
          </p>
        </div>
      </section>
        </main>
  );
}

function PasswordRecoveryCard() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSending(true);
    try {
      await authApi.forgotPassword(email.trim());
      // Hesap olsun olmasın aynı mesaj: kayıtlı e-postalar bu ekrandan öğrenilemesin.
      setNotice(
        'Bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. ' +
          'Bağlantı 30 dakika geçerlidir; gelen kutunuzda yoksa spam klasörüne bakın.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İstek gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="login-form-card">
      <header className="login-form-card__header">
        <h1>Şifremi Unuttum</h1>
        <p>Hesabınıza kayıtlı e-posta adresini girin; size şifre sıfırlama bağlantısı gönderelim.</p>
      </header>

      {error && (
        <div className="login-alert login-alert--error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <span>{error}</span>
        </div>
      )}

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="businessRecoveryEmail">E-posta adresi</label>
          <div className="login-input">
            <span className="login-input__icon material-symbols-outlined" aria-hidden="true">mail</span>
            <input
              id="businessRecoveryEmail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@isletme.com"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setNotice(''); setError(''); }}
            />
          </div>
        </div>

        <button type="submit" className="login-submit" disabled={isSending || !email.trim()}>
          {isSending ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
        </button>
      </form>

      {notice && (
        <div className="login-alert login-alert--success" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
          <span>{notice}</span>
        </div>
      )}

      <p className="login-support">
        <Link to="/giris-yap">← Giriş ekranına dön</Link>
      </p>
    </div>
  );
}

function ResetPasswordCard() {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (password !== passwordAgain) {
      setError('Şifreler aynı değil.');
      return;
    }
    setIsSaving(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      window.setTimeout(() => navigate('/giris-yap', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="login-form-card">
        <header className="login-form-card__header">
          <h1>Bağlantı geçersiz</h1>
          <p>Şifre sıfırlama bağlantısı eksik. E-postadaki bağlantıyı yeniden açın ya da yeni bağlantı isteyin.</p>
        </header>
        <p className="login-support"><Link to="/sifremi-unuttum">Yeni bağlantı iste</Link></p>
      </div>
    );
  }

  return (
    <div className="login-form-card">
      <header className="login-form-card__header">
        <h1>Yeni Şifre Belirleyin</h1>
        <p>Yeni şifreniz en az 8 karakter olmalı. Şifre değişince diğer cihazlardaki oturumlar kapanır.</p>
      </header>

      {error && (
        <div className="login-alert login-alert--error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <span>{error}</span>
        </div>
      )}

      {done ? (
        <div className="login-alert login-alert--success" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>Şifreniz değiştirildi. Giriş ekranına yönlendiriliyorsunuz…</span>
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="newPassword">Yeni şifre</label>
            <div className="login-input">
              <span className="login-input__icon material-symbols-outlined" aria-hidden="true">lock</span>
              <input id="newPassword" type="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="newPasswordAgain">Yeni şifre (tekrar)</label>
            <div className="login-input">
              <span className="login-input__icon material-symbols-outlined" aria-hidden="true">lock</span>
              <input id="newPasswordAgain" type="password" autoComplete="new-password" required minLength={8}
                value={passwordAgain} onChange={(e) => setPasswordAgain(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="login-submit" disabled={isSaving}>
            {isSaving ? 'Kaydediliyor...' : 'Şifremi Değiştir'}
          </button>
        </form>
      )}

      <p className="login-support">
        <Link to="/giris-yap">← Giriş ekranına dön</Link>
      </p>
    </div>
  );
}
