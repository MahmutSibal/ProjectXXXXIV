import { useCallback, useEffect, useState } from 'react';
import { restaurantsApi } from '../../api/restaurants.js';
import { ApiError } from '../../api/client.js';
import { formatKurus } from '../../api/enums.js';

const panel =
  'rounded-xl border border-outline-variant bg-surface-container-lowest p-md ambient-shadow';

const input =
  'min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-background outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container';

const primary =
  'min-h-11 rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container disabled:opacity-50';

const secondary =
  'min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-background';

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

/** "TR33 0006 ..." → "TR•• •••• ... ••26" (son 4 hane görünür). */
function maskIban(iban) {
  const compact = (iban ?? '').replace(/\s/g, '');
  return compact ? `TR•• •••• •••• •••• •••• ••${compact.slice(-4)}` : '-';
}

function maskName(name) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${[...part][0]}•••`)
    .join(' ') || '-';
}

function Field({ label, ...props }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-on-background">
      {label}
      <input {...props} className={input} />
    </label>
  );
}

function errorText(err, fallback) {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * İşletme Bilgileri: işletmenin ödeme aktarımı için kayıtlı IBAN ve hesap sahibi
 * (işletme sahibi bunu İşletme Profili'nden girer; SuperAdmin burada düzeltebilir).
 * PayTR Transfer: valör ve platform komisyonu (yalnızca SuperAdmin belirler).
 */
function TransferForm({ restaurantId, tab, settings, onSaved }) {
  const isPaytr = tab === 'paytr';
  const [masked, setMasked] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);

    setIsSaving(true);
    setFeedback(null);
    try {
      if (isPaytr) {
        const settlementDays = Number(values.get('settlementDays'));
        const commission = Number(values.get('commission'));
        if (!Number.isSafeInteger(settlementDays) || settlementDays < 0 || !Number.isFinite(commission) || commission < 0 || commission > 100) {
          setFeedback({ error: true, text: 'Valörü sıfır veya daha büyük bir tam sayı, komisyonu 0–100 arasında girin.' });
          return;
        }
        await restaurantsApi.updatePayoutTerms(restaurantId, settlementDays, commission);
      } else {
        const fullName = String(values.get('fullName') ?? '').trim();
        const businessName = String(values.get('businessName') ?? '').trim();
        const iban = String(values.get('iban') ?? '').replace(/\s/g, '').toUpperCase();
        if (fullName.split(/\s+/).length < 2 || !businessName || !/^TR\d{24}$/.test(iban)) {
          setFeedback({
            error: true,
            text: 'Hesap sahibinin adını ve soyadını, işletme unvanını ve TR ile başlayan 26 karakterli IBAN’ı girin.',
          });
          return;
        }
        await restaurantsApi.updatePaymentSettings(restaurantId, {
          // Masada kart ödemesi ayarı işletmenindir; burada korunur.
          onlinePaymentEnabled: Boolean(settings?.onlinePaymentEnabled),
          iban,
          accountHolderBusinessName: businessName,
          accountHolderFullName: fullName,
        });
      }

      form.reset();
      setMasked(true);
      setFeedback({ error: false, text: 'Kaydedildi.' });
      onSaved();
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Kaydedilemedi.') });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={panel}>
      <div className="mb-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-background">
            {isPaytr ? 'PayTR Transfer Bilgileri' : 'İşletme Transfer Bilgileri'}
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            {isPaytr
              ? 'Ödemenin işletmeye aktarılma süresi (valör) ve platform komisyonu.'
              : 'Ödemelerin aktarılacağı banka hesabı. Bankadaki hesap kaydıyla birebir aynı olmalı.'}
          </p>
        </div>

        {!isPaytr && (
          <button
            type="button"
            aria-pressed={masked}
            className={secondary}
            onClick={() => setMasked((current) => !current)}
          >
            {masked ? 'Girişi Göster' : 'Maskele'}
          </button>
        )}
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
        {isPaytr ? (
          <>
            <Field
              label="Valör (gün)"
              name="settlementDays"
              type="number"
              min="0"
              max="90"
              step="1"
              defaultValue={settings?.payoutSettlementDays ?? ''}
              required
            />
            <Field
              label="Komisyon (%)"
              name="commission"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={settings?.commissionPercent ?? ''}
              required
            />
          </>
        ) : (
          <>
            <Field
              label="Hesap Sahibi Ad Soyad"
              name="fullName"
              type={masked ? 'password' : 'text'}
              autoComplete="off"
              maxLength={150}
              required
            />
            <Field
              label="Hesap Sahibi İşletme Unvanı"
              name="businessName"
              type="text"
              autoComplete="off"
              maxLength={200}
              defaultValue={settings?.accountHolderBusinessName ?? ''}
              required
            />
            <Field
              label="IBAN"
              name="iban"
              type={masked ? 'password' : 'text'}
              placeholder="TR ile başlayan IBAN"
              autoComplete="off"
              maxLength={40}
              required
            />
          </>
        )}

        <div className="sm:col-span-2">
          <button type="submit" className={primary} disabled={isSaving}>
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>

      {feedback && (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={`mt-3 text-sm ${feedback.error ? 'text-error' : 'text-primary-container'}`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-md rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <h4 className="mb-3 font-bold text-on-background">Kayıtlı Bilgiler</h4>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {isPaytr ? (
            <>
              <div>
                <dt className="text-on-surface-variant">Valör</dt>
                <dd className="font-semibold">
                  {settings?.payoutSettlementDays == null ? 'Belirlenmedi' : `${settings.payoutSettlementDays} gün`}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Komisyon</dt>
                <dd className="font-semibold">
                  {settings?.commissionPercent == null
                    ? 'Belirlenmedi'
                    : `%${Number(settings.commissionPercent).toLocaleString('tr-TR')}`}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="text-on-surface-variant">Hesap sahibi</dt>
                <dd className="break-words font-semibold">{maskName(settings?.accountHolderFullName)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">İşletme unvanı</dt>
                <dd className="break-words font-semibold">{settings?.accountHolderBusinessName || '-'}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">IBAN</dt>
                <dd className="break-words font-mono">{maskIban(settings?.iban)}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </section>
  );
}

function EarningsTable({ report, error }) {
  return (
    <section className={panel}>
      <div className="mb-md flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-background">
            Son 15 Günlük İşletme Kazancı
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Verilen siparişlerin brüt toplamı; komisyon, kayıtlı orana göre hesaplanır.
          </p>
        </div>

        {report && (
          <div className="rounded-lg bg-surface-container-low px-4 py-2">
            <p className="text-xs text-on-surface-variant">15 Günlük Toplam (brüt / net)</p>
            <strong className="text-primary-container">
              {formatKurus(report.totalGross)} / {formatKurus(report.totalNet)}
            </strong>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-error">{error}</p>}
      {!report && !error && <p role="status">Yükleniyor…</p>}

      {report && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-surface-container text-on-surface-variant">
              <tr>
                <th scope="col" className="px-4 py-3">Tarih</th>
                <th scope="col" className="px-4 py-3 text-right">Sipariş</th>
                <th scope="col" className="px-4 py-3 text-right">Brüt</th>
                <th scope="col" className="px-4 py-3 text-right">Komisyon</th>
                <th scope="col" className="px-4 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {report.days.map((row) => (
                <tr key={row.date}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {dateFormat.format(new Date(`${row.date}T12:00:00`))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.orderCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatKurus(row.grossAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatKurus(row.commissionAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{formatKurus(row.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function SuperAdminTransfers() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [tab, setTab] = useState('business');
  const [status, setStatus] = useState('loading');
  const [settings, setSettings] = useState(null);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    let active = true;

    restaurantsApi.getAll()
      .then((data) => {
        if (!active) return;

        const items = Array.isArray(data) ? data : data?.items ?? [];
        setRestaurants(items);
        setRestaurantId(items[0]?.id ?? '');
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const loadDetails = useCallback(() => {
    if (!restaurantId) return;
    restaurantsApi.getPaymentSettings(restaurantId).then(setSettings).catch(() => setSettings(null));
    restaurantsApi
      .getEarnings(restaurantId, 15)
      .then((data) => {
        setReport(data);
        setReportError('');
      })
      .catch((err) => setReportError(errorText(err, 'Kazanç raporu yüklenemedi.')));
  }, [restaurantId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-lg">
      <header>
        <h2 className="font-headline-lg text-headline-lg text-on-background">
          Transfer İşlemi
        </h2>
        <p className="mt-2 text-on-surface-variant">
          İşletme transfer bilgilerini, PayTR ayarlarını ve günlük kazançları görüntüleyin.
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Paranın işletmeye fiilen aktarılması PayTR entegrasyonu tamamlandığında başlayacak;
          buradaki bilgiler o aktarımda kullanılır.
        </p>
      </header>

      {status === 'loading' && <p role="status">İşletmeler yükleniyor…</p>}
      {status === 'error' && <p role="alert" className="text-error">İşletmeler yüklenemedi.</p>}
      {status === 'ready' && !restaurants.length && <p>Kayıtlı işletme bulunamadı.</p>}

      {!!restaurants.length && (
        <>
          <div className={panel}>
            <label className="grid gap-2 text-sm font-semibold sm:max-w-sm">
              İşletme Seç
              <select
                className={input}
                value={restaurantId}
                onChange={(event) => setRestaurantId(event.target.value)}
              >
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Transfer bölümleri">
            <button
              type="button"
              aria-pressed={tab === 'business'}
              className={tab === 'business' ? primary : secondary}
              onClick={() => setTab('business')}
            >
              İşletme Bilgileri
            </button>
            <button
              type="button"
              aria-pressed={tab === 'paytr'}
              className={tab === 'paytr' ? primary : secondary}
              onClick={() => setTab('paytr')}
            >
              PayTR Transfer
            </button>
          </div>

          <TransferForm
            key={`${restaurantId}:${tab}:${settings ? 'y' : 'n'}`}
            restaurantId={restaurantId}
            tab={tab}
            settings={settings}
            onSaved={loadDetails}
          />
          <EarningsTable report={report} error={reportError} />
        </>
      )}
    </div>
  );
}
