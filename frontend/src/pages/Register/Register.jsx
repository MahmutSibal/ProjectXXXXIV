import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { ApiError } from '../../api/client.js';
import PhoneVerificationDialog from '../../components/PhoneVerificationDialog.jsx';
import { phoneVerificationApi } from '../../api/phoneVerification.js';
import './Register.css';

const registerBenefits = [
  {
    icon: 'speed',
    title: 'Hızlı Kurulum',
    description:
      'Teknik karmaşayla uğraşmadan kısa sürede kullanıma başlayın.',
  },
  {
    icon: 'qr_code_2',
    title: 'QR Menü',
    description:
      'Müşterilerinize temassız ve modern bir menü deneyimi sunun.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'iyzico ile Güvenli Ödeme',
    description:
      'Sipariş ödemelerini güvenli altyapı üzerinden alın.',
  },
  {
    icon: 'soup_kitchen',
    title: 'Mutfak ve Garson Panelleri',
    description:
      'Sipariş hazırlama ve servis sürecini tek sistemde yönetin.',
  },
  {
    icon: 'monitoring',
    title: 'Anlık Raporlama',
    description:
      'Gelir, sipariş ve işletme performansınızı kolayca takip edin.',
  },
];

function calculatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label:
        'Şifre güvenliği için en az 8 karakter kullanın.',
      variant: 'empty',
    };
  }

  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return {
      score,
      label: 'Zayıf şifre',
      variant: 'weak',
    };
  }

  if (score <= 3) {
    return {
      score,
      label: 'Orta seviye şifre',
      variant: 'medium',
    };
  }

  return {
    score,
    label: 'Güçlü şifre',
    variant: 'strong',
  };
}

