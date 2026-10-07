import './StatusScreens.css';

const VARIANTS = {
  maintenance: {
    icon: 'engineering',
    eyebrow: 'Planlı bakım',
    title: 'Bakımdayız',
    message: 'Sistemimizi sizin için iyileştiriyoruz. Kısa süre içinde tekrar hizmetinizde olacağız.',
  },
  down: {
    icon: 'cloud_off',
    eyebrow: 'Bağlantı sorunu',
    title: 'Sunucu şu anda aktif değil',
    message:
      'Sunucuya ulaşamıyoruz. Bu geçici olabilir; bağlantı geri geldiğinde sayfa kendiliğinden yenilenecek.',
  },
  offline: {
    icon: 'wifi_off',
    eyebrow: 'Çevrimdışı',
    title: 'İnternet bağlantınız yok',
    message: 'Cihazınızın internet bağlantısını kontrol edin. Bağlantı geri geldiğinde devam edebilirsiniz.',
  },
  error: {
    icon: 'error',
    eyebrow: 'Beklenmeyen hata',
    title: 'Bir şeyler ters gitti',
    message: 'Sayfa beklenmedik bir hatayla karşılaştı. Sayfayı yenilemek genellikle sorunu çözer.',
  },
};

export default function StatusScreen({
  variant = 'error',
  message,
  onRetry,
  isRetrying = false,
  retryLabel = 'Tekrar Dene',
  autoRetry = false,
  showHome = false,
}) {
  const config = VARIANTS[variant] ?? VARIANTS.error;

  return (
    <main className={`status-screen status-screen--${variant}`} role="alert" aria-live="polite">
      <div className="status-screen__card">
        <img className="status-screen__logo" src="/sukranapp.png" alt="Şükran App" />

        <div className="status-screen__icon" aria-hidden="true">
          <span className="material-symbols-outlined">{config.icon}</span>
        </div>

        <span className="status-screen__eyebrow">{config.eyebrow}</span>
        <h1 className="status-screen__title">{config.title}</h1>
        <p className="status-screen__message">{message || config.message}</p>

        <div className="status-screen__actions">
          {onRetry && (
            <button
              type="button"
              className="status-screen__button"
              onClick={onRetry}
              disabled={isRetrying}
            >
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              {isRetrying ? 'Kontrol ediliyor...' : retryLabel}
            </button>
          )}

          {showHome && (
            <a className="status-screen__button status-screen__button--ghost" href="/">
              Ana Sayfa
            </a>
          )}
        </div>

        {autoRetry && (
          <p className="status-screen__auto">
            <span className="status-screen__dot" aria-hidden="true" />
            Otomatik olarak yeniden denenecek
          </p>
        )}
      </div>
    </main>
  );
}
