import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantPaymentApi } from '../../api/restaurants.js';
import { ApiError } from '../../api/client.js';

const SANDBOX_URL = 'https://sandbox-api.iyzipay.com';
const LIVE_URL = 'https://api.iyzipay.com';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none disabled:opacity-60';

export default function AdminPaymentSettings() {
  const toast = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState(SANDBOX_URL);
  // Sırlar yalnızca bu oturumda yazılır; sunucudan asla geri doldurulmaz.
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const applySettings = (data) => {
    setSettings(data);
    setEnabled(Boolean(data?.onlinePaymentEnabled));
    setBaseUrl(data?.baseUrl === LIVE_URL ? LIVE_URL : SANDBOX_URL);
  };

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }
    restaurantPaymentApi
      .getPaymentSettings(user.restaurantId)
      .then(applySettings)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Ödeme ayarları yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [user?.restaurantId]);

  const isFake = Boolean(settings?.globalProviderIsFake);
  const hasCredentials = Boolean(settings?.hasCredentials);

  const handleSave = async (event) => {
    event.preventDefault();

    const trimmedKey = apiKey.trim();
    const trimmedSecret = secretKey.trim();

    if (enabled && !isFake && !hasCredentials && (!trimmedKey || !trimmedSecret)) {
      toast.warning('Online ödemeyi açmak için API anahtarı ve gizli anahtarı girin.');
      return;
    }
    if (enabled && !isFake && Boolean(trimmedKey) !== Boolean(trimmedSecret) && !hasCredentials) {
      toast.warning('API anahtarı ve gizli anahtar birlikte girilmelidir.');
      return;
    }

    setIsSaving(true);
    try {
      await restaurantPaymentApi.savePaymentSettings(user.restaurantId, {
        onlinePaymentEnabled: enabled,
        apiKey: enabled && !isFake ? trimmedKey : '',
        secretKey: enabled && !isFake ? trimmedSecret : '',
        baseUrl,
      });
      setApiKey('');
      setSecretKey('');
      const fresh = await restaurantPaymentApi.getPaymentSettings(user.restaurantId).catch(() => null);
      if (fresh) applySettings(fresh);
      setError('');
      toast.success('Ödeme ayarları kaydedildi.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ödeme ayarları kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-headline-lg text-headline-lg text-on-background">Ödeme Ayarları</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Misafirlerinizin QR menüden kartla ödeme yapıp yapamayacağını buradan belirleyin.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {settings?.cardPaymentsAllowedByPlatform === false && (
        <div className="flex items-start gap-2 bg-error-container text-on-error-container rounded-lg p-3">
          <span className="material-symbols-outlined">block</span>
          <p className="text-body-sm">
            Platform online kart ödemesini şu anda tüm işletmeler için kapattı. Aşağıdaki ayarı açsanız bile
            müşterileriniz kartla ödeyemez; "Hesabı iste" ile garsonunuz tahsil eder. Açıldığında bilgilendirileceksiniz.
          </p>
        </div>
      )}

      {isFake && (
        <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg p-3">
          <span className="material-symbols-outlined">science</span>
          <p className="text-body-sm">
            Sistem şu anda simülasyon modunda çalışıyor. Gerçek tahsilat yapılmaz; bu nedenle API anahtarı
            girmeniz gerekmez.
          </p>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-3">
        <h3 className="font-headline-sm text-headline-sm text-on-background">Nasıl çalışır?</h3>
        <ul className="flex flex-col gap-2 text-body-sm text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary-container">toggle_off</span>
            <span>
              Misafirlerin online kart ödemesi varsayılan olarak <strong>kapalıdır</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary-container">account_balance_wallet</span>
            <span>
              Açtığınızda misafirlerin kart ödemeleri doğrudan <strong>kendi iyzico üye işyeri hesabınıza</strong>{' '}
              yatar. Şükran bu paraya hiçbir aşamada erişmez.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary-container">point_of_sale</span>
            <span>
              Kapalıyken misafir "Hesabı iste" butonuna dokunur; garson ödemeyi (nakit veya kendi POS cihazınız)
              "Adisyonlar" sayfasından tahsil eder.
            </span>
          </li>
        </ul>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-4"
      >
        <label className="flex items-center justify-between gap-md cursor-pointer">
          <span className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-background">Online kart ödemesini aç</span>
            <span className="text-body-sm text-on-surface-variant">
              {enabled
                ? 'Misafirler QR menüden kartla ödeyebilir.'
                : 'Kapalı: misafirler "Hesabı iste" ile garsonu çağırır, ödemeyi garson alır.'}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="w-5 h-5 accent-primary-container shrink-0"
          />
        </label>

        {enabled && !isFake && (
          <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant">
            <p className="text-body-sm text-on-surface-variant">
              iyzico üye işyeri panelinizden API anahtarlarınızı alabilirsiniz. Anahtarlar sunucuda saklanır ve bir
              daha görüntülenmez.
            </p>

            {hasCredentials && (
              <div className="flex items-center gap-2 bg-surface-container-low rounded-lg p-3">
                <span className="material-symbols-outlined text-primary-container">verified</span>
                <span className="text-body-sm text-on-background">
                  <strong>Kayıtlı</strong>
                  {settings?.apiKeyMasked ? ` — API anahtarı: ${settings.apiKeyMasked}` : ''}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="apiKey" className="text-label-sm text-on-surface-variant">API Anahtarı</label>
              <input
                id="apiKey"
                type="password"
                autoComplete="new-password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className={inputClass}
                placeholder={hasCredentials ? 'Değiştirmek için yeni anahtarı girin' : 'iyzico API anahtarı'}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="secretKey" className="text-label-sm text-on-surface-variant">Gizli Anahtar</label>
              <input
                id="secretKey"
                type="password"
                autoComplete="new-password"
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
                className={inputClass}
                placeholder={hasCredentials ? 'Değiştirmek için yeni anahtarı girin' : 'iyzico gizli anahtarı'}
              />
              {hasCredentials && (
                <p className="text-[11px] text-on-surface-variant opacity-70">
                  Boş bırakırsanız kayıtlı anahtarlar değişmez.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="baseUrl" className="text-label-sm text-on-surface-variant">Ortam</label>
              <select
                id="baseUrl"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                className={inputClass}
              >
                <option value={SANDBOX_URL}>Test (sandbox-api)</option>
                <option value={LIVE_URL}>Canlı (api)</option>
              </select>
              <p className="text-[11px] text-on-surface-variant opacity-70">
                Test ortamında gerçek para çekilmez. Canlıya geçerken canlı ortam anahtarlarınızı kullanın.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
