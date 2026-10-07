import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { platformSettingsApi } from '../../api/platformSettings.js';
import { ApiError } from '../../api/client.js';

const MAX_MESSAGE = 300;

export default function SuperAdminSystemStatus() {
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [serverDisabled, setServerDisabled] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    platformSettingsApi
      .getStatus()
      .then((data) => {
        setEnabled(Boolean(data?.maintenanceEnabled));
        setMessage(data?.message ?? '');
        setServerDisabled(Boolean(data?.serverDisabled));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Sistem durumu yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await platformSettingsApi.saveStatus({ maintenanceEnabled: enabled, message: message.trim(), serverDisabled });
      setError('');
      toast.success(
        enabled
          ? 'Bakım modu açıldı. İşletmeler ve müşteriler bakım ekranını görüyor.'
          : 'Bakım modu kapatıldı. Sistem normal çalışıyor.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sistem durumu kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleServerSwitch = async () => {
    const next = !serverDisabled;
    if (next && confirmText.trim().toUpperCase() !== 'KAPAT') {
      toast.warning('Sunucuyu kapatmak için kutuya KAPAT yazın.');
      return;
    }

    setIsSwitching(true);
    try {
      await platformSettingsApi.saveStatus({
        maintenanceEnabled: enabled,
        message: message.trim(),
        serverDisabled: next,
      });
      setServerDisabled(next);
      setConfirmText('');
      toast.success(
        next
          ? 'Sunucu kapatıldı. Yalnızca Süper Admin erişebiliyor.'
          : 'Sunucu yeniden açıldı. Sistem normal çalışıyor.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sunucu durumu değiştirilemedi.');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-headline-lg text-headline-lg text-on-background">Sistem Durumu</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Planlı bakım öncesinde bakım modunu açarak işletmelere ve müşterilere bilgi verebilirsiniz.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg p-3">
        <span className="material-symbols-outlined">info</span>
        <p className="text-body-sm">
          Bakım modu açıkken işletme paneli, mutfak/garson paneli, QR menü ve kayıt sayfası "Bakımdayız" ekranını
          gösterir. Ana sayfa, giriş sayfası ve bu Süper Admin paneli açık kalır; bakımı buradan kapatabilirsiniz.
          Sunucu kapandığında veya ulaşılamadığında sistem "Sunucu şu anda aktif değil" ekranını gösterir.
        </p>
      </div>

      <section
        className={`rounded-xl p-md flex flex-col gap-4 border ${
          serverDisabled
            ? 'bg-error-container border-error'
            : 'bg-surface-container-lowest border-outline-variant ambient-shadow'
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-sm text-headline-sm text-on-background flex items-center gap-2">
              <span className="material-symbols-outlined">{serverDisabled ? 'power_off' : 'power_settings_new'}</span>
              Sunucu
            </h3>
            <p className="text-body-sm text-on-surface-variant max-w-[720px]">
              {serverDisabled
                ? 'Sunucu şu anda KAPALI. API, Süper Admin dışındaki herkese 503 döndürüyor; işletmeler ve müşteriler "Sunucu kapalı" ekranını görüyor.'
                : 'Sunucuyu kapattığınızda API, Süper Admin dışındaki herkese 503 döndürür (işletme paneli, mutfak paneli, QR menü ve siparişler çalışmaz). Süreç durmaz; buradan tek tıkla yeniden açabilirsiniz.'}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-bold ${
              serverDisabled ? 'bg-error text-on-error' : 'bg-primary-container text-on-primary-container'
            }`}
          >
            {serverDisabled ? 'KAPALI' : 'AÇIK'}
          </span>
        </div>

        {!serverDisabled && (
          <div className="flex flex-col gap-1 max-w-[360px]">
            <label htmlFor="shutdownConfirm" className="text-label-sm text-on-surface-variant">
              Onay için KAPAT yazın
            </label>
            <input
              id="shutdownConfirm"
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-error focus:ring-1 focus:ring-error outline-none"
              placeholder="KAPAT"
            />
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={handleServerSwitch}
            disabled={isSwitching}
            className={`font-label-md text-label-md px-6 py-3 rounded-lg transition-opacity disabled:opacity-60 hover:opacity-90 ${
              serverDisabled ? 'bg-primary-container text-on-primary-container' : 'bg-error text-on-error'
            }`}
          >
            {isSwitching ? 'İşleniyor...' : serverDisabled ? 'Sunucuyu Yeniden Aç' : 'Sunucuyu Kapat'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <form
          onSubmit={handleSave}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-4"
        >
          <h3 className="font-headline-sm text-headline-sm text-on-background">Bakım Modu</h3>

          <label
            htmlFor="maintenanceEnabled"
            className="flex items-center justify-between gap-4 border border-outline-variant rounded-lg p-3 cursor-pointer bg-surface-container-low"
          >
            <span className="flex flex-col">
              <span className="font-label-md text-label-md text-on-background">Bakım modunu aç</span>
              <span className="text-[12px] text-on-surface-variant">
                {enabled ? 'Açık: işletmeler ve müşteriler bakım ekranını görüyor.' : 'Kapalı: sistem normal çalışıyor.'}
              </span>
            </span>
            <input
              id="maintenanceEnabled"
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5 accent-[#06402b]"
            />
          </label>

          <div className="flex flex-col gap-1">
            <label htmlFor="maintenanceMessage" className="text-label-sm text-on-surface-variant">
              Bakım mesajı (isteğe bağlı)
            </label>
            <textarea
              id="maintenanceMessage"
              rows={4}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none resize-none"
              placeholder="Örn: Sistemimiz 02:00 - 03:00 arasında bakımda olacaktır."
            />
            <p className="text-[11px] text-on-surface-variant opacity-70">
              {message.length}/{MAX_MESSAGE}. Boş bırakırsanız varsayılan mesaj gösterilir.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-2 bg-primary-container text-on-primary-container font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Ziyaretçilerin Göreceği Ekran</h3>
            <p className="text-body-sm text-on-surface-variant">Bakım modu açıkken bu mesaj gösterilir.</p>
          </div>

          <div className="border border-outline-variant rounded-xl p-md flex flex-col items-center gap-3 bg-surface-container-low text-center">
            <span className="material-symbols-outlined text-primary-container text-[40px]">engineering</span>
            <h4 className="font-headline-sm text-headline-sm text-on-background">Bakımdayız</h4>
            <p className="text-body-sm text-on-surface-variant whitespace-pre-line">
              {message.trim() ||
                'Sistemimizi sizin için iyileştiriyoruz. Kısa süre içinde tekrar hizmetinizde olacağız.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
