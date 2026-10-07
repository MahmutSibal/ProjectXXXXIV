import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { platformSettingsApi } from '../../api/platformSettings.js';
import { ApiError } from '../../api/client.js';
import { invalidatePaymentOptions } from '../../hooks/usePaymentOptions.js';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none';

function formatIban(value) {
  const compact = String(value ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 26);
  return compact.replace(/(.{4})/g, '$1 ').trim();
}

const emptyForm = {
  bankName: '',
  accountHolder: '',
  iban: '',
  branch: '',
  paymentNote: '',
  bankTransferEnabled: false,
};

export default function SuperAdminPaymentSettings() {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({ showIyzicoLogos: true, cardPaymentsEnabled: true });
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  useEffect(() => {
    platformSettingsApi
      .getPaymentOptions()
      .then((data) =>
        setOptions({
          showIyzicoLogos: data?.showIyzicoLogos !== false,
          cardPaymentsEnabled: data?.cardPaymentsEnabled !== false,
        }),
      )
      .catch(() => {});
  }, []);

  const handleSaveOptions = async (next) => {
    const previous = options;
    setOptions(next);
    setIsSavingOptions(true);
    try {
      await platformSettingsApi.savePaymentOptions(next);
      invalidatePaymentOptions();
      toast.success('Ödeme altyapısı ayarları kaydedildi.');
    } catch (err) {
      setOptions(previous);
      toast.error(err instanceof ApiError ? err.message : 'Ödeme altyapısı ayarları kaydedilemedi.');
    } finally {
      setIsSavingOptions(false);
    }
  };

  useEffect(() => {
    platformSettingsApi
      .getPaymentAdmin()
      .then((data) =>
        setForm({
          bankName: data?.bankName ?? '',
          accountHolder: data?.accountHolder ?? '',
          iban: formatIban(data?.iban),
          branch: data?.branch ?? '',
          paymentNote: data?.paymentNote ?? '',
          bankTransferEnabled: Boolean(data?.bankTransferEnabled),
        }),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Ödeme ayarları yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === 'iban' ? formatIban(value) : value }));
  };

  const ibanCompact = form.iban.replace(/\s/g, '');

  const handleSave = async (event) => {
    event.preventDefault();

    if (form.bankTransferEnabled && (!form.bankName.trim() || !form.accountHolder.trim() || !ibanCompact)) {
      toast.warning('Havale/EFT açıkken banka adı, hesap sahibi ve IBAN zorunludur.');
      return;
    }
    if (ibanCompact && (!ibanCompact.startsWith('TR') || ibanCompact.length !== 26)) {
      toast.warning('IBAN "TR" ile başlamalı ve 26 karakter olmalıdır.');
      return;
    }

    setIsSaving(true);
    try {
      await platformSettingsApi.savePayment({
        bankName: form.bankName.trim(),
        accountHolder: form.accountHolder.trim(),
        iban: form.iban.trim(),
        branch: form.branch.trim(),
        paymentNote: form.paymentNote.trim(),
        bankTransferEnabled: form.bankTransferEnabled,
      });
      setError('');
      toast.success(
        form.bankTransferEnabled
          ? 'Ödeme ayarları kaydedildi. Havale/EFT restoranlara açık.'
          : 'Ödeme ayarları kaydedildi. Havale/EFT kapalı; restoranlar banka bilgisini görmez.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ödeme ayarları kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  const hasPreview = form.bankName.trim() || form.accountHolder.trim() || ibanCompact;

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section className="flex flex-col gap-2">
        <h2 className="font-headline-lg text-headline-lg text-on-background">Ödeme Ayarları</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Restoranların abonelik ücretini havale/EFT ile ödeyeceği banka hesabını buradan yönetebilirsiniz.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-4">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-background">Ödeme Altyapıları</h3>
          <p className="text-body-sm text-on-surface-variant">
            Siteye ve ödeme ekranlarına eklenen ödeme altyapısı görünümlerini buradan açıp kapatabilirsiniz.
            Değişiklik anında geçerli olur.
          </p>
        </div>

        <label
          htmlFor="showIyzicoLogos"
          className="flex items-center justify-between gap-4 border border-outline-variant rounded-lg p-3 cursor-pointer bg-surface-container-low"
        >
          <span className="flex flex-col">
            <span className="font-label-md text-label-md text-on-background">iyzico logolarını göster</span>
            <span className="text-[12px] text-on-surface-variant">
              "iyzico ile Öde", Mastercard, Visa, American Express ve Troy şeridi: sitenin alt bilgisi, Ödeme
              Yöntemleri bölümü, QR menü ödeme ekranı ve Aboneliğim sayfası.
            </span>
          </span>
          <input
            id="showIyzicoLogos"
            type="checkbox"
            role="switch"
            checked={options.showIyzicoLogos}
            disabled={isSavingOptions}
            onChange={(event) => handleSaveOptions({ ...options, showIyzicoLogos: event.target.checked })}
            className="h-5 w-5 accent-[#06402b]"
          />
        </label>

        <label
          htmlFor="cardPaymentsEnabled"
          className="flex items-center justify-between gap-4 border border-outline-variant rounded-lg p-3 cursor-pointer bg-surface-container-low"
        >
          <span className="flex flex-col">
            <span className="font-label-md text-label-md text-on-background">Online kart ödemesi (masadan ödeme)</span>
            <span className="text-[12px] text-on-surface-variant">
              Kapalıyken hiçbir restoranda müşteriler kartla ödeyemez; "Hesabı iste" ile garson tahsil eder.
              Açıkken her restoran kendi ödeme ayarlarından kartla ödemeyi ayrıca açar.
            </span>
          </span>
          <input
            id="cardPaymentsEnabled"
            type="checkbox"
            role="switch"
            checked={options.cardPaymentsEnabled}
            disabled={isSavingOptions}
            onChange={(event) => handleSaveOptions({ ...options, cardPaymentsEnabled: event.target.checked })}
            className="h-5 w-5 accent-[#06402b]"
          />
        </label>
      </section>

      <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg p-3">
        <span className="material-symbols-outlined">info</span>
        <p className="text-body-sm">
          Havale/EFT açıkken bu bilgiler restoranların "Aboneliğim" sayfasındaki "Havale / EFT ile Öde"
          kartında ve halka açık sitedeki "Ödeme Yöntemleri" bölümünde görünür. Kapattığınızda restoranlar ve
          ziyaretçiler banka bilgisini hiç görmez; kayıtlı bilgileriniz silinmez, tekrar açabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <form
          onSubmit={handleSave}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-4"
        >
          <h3 className="font-headline-sm text-headline-sm text-on-background">Banka Hesabı</h3>

          <label
            htmlFor="bankTransferEnabled"
            className="flex items-center justify-between gap-4 border border-outline-variant rounded-lg p-3 cursor-pointer bg-surface-container-low"
          >
            <span className="flex flex-col">
              <span className="font-label-md text-label-md text-on-background">Havale / EFT ile ödemeyi aç</span>
              <span className="text-[12px] text-on-surface-variant">
                {form.bankTransferEnabled
                  ? 'Açık: restoranlar banka bilgilerini görüyor.'
                  : 'Kapalı: restoranlar banka bilgilerini görmüyor.'}
              </span>
            </span>
            <input
              id="bankTransferEnabled"
              type="checkbox"
              role="switch"
              checked={form.bankTransferEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, bankTransferEnabled: event.target.checked }))
              }
              className="h-5 w-5 accent-[#06402b]"
            />
          </label>

          <div className="flex flex-col gap-1">
            <label htmlFor="bankName" className="text-label-sm text-on-surface-variant">Banka Adı</label>
            <input
              id="bankName"
              name="bankName"
              type="text"
              value={form.bankName}
              onChange={handleChange}
              maxLength={100}
              className={inputClass}
              placeholder="Örn: Ziraat Bankası"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="accountHolder" className="text-label-sm text-on-surface-variant">Hesap Sahibi</label>
            <input
              id="accountHolder"
              name="accountHolder"
              type="text"
              value={form.accountHolder}
              onChange={handleChange}
              maxLength={150}
              className={inputClass}
              placeholder="Ad Soyad / Şirket Unvanı"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="iban" className="text-label-sm text-on-surface-variant">IBAN</label>
            <input
              id="iban"
              name="iban"
              type="text"
              value={form.iban}
              onChange={handleChange}
              autoComplete="off"
              spellCheck={false}
              className={`${inputClass} font-mono tracking-wide`}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
            />
            <p className="text-[11px] text-on-surface-variant opacity-70">
              TR ile başlayan 26 karakter. Doğrulama kayıt sırasında sunucuda da yapılır.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="branch" className="text-label-sm text-on-surface-variant">Şube (isteğe bağlı)</label>
            <input
              id="branch"
              name="branch"
              type="text"
              value={form.branch}
              onChange={handleChange}
              maxLength={100}
              className={inputClass}
              placeholder="Örn: Kadıköy Şubesi"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="paymentNote" className="text-label-sm text-on-surface-variant">
              Ödeme Açıklaması / Not
            </label>
            <textarea
              id="paymentNote"
              name="paymentNote"
              rows={3}
              maxLength={300}
              value={form.paymentNote}
              onChange={handleChange}
              className={`${inputClass} resize-none`}
              placeholder="Açıklamaya işletme adınızı yazın."
            />
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
            <h3 className="font-headline-sm text-headline-sm text-on-background">Restoranların Göreceği Önizleme</h3>
            <p className="text-body-sm text-on-surface-variant">
              Kaydettiğinizde restoranlar bu kartı bu şekilde görür.
            </p>
          </div>

          <div className="border border-outline-variant rounded-xl p-md flex flex-col gap-3 bg-surface-container-low">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">account_balance</span>
              <h4 className="font-headline-sm text-headline-sm text-on-background">Havale / EFT ile Öde</h4>
            </div>

            {!form.bankTransferEnabled ? (
              <p className="text-body-sm text-on-surface-variant">
                Havale/EFT kapalı. Restoranlar ve ziyaretçiler bu kartı görmez.
              </p>
            ) : hasPreview ? (
              <dl className="flex flex-col gap-2 text-body-sm">
                <PreviewRow label="Banka" value={form.bankName} />
                <PreviewRow label="Hesap Sahibi" value={form.accountHolder} />
                <PreviewRow label="IBAN" value={form.iban} mono />
                {form.branch.trim() && <PreviewRow label="Şube" value={form.branch} />}
                {form.paymentNote.trim() && (
                  <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg p-3">
                    <span className="material-symbols-outlined">info</span>
                    <p className="text-body-sm">{form.paymentNote}</p>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Havale/EFT bilgileri henüz tanımlanmadı, destek ekibiyle iletişime geçin.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-col">
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd className={`font-bold text-on-background break-all ${mono ? 'font-mono' : ''}`}>
        {value && value.trim() ? value : '—'}
      </dd>
    </div>
  );
}
