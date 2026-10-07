import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import './About.css';

const storyMetrics = [
  {
    value: '200+',
    label: 'Aktif İşletme',
  },
  {
    value: '1M+',
    label: 'Mutlu Misafir',
  },
  {
    value: '0.8 sn',
    label: 'Sipariş Hızı',
  },
  {
    value: '%40',
    label: 'Verimlilik Artışı',
  },
];

const operationalProblems = [
  {
    id: 'delay',
    icon: 'timer_off',
    title: 'Sipariş Gecikmeleri',
    description:
      'Garsonun siparişi alıp mutfağa iletmesi arasındaki kritik dakikalar, müşteri memnuniyetini doğrudan etkiler.',
    solution:
      'Siparişler anında mutfak ekranına düşer ve zaman kaybı en aza iner.',
    size: 'large',
    dark: true,
  },
  {
    id: 'communication',
    icon: 'chat_error',
    title: 'Hatalı İletişim',
    description:
      'Sözlü siparişlerdeki yanlış anlamalar ve unutulan notlar mutfakta karışıklığa neden olur.',
    solution:
      'Dijital kayıt sistemiyle her talep net ve eksiksiz şekilde iletilir.',
    size: 'medium',
  },
  {
    id: 'menu',
    icon: 'edit_note',
    title: 'Menü Güncelleme Zorluğu',
    description:
      'Fiyat değişiklikleri veya tükenen ürünler için basılı menüleri yenilemek maliyetli ve yavaştır.',
    solution:
      'Yönetim panelinden bütün fiyat ve stok bilgileri saniyeler içerisinde güncellenir.',
    size: 'wide',
  },
  {
    id: 'payment',
    icon: 'payments',
    title: 'Ödeme Yavaşlığı',
    description:
      'Hesap isteme ve ödeme bekleme süreci müşterinin restoran deneyimini olumsuz etkiler.',
    solution:
      'iyzico entegrasyonu ile masada hızlı ve güvenli ödeme gerçekleştirilir.',
    size: 'small',
    dark: true,
  },
  {
    id: 'data',
    icon: 'analytics',
    title: 'Veri Eksikliği',
    description:
      'Hangi ürünün ne kadar kazandırdığını bilmeden işletme stratejisi oluşturmak zordur.',
    solution:
      'Gerçek zamanlı raporlarla işletmenin performansı ve kârlılığı takip edilir.',
    size: 'medium',
  },
  {
    id: 'operation',
    icon: 'hub',
    title: 'Operasyonel Yük',
    description:
      'Mutfak, garson ve yönetim arasındaki iletişim kopukluğu günlük operasyonun verimini düşürür.',
    solution:
      'Mutfak, garson ve admin panelleri tek ve kesintisiz bir operasyon akışında birleşir.',
    size: 'full',
    dark: true,
  },
];

const corporateValues = [
  {
    number: '01',
    title: 'Sadelik',
    description:
      'Karmaşık sistemler yerine herkesin kısa sürede anlayabileceği açık ve akıcı arayüzler tasarlıyoruz.',
  },
  {
    number: '02',
    title: 'Güven',
    description:
      'Veri güvenliği ve ödeme süreçlerinde güncel güvenlik standartlarını benimsiyoruz.',
  },
  {
    number: '03',
    title: 'Sürekli Gelişim',
    description:
      'Kullanıcı geri bildirimlerini temel alarak sistemimizi düzenli şekilde geliştiriyoruz.',
  },
  {
    number: '04',
    title: 'İşletme Odaklılık',
    description:
      'Bizim için başarı, çözüm sunduğumuz işletmenin verimlilik ve performans artışıdır.',
  },
];

