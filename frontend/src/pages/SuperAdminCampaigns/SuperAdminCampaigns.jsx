import { useCallback, useEffect, useState } from 'react';
import { adminCampaignsApi } from '../../api/campaigns.js';
import { ApiError } from '../../api/client.js';

const panel = 'rounded-xl border border-outline-variant bg-surface-container-lowest p-md ambient-shadow';
const input =
  'min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-background outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container disabled:opacity-60';
const primary =
  'min-h-11 rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container disabled:opacity-50';
const secondary =
  'min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-background disabled:opacity-50';

const STATUS = {
  Sending: { label: 'Gönderiliyor', className: 'bg-surface-container-low text-on-background' },
  Completed: { label: 'Tamamlandı', className: 'bg-primary-container text-on-primary-container' },
  Failed: { label: 'Başarısız', className: 'bg-error-container text-on-error-container' },
  Interrupted: { label: 'Yarım kaldı', className: 'bg-error-container text-on-error-container' },
};

function errorText(err, fallback) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export default function SuperAdminCampaigns() {
  const [audience, setAudience] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, list] = await Promise.all([adminCampaignsApi.audience(), adminCampaignsApi.list()]);
      setAudience(a);
      setCampaigns(list);
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Kampanyalar yüklenemedi.') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Gönderim sürerken ilerleme birkaç saniyede bir yenilenir.
  const sending = campaigns.some((campaign) => campaign.status === 'Sending');
  useEffect(() => {
    if (!sending) return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [sending, load]);

  const ready = subject.trim().length > 0 && body.trim().length > 0;
  // Görsel alanları yalnızca özellik açıksa gönderilir; kapalıyken sunucu zaten reddeder.
  const payload = () => ({
    subject,
    body,
    ...(audience?.richEnabled ? { imageUrl, buttonText, buttonUrl } : {}),
  });

  async function sendTest() {
    setBusy('test');
    setFeedback(null);
    try {
      const result = await adminCampaignsApi.sendTest(payload());
      setFeedback({ error: false, text: `Test e-postası ${result.sentTo} adresine gönderildi.` });
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Test e-postası gönderilemedi.') });
    } finally {
      setBusy('');
    }
  }

  async function send() {
    const count = audience?.recipientCount ?? 0;
    if (!window.confirm(`Bu kampanya ${count} kişiye gönderilecek ve geri alınamaz. Devam edilsin mi?`)) return;
    setBusy('send');
    setFeedback(null);
    try {
      await adminCampaignsApi.send(payload());
      setSubject('');
      setBody('');
      setImageUrl('');
      setButtonText('');
      setButtonUrl('');
      setFeedback({ error: false, text: 'Gönderim başladı. İlerlemeyi aşağıdaki listeden izleyebilirsiniz.' });
      await load();
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Kampanya gönderilemedi.') });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-lg">
      <section>
        <h1 className="font-h1 text-h1 text-on-background">Kampanyalar</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Kampanya e-postası yalnızca bildirim iznini (açık rıza) vermiş kullanıcılara gider. Her e-postada gönderici
          bilgisi ve tek tıkla abonelikten çıkış bağlantısı otomatik eklenir.
        </p>
      </section>

      <section className={`${panel} grid gap-2 sm:grid-cols-3`}>
        <div>
          <p className="text-xs text-on-surface-variant">Alıcı sayısı</p>
          <p className="font-h2 text-h2 text-on-background">{audience ? audience.recipientCount : '…'}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">E-posta gönderimi</p>
          <p className="text-on-background">{audience ? (audience.emailEnabled ? 'Açık' : 'Kapalı') : '…'}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Tek seferde en fazla</p>
          <p className="text-on-background">{audience ? audience.maxRecipients : '…'} alıcı</p>
        </div>
      </section>

      <section className={`${panel} grid gap-md`}>
        <h2 className="font-h3 text-h3 text-on-background">Yeni kampanya</h2>
        <label className="grid gap-1 text-sm text-on-background">
          Konu
          <input className={input} maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm text-on-background">
          Mesaj
          <textarea className={input} rows={8} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
          <span className="text-xs text-on-surface-variant">
            Düz metin gönderilir. Alt bilgi (gönderici, abonelikten çık bağlantısı) otomatik eklenir.
          </span>
        </label>

        {audience?.richEnabled && (
          <fieldset className="grid gap-3 rounded-lg border border-outline-variant p-3">
            <legend className="px-1 text-sm font-semibold text-on-background">Görselli e-posta (isteğe bağlı)</legend>
            <label className="grid gap-1 text-sm text-on-background">
              Görsel veya GIF adresi
              <input className={input} type="url" maxLength={500} placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <span className="text-xs text-on-surface-variant">Yalnızca https ile başlayan, herkese açık bir adres. Konunun üstünde gösterilir.</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-on-background">
                Buton metni
                <input className={input} maxLength={40} value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm text-on-background">
                Buton bağlantısı
                <input className={input} type="url" maxLength={500} placeholder="https://..." value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} />
              </label>
            </div>
          </fieldset>
        )}

        {feedback && (
          <p role="status" className={`rounded-lg p-3 text-sm ${feedback.error ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-on-background'}`}>
            {feedback.text}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={secondary} onClick={sendTest} disabled={!ready || Boolean(busy) || !audience?.emailEnabled}>
            {busy === 'test' ? 'Gönderiliyor…' : 'Bana test gönder'}
          </button>
          <button
            type="button"
            className={primary}
            onClick={send}
            disabled={!ready || Boolean(busy) || sending || !audience?.emailEnabled || !audience?.recipientCount}
          >
            {busy === 'send' ? 'Başlatılıyor…' : `Gönder (${audience?.recipientCount ?? 0} kişi)`}
          </button>
        </div>
      </section>

      <section className={`${panel} grid gap-md`}>
        <h2 className="font-h3 text-h3 text-on-background">Geçmiş</h2>
        {campaigns.length === 0 && <p className="text-on-surface-variant">Henüz kampanya gönderilmedi.</p>}
        {campaigns.map((campaign) => {
          const status = STATUS[campaign.status] ?? STATUS.Failed;
          return (
            <article key={campaign.id} className="grid gap-1 rounded-lg border border-outline-variant p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-on-background">
                  {campaign.subject}
                  {campaign.isRich && <span className="ml-2 text-xs font-normal text-on-surface-variant">(görselli)</span>}
                </h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {formatDate(campaign.createdAt)} · {campaign.sentCount} gönderildi
                {campaign.failedCount > 0 ? `, ${campaign.failedCount} başarısız` : ''} · {campaign.recipientCount} alıcı
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
