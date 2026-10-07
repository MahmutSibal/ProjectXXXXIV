import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import './PublicLayout.css';

const navigationItems = [
  {
    label: 'Ana Sayfa',
    path: '/',
  },
  {
    label: 'Hizmetler',
    path: '/hizmetler',
  },
  {
    label: 'Hakkımızda',
    path: '/hakkimizda',
  },
  {
    label: 'İletişim',
    path: '/iletisim',
  },
];

function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((currentValue) => !currentValue);
  };

  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="public-header__container">
          <Link
            to="/"
            className="public-brand"
            onClick={closeMobileMenu}
            aria-label="Şükran App ana sayfa"
          >
            <img
              src="/sukranapp.png"
              alt="Şükran App logosu"
              className="public-brand__logo"
            />

            <span className="public-brand__name">Şükran</span>
          </Link>

          <nav
            className="public-navigation"
            aria-label="Ana navigasyon"
          >
            {navigationItems.map((navigationItem) => (
              <NavLink
                key={navigationItem.path}
                to={navigationItem.path}
                className={({ isActive }) =>
                  `public-navigation__link ${
                    isActive ? 'public-navigation__link--active' : ''
                  }`
                }
              >
                {navigationItem.label}
              </NavLink>
            ))}
          </nav>

          <div className="public-header__actions">
            <Link
              to="/giris-yap"
              className="public-header__login"
            >
              Giriş Yap
            </Link>

            <Link
              to="/kayit-ol"
              className="public-button public-button--primary public-button--small"
            >
              Kayıt Ol
            </Link>
          </div>

          <button
            type="button"
            className={`public-mobile-menu-button ${
              isMobileMenuOpen
                ? 'public-mobile-menu-button--active'
                : ''
            }`}
            onClick={toggleMobileMenu}
            aria-label={
              isMobileMenuOpen
                ? 'Mobil menüyü kapat'
                : 'Mobil menüyü aç'
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls="public-mobile-navigation"
          >
            <span className="public-mobile-menu-button__line" />
            <span className="public-mobile-menu-button__line" />
            <span className="public-mobile-menu-button__line" />
          </button>
        </div>

        <div
          id="public-mobile-navigation"
          className={`public-mobile-navigation ${
            isMobileMenuOpen
              ? 'public-mobile-navigation--open'
              : ''
          }`}
        >
          <nav
            className="public-mobile-navigation__links"
            aria-label="Mobil navigasyon"
          >
            {navigationItems.map((navigationItem) => (
              <NavLink
                key={navigationItem.path}
                to={navigationItem.path}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `public-mobile-navigation__link ${
                    isActive
                      ? 'public-mobile-navigation__link--active'
                      : ''
                  }`
                }
              >
                {navigationItem.label}
              </NavLink>
            ))}
          </nav>

          <div className="public-mobile-navigation__actions">
            <Link
              to="/giris-yap"
              className="public-button public-button--outline"
              onClick={closeMobileMenu}
            >
              Giriş Yap
            </Link>

            <Link
              to="/kayit-ol"
              className="public-button public-button--primary"
              onClick={closeMobileMenu}
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer__container">
          <div className="public-footer__content">
            <div className="public-footer__brand-column">
              <Link
                to="/"
                className="public-footer__brand"
                aria-label="Şükran App ana sayfa"
              >
                <img
                  src="/sukranapp.png"
                  alt="Şükran App logosu"
                  className="public-footer__logo"
                />

                <span>Şükran</span>
              </Link>

              <p className="public-footer__description">
                Restoran operasyonlarını daha hızlı, güvenli ve
                yönetilebilir hale getiren yeni nesil dijital çözüm
                ortağınız.
              </p>
            </div>

            <div className="public-footer__column">
              <h2 className="public-footer__title">
                Navigasyon
              </h2>

              <Link to="/">Ana Sayfa</Link>
              <Link to="/hizmetler">Hizmetler</Link>
              <Link to="/hakkimizda">Hakkımızda</Link>
              <Link to="/iletisim">İletişim</Link>
            </div>

            <div className="public-footer__column">
              <h2 className="public-footer__title">
                Hukuki
              </h2>

              <Link to="/kvkk">KVKK Aydınlatma Metni</Link>
              <Link to="/gizlilik-politikasi">
                Gizlilik Politikası
              </Link>
              <Link to="/kullanim-kosullari">
                Kullanım Koşulları
              </Link>
              <Link to="/mesafeli-satis-sozlesmesi">
                Mesafeli Satış Sözleşmesi
              </Link>
            </div>

            <div className="public-footer__column">
              <h2 className="public-footer__title">
                İletişim
              </h2>

              <a href="mailto:info@sukranapp.com">
                info@sukranapp.com
              </a>

              <a href="tel:+900000000000">
                +90 (000) 000 00 00
              </a>

              <span className="public-footer__address">
                İzmir, Türkiye
              </span>

              <div className="public-footer__socials">
                <a
                  href="#instagram"
                  aria-label="Instagram"
                  className="public-footer__social-link"
                >
                  <span className="material-symbols-outlined">
                    photo_camera
                  </span>
                </a>

                <a
                  href="#linkedin"
                  aria-label="LinkedIn"
                  className="public-footer__social-link"
                >
                  <span className="material-symbols-outlined">
                    business_center
                  </span>
                </a>

                <a
                  href="mailto:info@sukranapp.com"
                  aria-label="E-posta"
                  className="public-footer__social-link"
                >
                  <span className="material-symbols-outlined">
                    mail
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="public-footer__bottom">
            <span>
              © 2026 Şükran App. Tüm hakları saklıdır.
            </span>

            <span>
              Restoran teknolojileri, sadeleştirildi.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;