import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { billingProfileApi } from '../../api/billingProfile.js';
import { restaurantsApi } from '../../api/restaurants.js';
import { ApiError } from '../../api/client.js';

// Ad soyad, e-posta ve ülke SORULMAZ: ad ve e-posta işletme sahibinin hesabından,
// ülke "Türkiye" olarak sunucuda doldurulur. Telefon da kayıtta alındığı için
// yalnızca hesapta yoksa (eski hesaplar) sorulur.
const emptyForm = {
  phone: '',
  nationalId: '',
  mersisNumber: '',
  addressLine: '',
  city: '',
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
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }

    Promise.all([
      billingProfileApi.get(user.restaurantId),
      restaurantsApi.getById(user.restaurantId).catch(() => null),
    ])
      .then(([data, restaurant]) => {
        if (data) setProfile(data);
        // Kimlik numaraları maskeli geldiği için forma DOLDURULMAZ; boş bırakılırsa
        // sunucu mevcut değeri korur. Fatura adresi ilk kez giriliyorsa işletme
        // adresi önerilir.
        setForm({
          phone: '',
          nationalId: '',
          mersisNumber: '',
          addressLine: data?.addressLine || restaurant?.address || '',
          city: data?.city ?? '',
          postalCode: data?.postalCode ?? '',
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Fatura bilgileri yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, [user?.restaurantId]);

  // Telefon hesapta ya da kayıtlı fatura bilgisinde varsa yeniden sorulmaz.
  const needsPhone = !user?.phone && !profile?.phone;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const saved = await billingProfileApi.save(user.restaurantId, {
        ...form,
        // Boş gönderilen iletişim bilgileri sunucuda hesaptan doldurulur.
        phone: needsPhone ? form.phone : null,
      });
      setProfile(saved);
      setForm((previous) => ({ ...previous, phone: '', nationalId: '', mersisNumber: '' }));
      setSuccess('Fatura bilgileriniz kaydedildi.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi. Lütfen tekrar deneyin.');
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

      {error && (
        <div className="flex items-start gap-2 text-error">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="font-body-md text-body-md">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 text-primary-container">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <p className="font-body-md text-body-md">{success}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md"
      >
        <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">person</span>
          <p>
            Fatura <strong className="text-on-background">{profile?.contactName || user?.name}</strong> adına
            düzenlenir ve <strong className="text-on-background">{profile?.email || user?.email}</strong> adresine
            gönderilir. Bu bilgiler hesabınızdan alınır.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {needsPhone && (
            <Field label="Telefon" name="phone" type="tel" inputMode="tel" value={form.phone} onChange={handleChange}
              placeholder="05XX XXX XX XX" required />
          )}

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

          <Field label="İl" name="city" value={form.city} onChange={handleChange}
            placeholder="İstanbul" required />

          <Field label="Posta Kodu" name="postalCode" inputMode="numeric" value={form.postalCode}
            onChange={handleChange} placeholder="34710" required />
        </div>

        <Field label="Fatura Adresi" name="addressLine" value={form.addressLine} onChange={handleChange}
          placeholder="Mahalle, cadde, no / ilçe" required
          hint="İşletme adresinizle aynıysa değiştirmeniz gerekmez." />

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
