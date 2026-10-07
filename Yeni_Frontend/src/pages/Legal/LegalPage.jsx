import { Link, Navigate, useParams } from 'react-router-dom';

import {
  companyInformation,
  getLegalDocument,
} from './legalDocuments';

import './LegalPage.css';

const legalNavigation = [
  {
    key: 'kvkk',
    label: 'KVKK Aydınlatma',
    path: '/kvkk',
  },
  {
    key: 'consent',
    label: 'KVKK Açık Rıza',
    path: '/kvkk-acik-riza-metni',
  },
  {
    key: 'userAgreement',
    label: 'Kullanıcı Sözleşmesi',
    path: '/kullanici-sozlesmesi',
  },
  {
    key: 'privacy',
    label: 'Gizlilik Politikası',
    path: '/gizlilik-politikasi',
  },
  {
    key: 'terms',
    label: 'Kullanım Koşulları',
    path: '/kullanim-kosullari',
  },
  {
    key: 'distanceSales',
    label: 'Mesafeli Satış',
    path: '/mesafeli-satis-sozlesmesi',
  },
];

export default function LegalPage({
  documentKey: documentKeyProp,
}) {
  const params = useParams();

  const documentKey =
    documentKeyProp || params.documentKey;

  const document =
    getLegalDocument(documentKey);

  if (!document) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return (
    <main className="legal-page">
      <header className="legal-header">
        <div className="legal-header__inner">
          <Link
            className="legal-brand"
            to="/"
          >
            <img
              src="/sukranapp.png"
              alt="Şükran App"
            />

            <span>Şükran App</span>
          </Link>

          <Link
            className="legal-home-link"
            to="/"
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              arrow_back
            </span>

            <span>Ana sayfaya dön</span>
          </Link>
        </div>
      </header>

      <section className="legal-hero">
        <div className="legal-hero__inner">
          <span className="legal-hero__eyebrow">
            Yasal Bilgilendirme
          </span>

          <h1>{document.title}</h1>

          <p>{document.description}</p>

          <span className="legal-update-date">
            {document.updatedAt}
          </span>
        </div>
      </section>

      <div className="legal-layout">
        <aside className="legal-sidebar">
          <div className="legal-sidebar__card">
            <h2>Yasal Metinler</h2>

            <nav aria-label="Yasal metinler">
              {legalNavigation.map((item) => (
                <Link
                  key={item.key}
                  className={
                    documentKey === item.key
                      ? 'legal-sidebar__link legal-sidebar__link--active'
                      : 'legal-sidebar__link'
                  }
                  to={item.path}
                >
                  <span>{item.label}</span>

                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="legal-sidebar__contact">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              support_agent
            </span>

            <div>
              <strong>Bir sorunuz mu var?</strong>

              <a href={`mailto:${companyInformation.email}`}>
                {companyInformation.email}
              </a>
            </div>
          </div>
        </aside>

        <article className="legal-document">
          <div className="legal-document__notice">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              info
            </span>

            <p>
              Bu metni dikkatlice okuyunuz. Platformu
              kullanmaya veya ilgili onayı vermeye devam
              etmeniz halinde burada açıklanan şartlar
              uygulanabilir.
            </p>
          </div>

          {document.sections.map((section) => (
            <section
              className="legal-section"
              key={section.title}
            >
              <h2>{section.title}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>
                  {paragraph}
                </p>
              ))}

              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <footer className="legal-document__footer">
            <div>
              <strong>
                {companyInformation.legalName}
              </strong>

              <span>
                {companyInformation.address}
              </span>
            </div>

            <Link to="/">
              Ana sayfaya dön
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}