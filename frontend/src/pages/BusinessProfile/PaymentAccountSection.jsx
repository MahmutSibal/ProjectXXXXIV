import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { restaurantsApi } from '../../api/restaurants.js';
import { ApiError } from '../../api/client.js';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-4 text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none';

/** "TR12 0006 ..." biçiminde gösterir; kayıtta boşluklar sunucuda atılır. */
function formatIban(value) {
  const compact = value.replace(/\s+/g, '').toUpperCase().slice(0, 26);
  return compact.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * İşletmenin ödeme hesabı. Online ödeme altyapısı (PayTR) işletmeye para
 * aktarırken IBAN'ı ve hesap sahibini (işletme unvanı + ad soyad) ister.
 */
export default function PaymentAccountSection({ restaurantId, defaultBusinessName = '', defaultFullName = '' }) {
  const toast = useToast();
  const [form, setForm] = useState({
    iban: '',
    accountHolderBusinessName: '',
    accountHolderFullName: '',
    onlinePaymentEnabled: false,
  });
  const [cardPaymentsAvailable, setCardPaymentsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    restaurantsApi
      .getPaymentSettings(restaurantId)
      .then((data) => {
        setForm({
          iban: data.iban ?? '',
          // Henüz girilmediyse kayıttaki işletme adı ve sahibin adı önerilir;
          // bankadaki hesap sahibi farklıysa kullanıcı düzeltir.
          accountHolderBusinessName: data.accountHolderBusinessName || defaultBusinessName,
          accountHolderFullName: data.accountHolderFullName || defaultFullName,
          onlinePaymentEnabled: Boolean(data.onlinePaymentEnabled),
        });
        setCardPaymentsAvailable(Boolean(data.cardPaymentsAvailable && data.cardPaymentsAllowedByPlatform));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Ödeme bilgileri yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [restaurantId, defaultBusinessName, defaultFullName]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'iban' ? formatIban(value) : value,
    }));
  };

  const handleSave = async () => {
    setError('');
    const compactIban = form.iban.replace(/\s+/g, '');
    if (compactIban && !/^TR\d{24}$/.test(compactIban)) {
      setError('IBAN TR ile başlamalı ve 26 karakter olmalı.');
      return;
    }
    if (compactIban && (!form.accountHolderBusinessName.trim() || !form.accountHolderFullName.trim())) {
      setError('IBAN için işletme adı ve hesap sahibinin adı soyadı zorunludur.');
      return;
    }

    setIsSaving(true);
    try {
      await restaurantsApi.updatePaymentSettings(restaurantId, {
        onlinePaymentEnabled: form.onlinePaymentEnabled,
        iban: compactIban,
        accountHolderBusinessName: form.accountHolderBusinessName.trim(),
        accountHolderFullName: form.accountHolderFullName.trim(),
      });
      toast.success('Ödeme bilgileri kaydedildi.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ödeme bilgileri kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow">
      <h3 className="font-headline-sm text-headline-sm text-on-background mb-1">Ödeme ve IBAN Bilgileri</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-md">
        Online ödemeler bu hesaba aktarılır. Bilgiler bankadaki hesap kaydıyla birebir aynı olmalıdır.
      </p>

      {isLoading ? (
        <p className="text-body-sm text-on-surface-variant">Yükleniyor...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-label-sm text-on-surface-variant" htmlFor="iban">IBAN</label>
            <input
              id="iban"
              name="iban"
              value={form.iban}
              onChange={handleChange}
              className={`${inputClass} font-mono tracking-wide`}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              autoComplete="off"
              type="text"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant" htmlFor="accountHolderBusinessName">
              İşletme Adı (hesap sahibi)
            </label>
            <input
              id="accountHolderBusinessName"
              name="accountHolderBusinessName"
              value={form.accountHolderBusinessName}
              onChange={handleChange}
              className={inputClass}
              placeholder="Örn: Lezzet Gıda Ltd. Şti."
              maxLength={200}
              type="text"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant" htmlFor="accountHolderFullName">
              Ad Soyad (hesap sahibi)
            </label>
            <input
              id="accountHolderFullName"
              name="accountHolderFullName"
              value={form.accountHolderFullName}
              onChange={handleChange}
              className={inputClass}
              placeholder="Hesap sahibinin adı soyadı"
              maxLength={150}
              type="text"
            />
          </div>

          <label className="flex items-start gap-3 md:col-span-2">
            <input
              type="checkbox"
              name="onlinePaymentEnabled"
              checked={form.onlinePaymentEnabled}
              onChange={handleChange}
              disabled={!cardPaymentsAvailable}
              className="mt-1"
            />
            <span className="text-body-sm text-on-background">
              Masada kartla online ödeme alınsın
              {!cardPaymentsAvailable && (
                <span className="block text-[11px] text-on-surface-variant">
                  Online ödeme altyapısı henüz devrede değil; IBAN bilgilerinizi şimdiden kaydedebilirsiniz.
                </span>
              )}
            </span>
          </label>

          {error && (
            <p className="md:col-span-2 flex items-center gap-2 text-error text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSaving ? 'Kaydediliyor...' : 'Ödeme Bilgilerini Kaydet'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