const businessTypes = [
  {
    icon: 'local_cafe',
    title: 'Café ve Bistro',
    description:
      'Hızlı masa sirkülasyonunu kolaylaştıran pratik ve modern çözümler.',
  },
  {
    icon: 'dinner_dining',
    title: 'Fine Dining',
    description:
      'Marka prestijini teknolojiyle destekleyen zarif müşteri deneyimi.',
  },
  {
    icon: 'hotel',
    title: 'Oteller',
    description:
      'Oda servisini ve farklı restoran alanlarını tek merkezden yönetme imkânı.',
  },
  {
    icon: 'account_tree',
    title: 'Zincir Markalar',
    description:
      'Şubeler arasında merkezi kontrol, standart operasyon ve ayrıntılı raporlama.',
  },
];

const workingSteps = [
  {
    number: '1',
    title: 'Analiz',
    description:
      'İşletmenizin mevcut işleyişini, ihtiyaçlarını ve gelişim alanlarını belirliyoruz.',
  },
  {
    number: '2',
    title: 'Tasarım',
    description:
      'Marka kimliğinize ve operasyon yapınıza uygun dijital deneyimi oluşturuyoruz.',
  },
  {
    number: '3',
    title: 'Geliştirme',
    description:
      'İhtiyaç duyduğunuz sistem yapısını güncel teknolojilerle hazırlıyoruz.',
  },
  {
    number: '4',
    title: 'Test ve Kurulum',
    description:
      'Sistemi test ediyor, gerekli tanımlamaları yapıyor ve kullanıma hazırlıyoruz.',
  },
  {
    number: '5',
    title: 'İyileştirme',
    description:
      'Performansı takip ederek ihtiyaçlara göre düzenli geliştirmeler gerçekleştiriyoruz.',
  },
];

