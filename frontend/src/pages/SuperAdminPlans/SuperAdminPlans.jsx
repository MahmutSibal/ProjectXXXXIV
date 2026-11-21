import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminPlansApi, SubscriptionPlan } from '../../api/subscriptions.js';
import { ApiError } from '../../api/client.js';

const panel = 'rounded-xl border border-outline-variant bg-surface-container-lowest p-md ambient-shadow';
const input =
  'min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-background outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container disabled:opacity-60';
const primary =
  'min-h-11 rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container disabled:opacity-50';
const secondary =
  'min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-background disabled:opacity-50';

const tl = (kurus) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format((kurus ?? 0) / 100);

function errorText(err, fallback) {
  return err instanceof ApiError ? err.message : fallback;
}

/** "" -> null (sınırsız); sayı -> tam sayı. */
const limitValue = (value) => (value === '' || value === null || value === undefined ? null : Math.max(0, Math.trunc(Number(value))));
const limitInput = (value) => (value === null || value === undefined ? '' : String(value));

/** Sunucudaki fiyat formülünün aynısı: önce kampanya, sonra yıllık indirim (kuruş, tam sayı). */
function previewPrice(monthlyKurus, discountPercent, annualPercent, months) {
  const list = monthlyKurus * months;
  const afterCampaign = list - Math.floor((list * discountPercent) / 100);
  const annual = months >= 12 ? annualPercent : 0;
  return afterCampaign - Math.floor((afterCampaign * annual) / 100);
}

function toForm(plan) {
  return {
    displayName: plan.displayName,
    summary: plan.summary ?? '',
    monthlyPriceTl: String((plan.monthlyPrice ?? 0) / 100),
    discountPercent: String(plan.discountPercent ?? 0),
    isVisible: plan.isVisible,
    isHighlighted: plan.isHighlighted,
    bullets: (plan.bullets ?? []).join('\n'),
    hasOrdering: plan.features.hasOrdering,
    maxQrOrdersPerPeriod: limitInput(plan.features.maxQrOrdersPerPeriod),
    maxKitchenPanels: limitInput(plan.features.maxKitchenPanels),
    maxWaiterPanels: limitInput(plan.features.maxWaiterPanels),
    hasDetailedReports: plan.features.hasDetailedReports,
    hasEvents: plan.features.hasEvents,
    maxTables: limitInput(plan.features.maxTables),
  };
}

