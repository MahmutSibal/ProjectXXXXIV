import { useState } from 'react';

/**
 * PayTR kart formu (pencere). Kart bilgileri bu bileşenden ÇIKMAZ: onSubmit'e verilir,
 * o da kartı doğrudan PayTR'ye gönderen submitCardToPayTr'ı çağırır. Sunucumuza kart
 * bilgisi gitmez.
 */
export default function CardPaymentDialog({ title, description, defaultBuyer, testMode, onSubmit, onCancel }) {
  const [buyer, setBuyer] = useState({
    fullName: defaultBuyer?.fullName ?? '',
    email: defaultBuyer?.email ?? '',
    phone: defaultBuyer?.phone ?? '',
    address: defaultBuyer?.address ?? '',
  });
  const [card, setCard] = useState({ holder: '', number: '', month: '', year: '', cvc: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    if (buyer.fullName.trim().length < 3) return 'Ad soyad girin.';
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(buyer.email.trim())) {
      return 'Geçerli bir e-posta girin (Türkçe karakter olmadan).';
    }
    if (buyer.phone.replace(/\D/g, '').length < 10) return 'Telefon numarasını eksiksiz girin.';
    if (buyer.address.trim().length < 5) return 'Adres girin.';
    if (card.holder.trim().length < 3) return 'Kart üzerindeki ismi girin.';
    if (card.number.replace(/\D/g, '').length < 15) return 'Kart numarasını eksiksiz girin.';
    if (!/^\d{1,2}$/.test(card.month) || Number(card.month) < 1 || Number(card.month) > 12) return 'Son kullanma ayı 1-12 arasında olmalı.';
    if (!/^\d{4}$/.test(card.year)) return 'Son kullanma yılını 4 haneli girin (örn. 2030).';
    if (!/^\d{3}$/.test(card.cvc)) return 'CVC 3 haneli olmalı.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(card, buyer);
      // Başarılıysa sayfa PayTR'ye geçer; buraya dönülmez.
    } catch (err) {
      setError(err?.message ?? 'Ödeme başlatılamadı.');
      setIsSubmitting(false);
    }
  };

  const input = 'bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-2xl ambient-shadow">
        <div className="bg-primary-container text-on-primary-container px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined">credit_card</span>
          <div>
            <p className="font-label-lg text-label-lg">{title}</p>
            {description && <p className="text-[11px] opacity-80">{description}</p>}
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <p className="text-[11px] text-on-surface-variant">Fatura ve iletişim bilgileri (PayTR zorunlu tutar)</p>
          <input className={input} placeholder="Ad Soyad" autoComplete="name" value={buyer.fullName}
            onChange={(e) => setBuyer((p) => ({ ...p, fullName: e.target.value }))} />
          <input className={input} placeholder="E-posta" type="email" autoComplete="email" value={buyer.email}
            onChange={(e) => setBuyer((p) => ({ ...p, email: e.target.value }))} />
          <input className={input} placeholder="Telefon" type="tel" autoComplete="tel" value={buyer.phone}
            onChange={(e) => setBuyer((p) => ({ ...p, phone: e.target.value }))} />
          <input className={input} placeholder="Adres" autoComplete="street-address" value={buyer.address}
            onChange={(e) => setBuyer((p) => ({ ...p, address: e.target.value }))} />

          <p className="text-[11px] text-on-surface-variant mt-2">Kart bilgileri</p>
          <input className={input} placeholder="Kart üzerindeki isim" autoComplete="cc-name" value={card.holder}
            onChange={(e) => setCard((p) => ({ ...p, holder: e.target.value }))} />
          <input className={input} placeholder="Kart numarası" inputMode="numeric" autoComplete="cc-number" maxLength={19}
            value={card.number} onChange={(e) => setCard((p) => ({ ...p, number: e.target.value }))} />
          <div className="grid grid-cols-3 gap-2">
            <input className={input} placeholder="Ay" inputMode="numeric" autoComplete="cc-exp-month" maxLength={2}
              value={card.month} onChange={(e) => setCard((p) => ({ ...p, month: e.target.value }))} />
            <input className={input} placeholder="Yıl" inputMode="numeric" autoComplete="cc-exp-year" maxLength={4}
              value={card.year} onChange={(e) => setCard((p) => ({ ...p, year: e.target.value }))} />
            <input className={input} placeholder="CVC" inputMode="numeric" autoComplete="cc-csc" maxLength={3}
              value={card.cvc} onChange={(e) => setCard((p) => ({ ...p, cvc: e.target.value }))} />
          </div>

          <p className="text-[11px] text-on-surface-variant">
            Kart bilgileriniz doğrudan PayTR güvenli ödeme sayfasına iletilir; Şükran App kart
            bilgilerinizi görmez ve saklamaz.
          </p>
          {testMode && <p className="text-[11px] text-error">Test modu: gerçek çekim yapılmaz.</p>}

          {error && (
            <div className="flex items-start gap-2 text-error text-body-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg disabled:opacity-50">
            {isSubmitting ? 'Güvenli ödemeye yönlendiriliyor...' : 'Öde'}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting}
            className="text-body-sm text-on-surface-variant hover:underline">
            Vazgeç
          </button>
        </div>
      </form>
    </div>
  );
}