function About() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(
      '.about-page [data-reveal]',
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

  return (
    <div className="about-page">
      {/* HERO */}

      <section className="about-hero">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-ovjuDhrCCbWk6kQsfYrQvkMiXsjJUIqIt7WoictEEH0iEAcSWW9-vdKs4fdn-6CHr2ph5a14hOc3Gv2KVv9mymYDdpgQGPae6CIiSE3GNoW-XoTRkIAvvZNWrd8X0irA4-f9Zc08_iYLhFVqfPsSpVrSHPsn78IyTiR7dahDyGBDeBoR-yq9qBsswMyO1-wTrfkMrOmtep5FzMhvGpNKtBILjLuOHmOJvtqvy-DbSk73R__cBwWYluot_A3g7TF4iKTG6eI_EaE"
          alt=""
          className="about-hero__background"
        />

        <div className="about-hero__overlay" />

        <div className="about-hero__container">
          <div
            className="about-hero__content"
            data-reveal
          >
            <div className="about-eyebrow">
              <span />
              <strong>Şükran App Hakkında</strong>
            </div>

            <h1>
              Restoran Deneyimini
              <span> Teknolojiyle </span>
              Yeniden Tasarlıyoruz
            </h1>

            <p>
              Şükran App yalnızca dijital bir çözüm değil;
              restoranınızın günlük işleyişini sadeleştiren,
              ekibinizle müşterileriniz arasındaki bağı
              güçlendiren profesyonel bir ekosistemdir.
            </p>

            <div className="about-hero__actions">
              <Link
                to="/hizmetler"
                className="about-button about-button--brass"
              >
                Hizmetleri İncele

                <span className="material-symbols-outlined">
                  arrow_forward
                </span>
              </Link>

              <Link
                to="/iletisim"
                className="about-button about-button--light-outline"
              >
                Sunum Talep Et
              </Link>
            </div>
          </div>

          <div
            className="about-hero__visual"
            data-reveal
          >
            <div className="about-hero__visual-border" />

            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-ovjuDhrCCbWk6kQsfYrQvkMiXsjJUIqIt7WoictEEH0iEAcSWW9-vdKs4fdn-6CHr2ph5a14hOc3Gv2KVv9mymYDdpgQGPae6CIiSE3GNoW-XoTRkIAvvZNWrd8X0irA4-f9Zc08_iYLhFVqfPsSpVrSHPsn78IyTiR7dahDyGBDeBoR-yq9qBsswMyO1-wTrfkMrOmtep5FzMhvGpNKtBILjLuOHmOJvtqvy-DbSk73R__cBwWYluot_A3g7TF4iKTG6eI_EaE"
              alt="Modern restoran iç mekânı"
            />

            <div className="about-hero__visual-label">
              <span className="material-symbols-outlined">
                verified
              </span>

              <div>
                <small>Yeni Nesil Yaklaşım</small>
                <strong>Teknoloji ve misafirperverlik</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BİZ KİMİZ */}

      <section className="about-who">
        <div
          className="about-who__container"
          data-reveal
        >
          <div className="about-who__heading">
            <span>Kurumsal Yapımız</span>

            <h2>Biz Kimiz?</h2>

            <div />
          </div>

          <div className="about-who__content">
            <p className="about-who__lead">
              Şükran App, geleneksel hizmet anlayışını modern
              teknolojinin hızı ve hassasiyetiyle birleştiren
              yeni nesil bir restoran işletim sistemidir.
            </p>

            <div className="about-who__columns">
              <p>
                Bir QR menüden çok daha fazlasını sunuyoruz.
                Amacımız işletmelerin dijital dönüşümünü bir yük
                olmaktan çıkarıp verimliliği artıran sürdürülebilir
                bir sisteme dönüştürmektir.
              </p>

              <p>
                Entegre yapımızla garson, mutfak ve yönetim
                arasındaki iletişimi güçlendirirken müşterilere
                hızlı, güvenli ve modern bir sipariş deneyimi
                sunuyoruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HİKÂYEMİZ */}

      <section className="about-story">
        <div
          className="about-story__container"
          data-reveal
        >
          <span className="about-section-eyebrow">
            Hikâyemiz
          </span>

          <h2>Fikirden Ekosisteme</h2>

          <p>
            Her şey restoranlardaki sipariş karmaşasını ve
            iletişim kopukluklarını gözlemlememizle başladı.
            Basit bir dijital menü fikriyle yola çıktık; ancak
            gerçek çözümün birbirinden kopuk araçlar değil,
            birleşik bir sistem olduğunu gördük. Bugün Şükran
            App; QR siparişten iyzico entegreli ödemeye, mutfak
            ekranlarından gelişmiş yönetim panellerine kadar
            büyüyen bir restoran ekosistemine dönüştü.
          </p>

          <div className="about-story__metrics">
            {storyMetrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VİZYON VE MİSYON */}

      <section className="about-vision">
        <div className="about-container about-vision__grid">
          <article data-reveal>
            <span className="material-symbols-outlined">
              visibility
            </span>

            <small>Gelecek Hedefimiz</small>

            <h2>Vizyonumuz</h2>

            <p>
              Restoran teknolojisinde ölçeği ne olursa olsun
              her işletme için erişilebilir, güvenilir ve
              sürdürülebilir bir dünya standardı oluşturmak.
            </p>
          </article>

          <article data-reveal>
            <span className="material-symbols-outlined">
              rocket_launch
            </span>

            <small>Günlük Amacımız</small>

            <h2>Misyonumuz</h2>

            <p>
              Operasyonel süreçleri teknolojiyle
              sadeleştirirken işletme sahiplerinin kontrolünü
              artırmak ve müşteri deneyimini daha güçlü hale
              getirmek.
            </p>
          </article>
        </div>
      </section>

      {/* OPERASYONEL PROBLEMLER */}

      <section className="about-problems">
        <div className="about-container">
          <div
            className="about-section-heading"
            data-reveal
          >
            <span>Operasyonel Problemler</span>

            <h2>
              Restoran Operasyonundaki Gerçek Sorunlara Çözüm
              Üretiyoruz
            </h2>

            <p>
              Geleneksel yöntemlerin yarattığı darboğazları
              teknolojiyle aşarak işletmenin her noktasında
              verimliliği ve müşteri memnuniyetini artırıyoruz.
            </p>
          </div>

          <div className="about-problems__grid">
            {operationalProblems.map((problem) => (
              <article
                className={`about-problem-card about-problem-card--${problem.size} ${
                  problem.dark
                    ? 'about-problem-card--dark'
                    : ''
                }`}
                key={problem.id}
                data-reveal
              >
                <div>
                  <span className="material-symbols-outlined">
                    {problem.icon}
                  </span>

                  <h3>{problem.title}</h3>

                  <p>{problem.description}</p>
                </div>

                <div className="about-problem-card__solution">
                  <span>Çözüm</span>
                  <p>{problem.solution}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* KURUMSAL DEĞERLER */}

      <section className="about-values">
        <div className="about-container">
          <div
            className="about-section-heading"
            data-reveal
          >
            <span>İlkelerimiz</span>
            <h2>Kurumsal Değerlerimiz</h2>
          </div>

          <div className="about-values__list">
            {corporateValues.map((value) => (
              <article
                key={value.number}
                data-reveal
              >
                <span>{value.number}</span>

                <h3>{value.title}</h3>

                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* KİMLER İÇİN */}

      <section className="about-businesses">
        <div className="about-container">
          <div
            className="about-businesses__heading"
            data-reveal
          >
            <span className="about-section-eyebrow">
              Esnek ve Ölçeklenebilir
            </span>

            <h2>
              Her Ölçekteki
              <span> Gastronomi </span>
              İşletmesi İçin
            </h2>
          </div>

          <div className="about-businesses__grid">
            {businessTypes.map((businessType) => (
              <article
                key={businessType.title}
                data-reveal
              >
                <span className="material-symbols-outlined">
                  {businessType.icon}
                </span>

                <h3>{businessType.title}</h3>

                <p>{businessType.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NASIL ÇALIŞIYORUZ */}

      <section className="about-working">
        <div className="about-container">
          <div
            className="about-working__heading"
            data-reveal
          >
            <div>
              <span>Ürün Yaklaşımımız</span>
              <h2>Nasıl Çalışıyoruz?</h2>
            </div>

            <p>
              İhtiyaçlarınızı analiz ediyor, işletmenize uygun
              teknolojik yol haritasını birlikte oluşturuyoruz.
            </p>
          </div>

          <div className="about-working__steps">
            <div className="about-working__line" />

            {workingSteps.map((workingStep) => (
              <article
                key={workingStep.number}
                data-reveal
              >
                <span>{workingStep.number}</span>

                <h3>{workingStep.title}</h3>

                <p>{workingStep.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MANİFESTO */}

      <section className="about-manifesto">
        <div className="about-manifesto__decoration" />

        <div
          className="about-manifesto__content"
          data-reveal
        >
          <span className="material-symbols-outlined">
            format_quote
          </span>

          <blockquote>
            Teknolojiyi restoranların işleyişini
            karmaşıklaştırmak için değil,
            <strong> sadeleştirmek </strong>
            için kullanıyoruz.
          </blockquote>

          <div>
            <span />
            <small>Şükran App Manifestosu</small>
            <span />
          </div>
        </div>
      </section>

      {/* SON CTA */}

      <section className="about-final-cta">
        <div
          className="about-final-cta__card"
          data-reveal
        >
          <div>
            <span className="about-section-eyebrow">
              Birlikte Büyüyelim
            </span>

            <h2>Geleceği Beraber İnşa Edelim</h2>

            <p>
              İşletmenizi bir sonraki seviyeye taşımak için
              Şükran App deneyimiyle tanışın.
            </p>
          </div>

          <div className="about-final-cta__actions">
            <Link
              to="/hizmetler"
              className="about-button about-button--brass"
            >
              Hizmetleri İncele
            </Link>

            <Link
              to="/iletisim"
              className="about-button about-button--light-outline"
            >
              Sunum Talep Et
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;