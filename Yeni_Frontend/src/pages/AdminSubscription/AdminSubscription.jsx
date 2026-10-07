import { parseApiDate } from '../../lib/date.js';
import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  subscriptionsApi,
  SubscriptionStatus,
  SUBSCRIPTION_STATUS_LABEL,
} from '../../api/subscriptions.js';
import { formatKurus } from '../../api/enums.js';
import { billingPeriodLabel } from '../../api/billing.js';
import { ApiError } from '../../api/client.js';
import { platformSettingsApi } from '../../api/platformSettings.js';
import IyzicoLogoBand from '../../components/IyzicoLogoBand.jsx';
import { restaurantsApi } from '../../api/restaurants.js';
import { supportApi } from '../../api/support.js';

const transferInputClass =
  'bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container';

function statusClass(status) {
  if (status === SubscriptionStatus.Active) return 'bg-primary-container text-on-primary-container';
  if (status === SubscriptionStatus.Trialing) return 'bg-secondary-container text-on-secondary-container';
  if (status === SubscriptionStatus.PastDue) return 'bg-secondary-container text-on-secondary-container';
  return 'bg-error-container text-on-error-container';
}

export default function AdminSubscription() {
  const toast = useToast();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingMonths, setBillingMonths] = useState(1);
  const [busyPlan, setBusyPlan] = useState(null);

  // Otomatik yenileme kartı. Kart numarası sunucuda saklanmaz; iyzico'ya
  // gönderilip dönen referanslar aboneliğe yazılır.
  const [card, setCard] = useState({ holder: '', number: '', month: '', year: '' });
  const [isSavingCard, setIsSavingCard] = useState(false);

  const handleSaveCard = async (event) => {
    event.preventDefault();

    const digits = card.number.replace(/\D/g, '');
    if (card.holder.trim().length < 3) {
      toast.warning('Kart üzerindeki ismi girin.');
      return;
    }
    if (digits.length < 15) {
      toast.warning('Kart numarasını eksiksiz girin.');
      return;
    }
    const month = Number(card.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      toast.warning('Son kullanma ayı 01-12 arasında olmalı.');
      return;
    }
    if (!/^\d{4}$/.test(card.year)) {
      toast.warning('Son kullanma yılını 4 haneli girin (örn. 2030).');
      return;
    }

    setIsSavingCard(true);
    try {
      const updated = await subscriptionsApi.saveCard(user.restaurantId, {
        cardHolderName: card.holder.trim(),
        cardNumber: digits,
        expiryMonth: month,
        expiryYear: Number(card.year),
      });

      setSubscription(updated);
      setCard({ holder: '', number: '', month: '', year: '' });
      toast.success('Kart kaydedildi. Dönem sonunda otomatik tahsilat yapılacak.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Kart kaydedilemedi.');
    } finally {
      setIsSavingCard(false);
    }
  };

  // Havale / EFT bilgileri (platform ayarı) ve ödeme bildirimi formu.
  const [bank, setBank] = useState(null);
  const [isBankLoading, setIsBankLoading] = useState(true);
  const [transfer, setTransfer] = useState({ amount: '', date: '', note: '' });
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);

  useEffect(() => {
    platformSettingsApi
      .getPayment()
      .then(setBank)
      .catch(() => setBank(null))
      .finally(() => setIsBankLoading(false));
  }, []);

  const handleCopyIban = async () => {
    const iban = bank?.iban ?? '';
    try {
      await navigator.clipboard.writeText(iban.replace(/\s/g, ''));
      toast.success('IBAN kopyalandı.');
    } catch {
      toast.error('IBAN kopyalanamadı. Lütfen elle seçip kopyalayın.');
    }
  };

  const handleSendTransfer = async (event) => {
    event.preventDefault();

    const amount = transfer.amount.trim();
    if (!amount || !(parseFloat(amount.replace(',', '.')) > 0)) {
      toast.warning('Geçerli bir tutar girin.');
      return;
    }
    if (!transfer.date) {
      toast.warning('Ödeme tarihini seçin.');
      return;
    }

    setIsSendingTransfer(true);
    try {
      const restaurant = await restaurantsApi.getById(user.restaurantId).catch(() => null);
      const businessName = restaurant?.name || user?.name || 'İşletme';
      const paymentDate = new Date(`${transfer.date}T00:00:00`).toLocaleDateString('tr-TR');
      const lines = [
        '[Havale/EFT bildirimi]',
        `Paket: ${subscription?.planName ?? '-'}`,
        `Tutar: ${amount} TL`,
        `Ödeme tarihi: ${paymentDate}`,
      ];
      if (transfer.note.trim()) lines.push(`Gönderen / not: ${transfer.note.trim()}`);

      await supportApi.create({
        businessName,
        content: lines.join(' | '),
        phone: '',
        restaurantId: user.restaurantId,
      });

      setTransfer({ amount: '', date: '', note: '' });
      toast.success('Ödeme bildiriminiz alındı. Ekibimiz en kısa sürede kontrol edecek.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ödeme bildirimi gönderilemedi.');
    } finally {
      setIsSendingTransfer(false);
    }
  };

  const load = () =>
    Promise.all([
      subscriptionsApi.getByRestaurant(user.restaurantId).catch(() => null),
      subscriptionsApi.getPlans(),
    ]).then(([subscriptionData, plansData]) => {
      setSubscription(subscriptionData);
      setPlans(plansData);
    });

  useEffect(() => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Abonelik bilgisi yüklenemedi.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.restaurantId]);

  const handleSelectPlan = async (plan) => {
    const label = billingMonths === 12 ? 'yıllık' : 'aylık';
    if (!window.confirm(`${plan.displayName} paketine ${label} olarak geçmek istediğinize emin misiniz?`)) return;

    setBusyPlan(plan.plan);
    try {
      // Kart bilgisi gönderilmezse ödeme dışarıda alınmış sayılır (havale/elden).
      await subscriptionsApi.changePlan(user.restaurantId, {
        plan: plan.plan,
        billingPeriodMonths: billingMonths,
      });
      await load();
      toast.success('Paketiniz güncellendi.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Paket değiştirilemedi.');
    } finally {
      setBusyPlan(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Aboneliğinizi iptal etmek istediğinize emin misiniz? Ödemesi yapılmış dönem sonuna kadar hizmet devam eder.')) return;

    try {
      await subscriptionsApi.cancel(user.restaurantId);
      await load();
      toast.success('Aboneliğiniz iptal edildi.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Abonelik iptal edilemedi.');
    }
  };

  if (isLoading) {
    return <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Aboneliğim</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Paketinizi görüntüleyebilir, yükseltebilir veya aboneliğinizi yönetebilirsiniz.
        </p>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      {subscription && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
          <div className="flex flex-wrap items-start justify-between gap-md">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-headline-sm text-headline-sm text-on-background">{subscription.planName}</h3>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusClass(subscription.status)}`}>
                  {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {subscription.status === SubscriptionStatus.Trialing
                  ? `Deneme süreniz ${subscription.daysRemaining} gün sonra bitiyor.`
                  : subscription.isCancelledButStillActive
                  ? `Aboneliğiniz iptal edildi. Hizmet ${parseApiDate(subscription.currentPeriodEnd).toLocaleDateString('tr-TR')} tarihine kadar devam edecek; sonrasında yenileme yapılmayacak.`
                  : subscription.status === SubscriptionStatus.PastDue
                  ? `Ödemeniz alınamadı. Hizmetiniz ${subscription.graceEndsAt ? parseApiDate(subscription.graceEndsAt).toLocaleDateString('tr-TR') : ''} tarihine kadar açık kalacak.`
                  : subscription.grantsAccess
                  ? `Dönem bitişi: ${parseApiDate(subscription.currentPeriodEnd).toLocaleDateString('tr-TR')} (${subscription.daysRemaining} gün kaldı)`
                  : 'Hizmet erişiminiz kapalı. Devam etmek için bir paket seçin.'}
              </p>

              {subscription.lastPaymentError && subscription.status === SubscriptionStatus.PastDue && (
                <p className="text-body-sm text-error mt-1">
                  Son hata: {subscription.lastPaymentError}
                  {subscription.paymentFailureCount > 1 && ` (${subscription.paymentFailureCount}. deneme)`}
                </p>
              )}
            </div>

            {subscription.pricePerPeriod > 0 && (
              <div className="text-right">
                <p className="font-headline-sm text-headline-sm text-primary-container">
                  {formatKurus(subscription.pricePerPeriod)}
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  / {billingPeriodLabel(subscription.billingPeriodMonths)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-outline-variant">
            <Feature label="Masa Limiti" value={subscription.maxTables ? `${subscription.maxTables} masa` : 'Sınırsız'} />
            <Feature label="Mutfak/Garson Paneli" value={subscription.hasStaffPanels ? 'Var' : 'Yok'} />
            <Feature label="Detaylı Rapor" value={subscription.hasDetailedReports ? 'Var' : 'Yok'} />
            <Feature label="Etkinlik Panosu" value={subscription.hasEvents ? 'Var' : 'Yok'} />
          </div>

          {/* Deneme sürümünde de iptal edilebilmeli: kullanıcı ücretlendirilmeden
              çıkabilmelidir. Yalnızca zaten iptal edilmiş aboneliklerde gizlenir. */}
          {subscription.status !== SubscriptionStatus.Cancelled && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="text-label-md text-error hover:underline"
              >
                Aboneliği iptal et
              </button>
            </div>
          )}
        </section>
      )}

      {subscription && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-background mb-1">Ödeme Yöntemi</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Dönem sonunda ücret bu karttan otomatik tahsil edilir. Kart bilgileriniz
              bizde saklanmaz; ödeme altyapısında (iyzico) tutulur.
            </p>
          </div>

          {subscription.paymentMethodLast4 ? (
            <div className="flex flex-wrap items-center gap-3 bg-surface-container-low rounded-lg p-3">
              <span className="material-symbols-outlined text-primary-container">credit_card</span>
              <span className="font-label-lg text-label-lg text-on-background">
                •••• •••• •••• {subscription.paymentMethodLast4}
              </span>
              {subscription.paymentMethodBrand && (
                <span className="text-body-sm text-on-surface-variant">{subscription.paymentMethodBrand}</span>
              )}
              <span
                className={`ml-auto px-3 py-1 rounded-full text-[11px] font-bold ${
                  subscription.autoRenew
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {subscription.autoRenew ? 'Otomatik yenileme açık' : 'Otomatik yenileme kapalı'}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg p-3">
              <span className="material-symbols-outlined">info</span>
              <p className="text-body-sm">
                Kayıtlı kart yok. Kart tanımlamazsanız dönem sonunda tahsilat yapılamaz ve
                hizmetiniz duraklar.
              </p>
            </div>
          )}

          <IyzicoLogoBand variant="colored" width={300} className="mb-md" />

          <form onSubmit={handleSaveCard} className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="font-label-md text-label-md text-on-surface-variant">Kart Üzerindeki İsim</span>
              <input
                type="text"
                autoComplete="cc-name"
                value={card.holder}
                onChange={(event) => setCard((prev) => ({ ...prev, holder: event.target.value }))}
                placeholder="Ad Soyad"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
            </label>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="font-label-md text-label-md text-on-surface-variant">Kart Numarası</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                maxLength={19}
                value={card.number}
                onChange={(event) => setCard((prev) => ({ ...prev, number: event.target.value }))}
                placeholder={subscription.paymentMethodLast4 ? 'Değiştirmek için yeni kartı girin' : '•••• •••• •••• ••••'}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">Son Kullanma Ayı</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                autoComplete="cc-exp-month"
                value={card.month}
                onChange={(event) => setCard((prev) => ({ ...prev, month: event.target.value }))}
                placeholder="12"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface-variant">Son Kullanma Yılı</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                autoComplete="cc-exp-year"
                value={card.year}
                onChange={(event) => setCard((prev) => ({ ...prev, year: event.target.value }))}
                placeholder="2030"
                className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 px-3 text-body-md outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-between gap-md">
              <p className="text-[11px] text-on-surface-variant opacity-80">
                Kart tanımlarken tahsilat yapılmaz. İlk ücret dönem sonunda alınır.
              </p>

              <button
                type="submit"
                disabled={isSavingCard}
                className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSavingCard ? 'Kaydediliyor...' : subscription.paymentMethodLast4 ? 'Kartı Değiştir' : 'Kartı Kaydet'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Süper Admin havale/EFT'yi kapattığında ya da bilgi girilmediğinde API boş döner; kart hiç görünmez. */}
      {!isBankLoading && bank?.isConfigured && (
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-background mb-1">Havale / EFT ile Öde</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Abonelik ücretini banka havalesi veya EFT ile de ödeyebilirsiniz. Ödemeyi yaptıktan sonra aşağıdan
            bildirim gönderin.
          </p>
        </div>

        {(
          <>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface-container-low rounded-lg p-3">
              <div>
                <dt className="text-label-sm text-on-surface-variant">Banka</dt>
                <dd className="font-bold text-on-background">{bank.bankName}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-on-surface-variant">Hesap Sahibi</dt>
                <dd className="font-bold text-on-background">{bank.accountHolder}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-label-sm text-on-surface-variant">IBAN</dt>
                <dd className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-bold text-on-background break-all">{bank.iban}</span>
                  <button
                    type="button"
                    onClick={handleCopyIban}
                    className="inline-flex items-center gap-1 border border-primary-container text-primary-container font-label-md text-label-md px-3 py-1 rounded-lg hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    Kopyala
                  </button>
                </dd>
              </div>
              {bank.branch && (
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Şube</dt>
                  <dd className="font-bold text-on-background">{bank.branch}</dd>
                </div>
              )}
            </dl>

            {bank.paymentNote && (
              <div className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-lg p-3">
                <span className="material-symbols-outlined">info</span>
                <p className="text-body-sm">{bank.paymentNote}</p>
              </div>
            )}

            <form
              onSubmit={handleSendTransfer}
              className="grid grid-cols-1 md:grid-cols-2 gap-md pt-md border-t border-outline-variant"
            >
              <h4 className="md:col-span-2 font-label-lg text-label-lg text-on-background">
                Ödeme bildirimi gönder
              </h4>

              <label className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface-variant">Tutar (TL)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transfer.amount}
                  onChange={(event) => setTransfer((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="Örn: 1490"
                  className={transferInputClass}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface-variant">Ödeme Tarihi</span>
                <input
                  type="date"
                  value={transfer.date}
                  onChange={(event) => setTransfer((prev) => ({ ...prev, date: event.target.value }))}
                  className={transferInputClass}
                />
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="font-label-md text-label-md text-on-surface-variant">Gönderen Adı / Not</span>
                <input
                  type="text"
                  maxLength={300}
                  value={transfer.note}
                  onChange={(event) => setTransfer((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Havaleyi yapan kişi veya ek açıklama"
                  className={transferInputClass}
                />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingTransfer}
                  className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSendingTransfer ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
      )}

      <section className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h3 className="font-headline-sm text-headline-sm text-on-background">Paketler</h3>

          <div className="flex bg-surface-container rounded-lg p-1">
            <button
              type="button"
              onClick={() => setBillingMonths(1)}
              className={`px-4 py-1.5 rounded-md font-label-sm text-label-sm transition-colors ${
                billingMonths === 1 ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
              }`}
            >
              Aylık
            </button>
            <button
              type="button"
              onClick={() => setBillingMonths(12)}
              className={`px-4 py-1.5 rounded-md font-label-sm text-label-sm transition-colors ${
                billingMonths === 12 ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
              }`}
            >
              Yıllık · {'%'}{plans[0]?.annualDiscountPercent ?? 10} indirim
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.plan;
            // Tutarlar backend'de hesaplanır; burada çarpma/indirim yapılmaz.
            const price = billingMonths === 12 ? plan.annualTotal : plan.monthlyTotal;
            const isAnnual = billingMonths === 12;

            return (
              <div
                key={plan.plan}
                className={`bg-surface-container-lowest border rounded-xl p-md ambient-shadow flex flex-col gap-md ${
                  isCurrent ? 'border-primary-container' : 'border-outline-variant'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-headline-sm text-headline-sm text-on-background">{plan.displayName}</h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-container text-on-primary-container">
                        MEVCUT
                      </span>
                    )}
                  </div>
                  {plan.isQuoteOnly ? (
                    <p className="font-headline-md text-headline-md text-primary-container">Özel Teklif</p>
                  ) : (
                    <>
                      <p className="font-headline-md text-headline-md text-primary-container">
                        {formatKurus(price)}
                        <span className="text-body-sm text-on-surface-variant"> / {isAnnual ? 'yıl' : 'ay'}</span>
                      </p>

                      {isAnnual && plan.annualSavings > 0 && (
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          <s>{formatKurus(plan.annualListTotal)}</s> · %{plan.annualDiscountPercent} indirim,{' '}
                          {formatKurus(plan.annualSavings)} kazanç
                        </p>
                      )}
                    </>
                  )}

                  <p className="text-[11px] text-on-surface-variant mt-1">{plan.summary}</p>
                </div>

                <ul className="flex flex-col gap-2 text-body-sm">
                  <PlanFeature ok={plan.features.hasQrMenu}>QR menü</PlanFeature>
                  <PlanFeature ok={plan.features.hasOrdering}>
                    {plan.features.hasOrdering
                      ? plan.features.maxQrOrdersPerPeriod
                        ? `Sipariş sistemi (dönem başına ${plan.features.maxQrOrdersPerPeriod.toLocaleString('tr-TR')} sipariş)`
                        : 'Sipariş sistemi (sınırsız)'
                      : 'Sipariş sistemi yok'}
                  </PlanFeature>
                  <PlanFeature ok={plan.features.hasStaffPanels}>
                    {plan.features.maxKitchenPanels === null
                      ? 'Tüm mutfak ve garson panelleri'
                      : plan.features.maxKitchenPanels > 0
                        ? `${plan.features.maxKitchenPanels} mutfak + ${plan.features.maxWaiterPanels} garson paneli`
                        : 'Mutfak ve garson paneli yok'}
                  </PlanFeature>
                  <PlanFeature ok={plan.features.hasDetailedReports}>Detaylı raporlama</PlanFeature>
                  <PlanFeature ok={plan.features.hasEvents}>Etkinlik panosu</PlanFeature>
                  {plan.allowsTrial && (
                    <PlanFeature ok>{plan.trialDays} gün ücretsiz deneme</PlanFeature>
                  )}
                </ul>

                {plan.isQuoteOnly ? (
                  <a
                    href="/iletisim"
                    className="mt-auto w-full text-center border border-outline-variant font-label-md text-label-md py-3 rounded-lg hover:bg-surface-container-high transition-colors"
                  >
                    İletişime Geç
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={busyPlan === plan.plan}
                    className="mt-auto w-full bg-primary-container text-on-primary-container font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {busyPlan === plan.plan ? 'İşleniyor...' : isCurrent ? 'Süreyi Uzat' : 'Bu Pakete Geç'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-on-surface-variant">
          Kartla otomatik tahsilat henüz devrede değil; paket seçiminiz kaydedilir ve ödeme
          bilgileri için ekibimiz sizinle iletişime geçer.
        </p>
      </section>
    </div>
  );
}

function Feature({ label, value }) {
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="font-label-md text-label-md text-on-background">{value}</p>
    </div>
  );
}

function PlanFeature({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? 'text-on-background' : 'text-on-surface-variant line-through opacity-60'}`}>
      <span className="material-symbols-outlined text-[18px]">{ok ? 'check_circle' : 'cancel'}</span>
      {children}
    </li>
  );
}
