import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../context/AuthContext.jsx';
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

export default function Login() {
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
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPQXHklBPL_8cineEVEHPo9G8FzlaLg0nWy3Urlsm8XeMRkdN_q8eEFlXbbC-BS2pE6NeFd2IVTrTqjgK7Q9fABMCdAu4JQeeLIvWr9qmzJo7JYvyoo4Ic0xzA4p7N4JEVsFCsSdNqJsVjiTnhA9I31IgskpPKEDhdxdXQU-QxxQrcFT0AMbQCGdYkgZDX_E4Yk-Lu-0IjQadw6GxUHVv1VruqMgxCl9AHgplMCpk7Wu9o1NT0ledow5oIRSHZ68CRB_1fadi70jE"
          alt=""
          aria-hidden="true"
        />

        <div className="login-showcase__overlay" />

        <div className="login-showcase__content">
          <div className="login-showcase__top">
            <Link className="login-brand" to="/" aria-label="Şükran ana sayfa">
              <img src="/sukranapp.png" alt="Şükran App" />
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
              <img src="/sukranapp.png" alt="Şükran App" />
              <span>Şükran App</span>
            </Link>
          </div>

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