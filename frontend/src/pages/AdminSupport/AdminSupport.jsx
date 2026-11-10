import { useState } from 'react';
import { supportApi } from '../../api/support.js';
import { useAuth } from '../../context/AuthContext.jsx';

const topics = [
  'QR Menü ve Masalar',
  'Kategori ve Ürün Yönetimi',
  'Siparişler ve Mutfak Paneli',
  'Personel ve Panel Erişimi',
  'Abonelik ve Faturalama',
  'Diğer',
];

const fieldClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-background outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20';

export default function AdminSupport() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const businessName = String(fields.get('businessName') ?? '').trim();
    const phone = String(fields.get('phone') ?? '').trim();
    const topic = String(fields.get('topic') ?? '');
    const message = String(fields.get('message') ?? '').trim();

    if (!businessName || phone.replace(/\D/g, '').length < 10 || !topics.includes(topic) || message.length < 10) {
      setFeedback({
        type: 'error',
        message: 'İşletme adını, geçerli bir telefon numarasını ve konuyu girin. Açıklama en az 10 karakter olmalı.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await supportApi.create({
        restaurantId: user?.restaurantId,
        businessName,
        phone,
        topic,
        content: message,
      });

      form.reset();
      setFeedback({
        type: 'success',
        message: 'Destek talebiniz alındı. Ekibimiz en kısa sürede sizinle iletişime geçecek.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Talep kaydedilemedi. Lütfen tekrar deneyin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-lg">
      <header>
        <h2 className="mb-2 font-headline-lg text-headline-lg text-on-background">
          Destek
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Şükran App işletme paneliyle ilgili destek talebi oluşturun.
        </p>
      </header>

      <div className="grid items-start gap-md lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md ambient-shadow">
          <div className="mb-md flex items-center gap-3">
            <span
              aria-hidden="true"
              className="material-symbols-outlined rounded-full bg-surface-container p-3 text-primary-container"
            >
              support_agent
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">
              Yeni Destek Talebi
            </h3>
          </div>

          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            <fieldset disabled={isSubmitting} className="grid min-w-0 gap-md sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-2 font-label-md text-label-md text-on-background">
                İşletme Adı
                <input
                  name="businessName"
                  className={fieldClass}
                  placeholder="İşletmenizin adı"
                  autoComplete="organization"
                  maxLength={120}
                  required
                />
              </label>

              <label className="flex min-w-0 flex-col gap-2 font-label-md text-label-md text-on-background">
                Geri Dönüş Telefonu
                <input
                  name="phone"
                  type="tel"
                  className={fieldClass}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                  maxLength={24}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 font-label-md text-label-md text-on-background sm:col-span-2">
                Konu
                <select name="topic" defaultValue="" className={fieldClass} required>
                  <option value="" disabled>Konu seçin</option>
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 font-label-md text-label-md text-on-background sm:col-span-2">
                Açıklama
                <textarea
                  name="message"
                  className={`${fieldClass} resize-y`}
                  placeholder="Hangi ekranda, hangi işlem sırasında sorun yaşadığınızı açıklayın."
                  rows={5}
                  minLength={10}
                  maxLength={1500}
                  required
                />
              </label>
            </fieldset>

            {feedback && (
              <p
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className={`rounded-lg bg-surface-container-low px-4 py-3 ${
                  feedback.type === 'error' ? 'text-error' : 'text-primary-container'
                }`}
              >
                {feedback.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary-container px-5 py-3 font-label-lg text-label-lg text-on-primary-container hover:opacity-90 disabled:opacity-60"
            >
              <span aria-hidden="true" className="material-symbols-outlined">send</span>
              {isSubmitting ? 'Kaydediliyor…' : 'Destek Talebi Oluştur'}
            </button>
          </form>
        </section>

        <aside className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <h3 className="mb-3 border-l-4 border-secondary-container pl-3 font-headline-sm text-headline-sm text-on-background">
            Talebinize Ne Eklemelisiniz?
          </h3>
          <ul className="list-disc space-y-2 pl-5 font-body-md text-body-md text-on-surface-variant">
            <li>QR menü sorunları için masa numarasını belirtin.</li>
            <li>Sipariş sorunları için varsa sipariş numarasını yazın.</li>
            <li>Ekranda bir hata mesajı görüyorsanız metnini ekleyin.</li>
          </ul>
          <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
            Şifre veya kart bilgisi paylaşmayın. Talepleriniz platform yöneticisine iletilir.
          </p>
        </aside>
      </div>
    </div>
  );
}