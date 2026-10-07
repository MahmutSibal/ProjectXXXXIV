import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { billingProfileApi } from '../../api/billingProfile.js';
import { ApiError } from '../../api/client.js';

const emptyForm = {
  contactName: '',
  email: '',
  phone: '',
  nationalId: '',
  mersisNumber: '',
  addressLine: '',
  city: '',
  country: 'Türkiye',
  postalCode: '',
};

function Field({ label, name, value, onChange, placeholder, required, hint, type = 'text', inputMode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-md text-label-md text-on-surface-variant">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>

      <input
        name={name}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
      />

      {hint && <span className="text-[11px] text-on-surface-variant opacity-80">{hint}</span>}
    </label>
  );
}

export default function AdminBilling() {
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    billingProfileApi
      .get(user.restaurantId)
      .then((data) => {
        if (cancelled || !data) return;
        setProfile(data);
        // Kimlik numaraları maskeli geldiği için forma DOLDURULMAZ; boş bırakılırsa
        // sunucu mevcut değeri korur.
        setForm({
          contactName: data.contactName ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          nationalId: '',
          mersisNumber: '',
          addressLine: data.addressLine ?? '',
          city: data.city ?? '',
          country: data.country ?? 'Türkiye',
          postalCode: data.postalCode ?? '',
        });
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Fatura bilgileri yüklenemedi.'))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [user?.restaurantId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const saved = await billingProfileApi.save(user.restaurantId, form);
      setProfile(saved);
      setForm((previous) => ({ ...previous, nationalId: '', mersisNumber: '' }));
      toast.success('Fatura bilgileriniz kaydedildi.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-[900px] mx-auto flex flex-col gap-lg">
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Fatura Bilgileri</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Abonelik faturanız bu bilgilerle düzenlenir. Eksik veya hatalı bilgi faturanın
          kesilememesine yol açar.
        </p>
      </section>

      {profile && !profile.isComplete && (
        <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-xl p-4">
          <span className="material-symbols-outlined">info</span>
          <p className="text-body-sm">Fatura bilgileriniz eksik. Lütfen tüm zorunlu alanları doldurun.</p>
        </div>
      )}

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Ad Soyad" name="contactName" value={form.contactName} onChange={handleChange}
            placeholder="Fatura muhatabının adı soyadı" required />

          <Field label="E-posta" name="email" type="email" value={form.email} onChange={handleChange}
            placeholder="fatura@isletmeniz.com" required />

          <Field label="Telefon" name="phone" type="tel" inputMode="tel" value={form.phone} onChange={handleChange}
            placeholder="05XX XXX XX XX" required />

          <Field
            label="T.C. Kimlik Numarası"
            name="nationalId"
            inputMode="numeric"
            value={form.nationalId}
            onChange={handleChange}
            placeholder={profile?.maskedNationalId ?? '11 haneli kimlik numarası'}
            required={!profile?.maskedNationalId}
            hint={profile?.maskedNationalId
              ? `Kayıtlı: ${profile.maskedNationalId} — değiştirmek istemiyorsanız boş bırakın.`
              : undefined}
          />

          <Field
            label="MERSİS Numarası"
            name="mersisNumber"
            inputMode="numeric"
            value={form.mersisNumber}
            onChange={handleChange}
            placeholder={profile?.maskedMersisNumber ?? '16 haneli (şahıs işletmesiyseniz boş bırakın)'}
            hint={profile?.maskedMersisNumber
              ? `Kayıtlı: ${profile.maskedMersisNumber} — değiştirmek istemiyorsanız boş bırakın.`
              : 'Şahıs işletmelerinde zorunlu değildir.'}
          />

          <Field label="Posta Kodu" name="postalCode" inputMode="numeric" value={form.postalCode}
            onChange={handleChange} placeholder="34710" required />

          <Field label="İl" name="city" value={form.city} onChange={handleChange}
            placeholder="İstanbul" required />

          <Field label="Ülke" name="country" value={form.country} onChange={handleChange}
            placeholder="Türkiye" required />
        </div>

        <Field label="Fatura Adresi" name="addressLine" value={form.addressLine} onChange={handleChange}
          placeholder="Mahalle, cadde, no / ilçe" required />

        <div className="flex items-center justify-between gap-md pt-2 border-t border-outline-variant">
          <p className="text-[11px] text-on-surface-variant opacity-80">
            Kimlik bilgileriniz yalnızca işletme sahibi ve platform yöneticisine açıktır;
            ekranlarda ve kayıtlarda maskeli gösterilir.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