function Check({ label, hint, ...props }) {
  return (
    <label className="flex items-start gap-2 text-sm text-on-background">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-primary-container,#0b5d3b)]" {...props} />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-on-background">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function PlanCard({ plan, annualDiscountPercent, onSaved }) {
  const [form, setForm] = useState(() => toForm(plan));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isTrial = plan.plan === SubscriptionPlan.Trial;
  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const monthlyKurus = Math.round(Number(String(form.monthlyPriceTl).replace(',', '.')) * 100);
  const discount = Math.min(90, Math.max(0, Math.trunc(Number(form.discountPercent) || 0)));
  const preview = useMemo(
    () =>
      Number.isFinite(monthlyKurus)
        ? { monthly: previewPrice(monthlyKurus, discount, annualDiscountPercent, 1), annual: previewPrice(monthlyKurus, discount, annualDiscountPercent, 12) }
        : null,
    [monthlyKurus, discount, annualDiscountPercent],
  );

  async function save(event) {
    event.preventDefault();
    if (!form.displayName.trim()) {
      setFeedback({ error: true, text: 'Paket adını girin.' });
      return;
    }
    if (!plan.isQuoteOnly && !isTrial && (!Number.isFinite(monthlyKurus) || monthlyKurus < 0)) {
      setFeedback({ error: true, text: 'Geçerli bir aylık fiyat girin.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const saved = await adminPlansApi.update(plan.plan, {
        displayName: form.displayName.trim(),
        summary: form.summary.trim(),
        monthlyPrice: plan.isQuoteOnly || isTrial ? 0 : monthlyKurus,
        discountPercent: discount,
        isVisible: isTrial ? false : form.isVisible,
        isHighlighted: form.isHighlighted,
        bullets: form.bullets.split('\n').map((line) => line.trim()).filter(Boolean),
        hasOrdering: form.hasOrdering,
        maxQrOrdersPerPeriod: form.hasOrdering ? limitValue(form.maxQrOrdersPerPeriod) : 0,
        maxKitchenPanels: limitValue(form.maxKitchenPanels),
        maxWaiterPanels: limitValue(form.maxWaiterPanels),
        hasDetailedReports: form.hasDetailedReports,
        hasEvents: form.hasEvents,
        maxTables: form.maxTables === '' ? null : Math.max(1, Math.trunc(Number(form.maxTables))),
      });
      setForm(toForm(saved));
      setFeedback({ error: false, text: 'Kaydedildi. Ana sayfa ve abonelik ekranı güncellendi.' });
      onSaved(saved);
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Paket kaydedilemedi.') });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm(`${plan.displayName} paketi koddaki varsayılan ayarlara dönsün mü?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      const restored = await adminPlansApi.reset(plan.plan);
      setForm(toForm(restored));
      onSaved(restored);
      setFeedback({ error: false, text: 'Varsayılan ayarlara dönüldü.' });
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Sıfırlanamadı.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className={`${panel} grid gap-md`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-h3 text-h3 text-on-background">{plan.displayName}</h2>
          <p className="text-xs text-on-surface-variant">
            Kod: {plan.code} · Aktif abone: {plan.activeSubscriptions}
            {plan.isCustomized ? ' · Özelleştirilmiş' : ' · Varsayılan ayarlar'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {isTrial && <span className="rounded-full bg-surface-container-high px-2 py-1">Deneme paketi (satılmaz)</span>}
          {plan.isQuoteOnly && <span className="rounded-full bg-surface-container-high px-2 py-1">Teklif usulü</span>}
          {!isTrial && !form.isVisible && <span className="rounded-full bg-error-container px-2 py-1 text-on-error-container">Satışta değil</span>}
          {form.isHighlighted && <span className="rounded-full bg-secondary-container px-2 py-1 text-on-secondary-container">Öne çıkan</span>}
        </div>
      </div>

      <div className="grid gap-md md:grid-cols-2">
        <Field label="Paket adı">
          <input className={input} value={form.displayName} onChange={set('displayName')} maxLength={40} />
        </Field>
        {!isTrial && !plan.isQuoteOnly && (
          <div className="grid grid-cols-2 gap-md">
            <Field label="Aylık fiyat (TL)">
              <input className={input} inputMode="decimal" value={form.monthlyPriceTl} onChange={set('monthlyPriceTl')} />
            </Field>
            <Field label="Kampanya indirimi (%)" hint="0 = indirim yok">
              <input className={input} type="number" min="0" max="90" value={form.discountPercent} onChange={set('discountPercent')} />
            </Field>
          </div>
        )}
      </div>

      <Field label="Açıklama" hint="Paket kartında ve abonelik ekranında görünür.">
        <textarea className={input} rows={2} maxLength={300} value={form.summary} onChange={set('summary')} />
      </Field>

      {!isTrial && !plan.isQuoteOnly && preview && (
        <div className="rounded-lg bg-surface-container-low p-3 text-sm text-on-background">
          Müşterinin göreceği: <strong>{tl(preview.monthly)}</strong> / ay
          {discount > 0 && <span className="text-on-surface-variant"> (liste {tl(monthlyKurus)}, %{discount} indirim)</span>}
          {' · '}Yıllık: <strong>{tl(preview.annual)}</strong>
          <span className="text-on-surface-variant"> (+%{annualDiscountPercent} yıllık indirim)</span>
        </div>
      )}

      <fieldset className="grid gap-md rounded-lg border border-outline-variant p-md">
        <legend className="px-1 text-sm font-semibold text-on-background">Paketin kapsadığı hizmetler ve limitler</legend>
        <p className="text-xs text-on-surface-variant">
          Burada kapalı olan hizmetleri bu paketteki işletmeler kullanamaz. Limitlerde boş = sınırsız, 0 = yok.
          Değişiklik mevcut abonelere de hemen uygulanır.
        </p>
        <div className="grid gap-md md:grid-cols-2">
          <Check label="QR sipariş sistemi" hint="Kapalıysa yalnızca QR menü gösterilir, sipariş alınamaz." checked={form.hasOrdering} onChange={set('hasOrdering')} />
          <Field label="Dönem başına QR sipariş sınırı" hint="Boş = sınırsız">
            <input className={input} type="number" min="0" value={form.maxQrOrdersPerPeriod} onChange={set('maxQrOrdersPerPeriod')} disabled={!form.hasOrdering} placeholder="Sınırsız" />
          </Field>
          <Field label="Mutfak paneli sayısı" hint="Boş = sınırsız, 0 = yok">
            <input className={input} type="number" min="0" value={form.maxKitchenPanels} onChange={set('maxKitchenPanels')} placeholder="Sınırsız" />
          </Field>
          <Field label="Garson paneli sayısı" hint="Boş = sınırsız, 0 = yok">
            <input className={input} type="number" min="0" value={form.maxWaiterPanels} onChange={set('maxWaiterPanels')} placeholder="Sınırsız" />
          </Field>
          <Field label="Masa sınırı" hint="Boş = sınırsız">
            <input className={input} type="number" min="1" value={form.maxTables} onChange={set('maxTables')} placeholder="Sınırsız" />
          </Field>
          <div className="grid content-start gap-2">
            <Check label="Detaylı raporlar" checked={form.hasDetailedReports} onChange={set('hasDetailedReports')} />
            <Check label="Etkinlikler" checked={form.hasEvents} onChange={set('hasEvents')} />
          </div>
        </div>
      </fieldset>

      <Field label="Paket kartındaki maddeler" hint="Her satır bir madde (en fazla 20). Ana sayfadaki pakette bu sırayla görünür.">
        <textarea className={input} rows={4} value={form.bullets} onChange={set('bullets')} />
      </Field>

      {!isTrial && (
        <div className="flex flex-wrap gap-md">
          <Check label="Satışta (ana sayfada görünür)" hint="Kapatınca yeni müşteri seçemez; mevcut aboneler etkilenmez." checked={form.isVisible} onChange={set('isVisible')} />
          <Check label="Öne çıkar" hint="Ana sayfada 'En çok tercih edilen' olarak gösterilir (tek paket)." checked={form.isHighlighted} onChange={set('isHighlighted')} />
        </div>
      )}

      {feedback && (
        <p role="status" className={`rounded-lg p-3 text-sm ${feedback.error ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-on-background'}`}>
          {feedback.text}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {plan.isCustomized && (
          <button type="button" className={secondary} onClick={reset} disabled={saving}>
            Varsayılana dön
          </button>
        )}
        <button type="submit" className={primary} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}

function GlobalSettings({ catalog, onSaved }) {
  const [annual, setAnnual] = useState(String(catalog.annualDiscountPercent));
  const [trial, setTrial] = useState(String(catalog.trialDays));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await adminPlansApi.updateSettings({ annualDiscountPercent: Math.trunc(Number(annual)), trialDays: Math.trunc(Number(trial)) });
      setAnnual(String(saved.annualDiscountPercent));
      setTrial(String(saved.trialDays));
      onSaved(saved);
      setFeedback({ error: false, text: 'Kaydedildi.' });
    } catch (err) {
      setFeedback({ error: true, text: errorText(err, 'Kaydedilemedi.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className={`${panel} grid gap-md`}>
      <h2 className="font-h3 text-h3 text-on-background">Genel ayarlar</h2>
      <div className="grid gap-md sm:grid-cols-3">
        <Field label="Yıllık ödeme indirimi (%)" hint="12 aylık ödemede, kampanya indiriminin üstüne uygulanır.">
          <input className={input} type="number" min="0" max="90" value={annual} onChange={(e) => setAnnual(e.target.value)} />
        </Field>
        <Field label="Ücretsiz deneme süresi (gün)" hint="Yeni kayıtlara uygulanır.">
          <input className={input} type="number" min="0" max="90" value={trial} onChange={(e) => setTrial(e.target.value)} />
        </Field>
        <div className="grid content-end gap-2">
          <p className="text-xs text-on-surface-variant">Fiyat listesi sürümü: {catalog.priceVersion}</p>
          <button type="submit" className={primary} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
      {feedback && (
        <p role="status" className={`rounded-lg p-3 text-sm ${feedback.error ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-on-background'}`}>
          {feedback.text}
        </p>
      )}
    </form>
  );
}

export default function SuperAdminPlans() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      adminPlansApi
        .get()
        .then((data) => {
          setCatalog(data);
          setError('');
        })
        .catch((err) => setError(errorText(err, 'Paketler yüklenemedi.'))),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-lg">
      <section>
        <h1 className="font-h1 text-h1 text-on-background">Paketler</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Paket adı, fiyatı, indirimi ve kapsadığı hizmetler buradan yönetilir. Değişiklikler ana sayfadaki paketlere,
          işletmelerin abonelik ekranına, ödeme tutarına ve özellik kilitlerine hemen yansır.
        </p>
      </section>

      {error && <p className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
      {!catalog && !error && <p className="text-on-surface-variant">Yükleniyor…</p>}

      {catalog && (
        <>
          <GlobalSettings catalog={catalog} onSaved={setCatalog} />
          {catalog.plans.map((plan) => (
            <PlanCard
              key={plan.plan}
              plan={plan}
              annualDiscountPercent={catalog.annualDiscountPercent}
              onSaved={() => load()}
            />
          ))}
        </>
      )}
    </div>
  );
}