function Register() {
  const { registerBusiness } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');

  const [isPasswordVisible, setIsPasswordVisible] =
    useState(false);

  const [
    isPasswordConfirmationVisible,
    setIsPasswordConfirmationVisible,
  ] = useState(false);

  const [isKvkkAccepted, setIsKvkkAccepted] =
    useState(false);

  const [isAgreementAccepted, setIsAgreementAccepted] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isRegistrationSuccessful, setIsRegistrationSuccessful] =
    useState(false);

  const [formError, setFormError] = useState('');

  // Telefon doğrulaması bekleyen kayıt verisi. Dolu ise doğrulama penceresi açılır.
  const [pendingRegistration, setPendingRegistration] = useState(null);

  const [coordinates, setCoordinates] = useState({ latitude: '', longitude: '' });
  const [isLocating, setIsLocating] = useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        });
        setIsLocating(false);
      },
      () => {
        // Konum zorunlu değil; reddedilirse kayıt yine tamamlanabilir.
        setFormError('Konum alınamadı. Adresinizi yazarak devam edebilirsiniz.');
        setIsLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );

  const passwordsMatch =
    passwordConfirmation.length === 0 ||
    password === passwordConfirmation;

  const isPasswordValid =
    password.length >= 8 &&
    passwordStrength.score >= 2;

  const canSubmit =
    isKvkkAccepted &&
    isAgreementAccepted &&
    isPasswordValid &&
    password === passwordConfirmation &&
    !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    setFormError('');
    setIsRegistrationSuccessful(false);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!isPasswordValid) {
      setFormError(
        'Şifreniz en az 8 karakterden oluşmalı ve yeterli güvenlik seviyesine sahip olmalıdır.',
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setFormError(
        'Şifre ve şifre tekrarı birbiriyle eşleşmiyor.',
      );
      return;
    }

    if (!isKvkkAccepted) {
      setFormError(
        'Devam etmek için KVKK Aydınlatma Metni’ni onaylamalısınız.',
      );
      return;
    }

    if (!isAgreementAccepted) {
      setFormError(
        'Devam etmek için Kullanıcı Sözleşmesi’ni kabul etmelisiniz.',
      );
      return;
    }

    const formData = new FormData(form);
    const payload = {
      ownerName: String(formData.get('fullName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      password,
      businessName: String(formData.get('businessName') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      address: String(formData.get('address') ?? '').trim(),
      longitude: Number(formData.get('longitude')) || 0,
      latitude: Number(formData.get('latitude')) || 0,
    };

    // Telefon doğrulaması açıksa hesap AÇILMADAN önce numara doğrulanır.
    // Kapalıysa (WhatsApp servisi devrede değilse) doğrudan kayda geçilir.
    setIsSubmitting(true);
    let requiresPhoneVerification = false;
    try {
      const status = await phoneVerificationApi.getStatus();
      requiresPhoneVerification = Boolean(status?.enabled);
    } catch {
      // Durum okunamazsa doğrulamayı zorlamak kaydı tamamen engellerdi;
      // sunucu zaten gerekliyse jeton yokluğunda isteği reddeder.
      requiresPhoneVerification = false;
    } finally {
      setIsSubmitting(false);
    }

    if (requiresPhoneVerification) {
      setPendingRegistration(payload);
      return;
    }

    await completeRegistration(payload, null);
  };

  /** Doğrulama tamamlandı (ya da gerekmedi) -> hesabı oluştur. */
  const completeRegistration = async (payload, phoneVerificationTicket) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      // Hesap, restoran ve 14 günlük ücretsiz deneme aboneliği tek adımda kurulur;
      // kullanıcı doğrudan yönetim paneline girer.
      await registerBusiness({ ...payload, phoneVerificationTicket });

      setPendingRegistration(null);
      setIsRegistrationSuccessful(true);

      window.setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 1200);
    } catch (error) {
      setPendingRegistration(null);
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="register-page">
      {/* SOL MARKA ALANI */}

      <section className="register-showcase">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQNVwZGy97PECG452dVtTW4t0iDYoGgrek1nVB_FRsbQ4J1MF0XpV1kPkhNGgwu8pQLY0paLeAL1I_Igc2eXlJA6VSm2nykFSNY6ZHus6PNPjNRfqSKxZKRi7u0pYWAygMf7dccvyTKY2gJmScxKaxl2v-pgA73hLFVWwep88fiucomdJjfekINtELiyDkvznK049YhUC2VGWLM7q6L0b27Xk-iJGZBRmn9HNb8uf9Fvd8uyW5JOs8FZ7pCo1zi0ShUAYn5MrTgWc"
          alt=""
          className="register-showcase__background"
        />

        <div className="register-showcase__overlay" />

        <div className="register-showcase__content">
          <div className="register-showcase__top">
            <Link
              to="/"
              className="register-brand"
              aria-label="Şükran App ana sayfa"
            >
              <img
                src="/sukranapp.png"
                alt="Şükran App"
              />

              <span>Şükran</span>
            </Link>

            <span className="register-showcase__badge">
              Yeni Nesil Restoran Yönetimi
            </span>
          </div>

          <div className="register-showcase__main">
            <span className="register-showcase__eyebrow">
              İşletmenizi Geleceğe Taşıyın
            </span>

            <h1>
              Restoranınızın Dijital Dönüşümünü
              <span> Bugün Başlatın</span>
            </h1>

            <p className="register-showcase__description">
              QR menü, güvenli ödeme, mutfak ve garson
              panelleriyle işletmenizin bütün operasyonunu tek
              sistemde yönetin.
            </p>

            <div className="register-benefits">
              {registerBenefits.map((benefit) => (
                <div
                  className="register-benefit"
                  key={benefit.title}
                >
                  <span className="register-benefit__icon">
                    <span className="material-symbols-outlined">
                      {benefit.icon}
                    </span>
                  </span>

                  <div>
                    <strong>{benefit.title}</strong>
                    <p>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="register-showcase__footer">
            <span className="material-symbols-outlined">
              lock
            </span>

            <span>
              Bilgileriniz güvenli şekilde korunur.
            </span>
          </div>
        </div>
      </section>

      {/* SAĞ KAYIT FORMU */}

      <section className="register-form-section">
        <Link
          to="/"
          className="register-home-link"
        >
          <span className="material-symbols-outlined">
            arrow_back
          </span>

          Ana Sayfaya Dön
        </Link>

        <div className="register-form-wrapper">
          <div className="register-mobile-brand">
            <Link
              to="/"
              className="register-brand"
            >
              <img
                src="/sukranapp.png"
                alt="Şükran App"
              />

              <span>Şükran</span>
            </Link>
          </div>

          <div className="register-form-card">
            <header className="register-form-card__header">
              <span>İşletme Hesabı Oluşturun</span>

              <h2>Şükran App’e Kayıt Olun</h2>

              <p>
                İşletme bilgilerinizi girerek hesabınızı
                oluşturun.
              </p>

              <div className="register-form-card__login">
                Zaten hesabınız var mı?

                <Link to="/giris-yap">
                  Giriş Yap
                </Link>
              </div>
            </header>

            {formError && (
              <div
                className="register-alert register-alert--error"
                role="alert"
              >
                <span className="material-symbols-outlined">
                  error
                </span>

                <div>
                  <strong>Kayıt işlemi tamamlanamadı</strong>
                  <p>{formError}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                  }}
                  aria-label="Hata mesajını kapat"
                >
                  <span className="material-symbols-outlined">
                    close
                  </span>
                </button>
              </div>
            )}

            {isRegistrationSuccessful && (
              <div
                className="register-alert register-alert--success"
                role="status"
              >
                <span className="material-symbols-outlined">
                  check_circle
                </span>

                <div>
                  <strong>
                    Hesabınız başarıyla oluşturuldu
                  </strong>

                  <p>
                    İşletmeniz oluşturuldu ve 14 günlük ücretsiz denemeniz
                    başladı. Yönetim paneline yönlendiriliyorsunuz…
                  </p>

                  <Link to="/giris-yap">
                    Giriş Yap
                  </Link>
                </div>
              </div>
            )}

            <form
              className="register-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="register-field register-field--full">
                <label htmlFor="register-business-name">
                  İşletme Adı
                  <span>*</span>
                </label>

                <div className="register-input">
                  <span className="material-symbols-outlined">
                    storefront
                  </span>

                  <input
                    id="register-business-name"
                    name="businessName"
                    type="text"
                    placeholder="Restoran veya işletme adınız"
                    required
                    autoComplete="organization"
                  />
                </div>
              </div>

              <div className="register-field register-field--full">
                <label htmlFor="register-full-name">
                  Ad Soyad
                  <span>*</span>
                </label>

                <div className="register-input">
                  <span className="material-symbols-outlined">
                    person
                  </span>

                  <input
                    id="register-full-name"
                    name="fullName"
                    type="text"
                    placeholder="Adınız ve soyadınız"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="register-form__row">
                <div className="register-field">
                  <label htmlFor="register-phone">
                    Telefon
                    <span>*</span>
                  </label>

                  <div className="register-input">
                    <span className="material-symbols-outlined">
                      call
                    </span>

                    <input
                      id="register-phone"
                      name="phone"
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      required
                      autoComplete="tel"
                      pattern="^0?5[0-9]{9}$"
                      title="Telefon numaranızı boşluk kullanmadan 05XXXXXXXXX biçiminde girin."
                    />
                  </div>
                </div>

                <div className="register-field">
                  <label htmlFor="register-email">
                    E-posta
                    <span>*</span>
                  </label>

                  <div className="register-input">
                    <span className="material-symbols-outlined">
                      mail
                    </span>

                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="ornek@isletme.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>

              <div className="register-field register-field--full">
                <label htmlFor="register-address">
                  İşletme Adresi
                  <span>*</span>
                </label>

                <div className="register-input">
                  <span className="material-symbols-outlined">
                    location_on
                  </span>

                  <input
                    id="register-address"
                    name="address"
                    type="text"
                    placeholder="Mahalle, cadde, no / ilçe, il"
                    required
                    autoComplete="street-address"
                  />
                </div>

                <div className="register-location">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="register-location__button"
                  >
                    <span className="material-symbols-outlined">my_location</span>
                    {isLocating ? 'Konum alınıyor...' : 'Konumumu kullan'}
                  </button>

                  <span className="register-location__hint">
                    {coordinates.latitude && coordinates.longitude
                      ? `Konum alındı: ${Number(coordinates.latitude).toFixed(4)}, ${Number(coordinates.longitude).toFixed(4)}`
                      : 'İsteğe bağlı — "Yakındaki restoranlar" listesinde görünmek için'}
                  </span>
                </div>

                <input type="hidden" name="latitude" value={coordinates.latitude} />
                <input type="hidden" name="longitude" value={coordinates.longitude} />
              </div>

              <div className="register-form__row">
                <div className="register-field">
  <label htmlFor="password">
    Şifre <span>*</span>
  </label>

  <div className="register-input register-input--password">
    <input
      id="password"
      name="password"
      type={isPasswordVisible ? 'text' : 'password'}
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      placeholder="En az 8 karakter"
      autoComplete="new-password"
      required
    />

    <button
      type="button"
      className="register-password-toggle"
      onClick={() => setIsPasswordVisible((current) => !current)}
      aria-label={isPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
      aria-pressed={isPasswordVisible}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {isPasswordVisible ? 'visibility_off' : 'visibility'}
      </span>
    </button>
  </div>

  <div
    className={`register-password-strength register-password-strength--${passwordStrength.variant}`}
  >
    <div>
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={level <= passwordStrength.score ? 'is-active' : ''}
        />
      ))}
    </div>

    <small>{passwordStrength.label}</small>
  </div>
</div>

                <div className="register-field">
  <label htmlFor="passwordConfirmation">
    Şifre Tekrarı <span>*</span>
  </label>

  <div
    className={`register-input register-input--password ${
      passwordConfirmation && !passwordsMatch
        ? 'register-input--error'
        : ''
    }`}
  >
    <input
      id="passwordConfirmation"
      name="passwordConfirmation"
      type={isPasswordConfirmationVisible ? 'text' : 'password'}
      value={passwordConfirmation}
      onChange={(event) =>
        setPasswordConfirmation(event.target.value)
      }
      placeholder="Şifrenizi tekrar girin"
      autoComplete="new-password"
      required
    />

    <button
      type="button"
      className="register-password-toggle"
      onClick={() =>
        setIsPasswordConfirmationVisible((current) => !current)
      }
      aria-label={
        isPasswordConfirmationVisible
          ? 'Şifre tekrarını gizle'
          : 'Şifre tekrarını göster'
      }
      aria-pressed={isPasswordConfirmationVisible}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {isPasswordConfirmationVisible
          ? 'visibility_off'
          : 'visibility'}
      </span>
    </button>
  </div>

  {passwordConfirmation && !passwordsMatch && (
    <small className="register-field__error">
      Girdiğiniz şifreler birbiriyle eşleşmiyor.
    </small>
  )}
</div>
              </div>

              <div className="register-consents">
                <label>
                  <input
                    type="checkbox"
                    checked={isKvkkAccepted}
                    onChange={(event) => {
                      setIsKvkkAccepted(
                        event.target.checked,
                      );
                      setFormError('');
                    }}
                    required
                  />

                  <span>
                    <Link
                      to="/kvkk"
                      target="_blank"
                    >
                      KVKK Aydınlatma Metni
                    </Link>
                    ’ni okudum ve kişisel verilerimin
                    belirtilen amaçlarla işlenmesini kabul
                    ediyorum.
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={isAgreementAccepted}
                    onChange={(event) => {
                      setIsAgreementAccepted(
                        event.target.checked,
                      );
                      setFormError('');
                    }}
                    required
                  />

                  <span>
                    <Link
                      to="/kullanici-sozlesmesi"
                      target="_blank"
                    >
                      Kullanıcı Sözleşmesi
                    </Link>
                    ’ni ve Kullanım Koşulları’nı okudum,
                    kabul ediyorum.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="register-submit"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined register-submit__spinner">
                      progress_activity
                    </span>

                    Hesabınız Oluşturuluyor
                  </>
                ) : (
                  <>
                    Hesabımı Oluştur

                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="register-secure-note">
              <span className="material-symbols-outlined">
                encrypted
              </span>

              <span>
                Bağlantınız güvenli şekilde şifrelenmektedir.
              </span>
            </div>

          </div>

          <p className="register-mobile-copyright">
            © 2026 Şükran App. Tüm hakları saklıdır.
          </p>
        </div>
      </section>

      {pendingRegistration && (
        <PhoneVerificationDialog
          phone={pendingRegistration.phone}
          onVerified={(ticket) => completeRegistration(pendingRegistration, ticket)}
          onCancel={() => setPendingRegistration(null)}
        />
      )}
    </main>
  );
}

export default Register;