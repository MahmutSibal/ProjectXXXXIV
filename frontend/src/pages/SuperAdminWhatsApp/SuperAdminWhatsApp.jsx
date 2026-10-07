import { useCallback, useEffect, useState } from 'react';
import { whatsAppApi } from '../../api/phoneVerification.js';
import { ApiError } from '../../api/client.js';

const STATUS_LABEL = {
  disabled: { text: 'Devre dışı', tone: 'bg-surface-container-high text-on-surface-variant', icon: 'block' },
  unreachable: { text: 'Servise ulaşılamıyor', tone: 'bg-error-container text-on-error-container', icon: 'cloud_off' },
  disconnected: { text: 'Bağlı değil', tone: 'bg-surface-container-high text-on-surface-variant', icon: 'link_off' },
  starting: { text: 'Başlatılıyor...', tone: 'bg-secondary-container text-on-secondary-container', icon: 'hourglass_top' },
  qr: { text: 'QR bekleniyor', tone: 'bg-secondary-container text-on-secondary-container', icon: 'qr_code_2' },
  connected: { text: 'Bağlı', tone: 'bg-primary-container text-on-primary-container', icon: 'check_circle' },
  failed: { text: 'Hata', tone: 'bg-error-container text-on-error-container', icon: 'error' },
};

export default function SuperAdminWhatsApp() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setStatus(await whatsAppApi.getStatus());
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Durum alınamadı.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // QR okutulurken durum hızlı değişir; eşleşme beklenirken sık, bağlıyken seyrek yokla.
  useEffect(() => {
    const current = status?.status;
    if (current === 'disabled') return undefined;

    const interval = current === 'qr' || current === 'starting' ? 3000 : 15000;
    const timer = setInterval(load, interval);
    return () => clearInterval(timer);
  }, [status?.status, load]);

  const run = async (action) => {
    setIsBusy(true);
    setError('');
    try {
      setStatus(await action());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İşlem tamamlanamadı.');
    } finally {
      setIsBusy(false);
    }
  };

  const meta = STATUS_LABEL[status?.status] ?? STATUS_LABEL.disconnected;
  const isConnected = status?.status === 'connected';

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-headline-lg text-headline-lg text-on-background">WhatsApp</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Kayıt olan işletmelere telefon doğrulama kodu gönderen WhatsApp hattı.
          Kodlar bu hesaptan iletilir.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {isLoading ? (
        <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
      ) : (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-label-md text-label-md ${meta.tone}`}>
                <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                {meta.text}
              </span>

              {status?.phoneNumber && (
                <span className="font-body-md text-body-md text-on-surface-variant">
                  Hat: +{status.phoneNumber}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => run(whatsAppApi.startSession)}
                disabled={isBusy || isConnected || status?.status === 'disabled'}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md disabled:opacity-40"
              >
                {isConnected ? 'Bağlı' : 'Oturumu Başlat'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('WhatsApp oturumu kapatılacak. Doğrulama kodları gönderilemez ve yeniden QR okutmanız gerekir. Devam edilsin mi?')) {
                    run(whatsAppApi.logout);
                  }
                }}
                disabled={isBusy || !isConnected}
                className="px-4 py-2 rounded-lg border border-outline-variant font-label-md disabled:opacity-40"
              >
                Oturumu Kapat
              </button>
            </div>
          </div>

          {status?.status === 'disabled' && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              WhatsApp doğrulaması kapalı. Açmak için <code>WhatsApp:Enabled</code> ayarını
              true yapın ve <code>SUKRAN_WHATSAPP_TOKEN</code> değerini girin (bkz. DEPLOYMENT.md).
            </p>
          )}

          {status?.status === 'unreachable' && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              wppconnect servisi çalışmıyor görünüyor. <code>services/whatsapp</code> altında
              <code> npm start</code> ile başlatın.
            </p>
          )}

          {status?.qrDataUrl && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-md">
                Telefonunuzda WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla yolunu izleyip
                aşağıdaki kodu okutun.
              </p>
              <img
                src={status.qrDataUrl}
                alt="WhatsApp QR kodu"
                className="w-64 h-64 border border-outline-variant rounded-xl bg-white p-2"
              />
            </div>
          )}

          {status?.lastError && status.status === 'failed' && (
            <p className="font-body-sm text-body-sm text-error">Son hata: {status.lastError}</p>
          )}

          {isConnected && status?.connectedAt && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Bağlantı zamanı: {new Date(status.connectedAt).toLocaleString('tr-TR')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
