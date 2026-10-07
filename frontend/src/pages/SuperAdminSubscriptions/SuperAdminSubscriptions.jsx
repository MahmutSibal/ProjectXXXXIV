import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { restaurantsApi } from '../../api/restaurants.js';
import {
  subscriptionsApi,
  SubscriptionPlan,
  SubscriptionStatus,
  SUBSCRIPTION_STATUS_LABEL,
} from '../../api/subscriptions.js';
import { formatKurus } from '../../api/enums.js';
import { billingPeriodLabel } from '../../api/billing.js';
import { ApiError } from '../../api/client.js';

function statusClass(status) {
  if (status === SubscriptionStatus.Active) return 'bg-primary-container text-on-primary-container';
  if (status === SubscriptionStatus.Trialing) return 'bg-secondary-container text-on-secondary-container';
  if (status === SubscriptionStatus.PastDue) return 'bg-secondary-container text-on-secondary-container';
  return 'bg-error-container text-on-error-container';
}

export default function SuperAdminSubscriptions() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = () =>
    Promise.all([subscriptionsApi.getAll(), restaurantsApi.getAll()]).then(([subs, rests]) => {
      setSubscriptions(subs);
      setRestaurants(rests);
    });

  useEffect(() => {
    setIsLoading(true);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Abonelikler yüklenemedi.'))
      .finally(() => setIsLoading(false));
  }, []);

  const restaurantNameById = useMemo(
    () => Object.fromEntries(restaurants.map((restaurant) => [restaurant.id, restaurant.name])),
    [restaurants],
  );

  const filtered = useMemo(
    () => subscriptions.filter((s) => !statusFilter || String(s.status) === statusFilter),
    [subscriptions, statusFilter],
  );

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === SubscriptionStatus.Active).length;
    const trialing = subscriptions.filter((s) => s.status === SubscriptionStatus.Trialing).length;
    const lapsed = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.Expired || s.status === SubscriptionStatus.PastDue,
    ).length;
    // Aylık yinelenen gelir: yıllık abonelikler 12'ye bölünerek aylığa indirgenir.
    const mrr = subscriptions
      .filter((s) => s.status === SubscriptionStatus.Active)
      .reduce((sum, s) => sum + Math.round(s.pricePerPeriod / (s.billingPeriodMonths || 1)), 0);

    return { active, trialing, lapsed, mrr };
  }, [subscriptions]);

  const handleExtend = async (subscription) => {
    const monthsInput = window.prompt('Kaç ay uzatılsın?', '1');
    if (!monthsInput) return;

    const months = Number(monthsInput);
    if (!Number.isInteger(months) || months < 1) {
      toast.warning('Geçersiz ay sayısı.');
      return;
    }

    const amountInput = window.prompt('Tahsil edilen tutar (TL, boş bırakılırsa ödeme kaydı oluşturulmaz):', '');
    const recordedAmount = amountInput ? Math.round(Number(amountInput) * 100) : null;
    const note = window.prompt('Not (opsiyonel):', 'Havale ile tahsil edildi') ?? '';

    try {
      await subscriptionsApi.extend(subscription.restaurantId, {
        plan: subscription.plan === SubscriptionPlan.Trial ? SubscriptionPlan.Standard : subscription.plan,
        months,
        recordedAmount,
        note,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Abonelik uzatılamadı.');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Abonelikler</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Tüm işletmelerin abonelik durumunu izleyebilir, süre uzatabilir ve tahsilat kaydı girebilirsiniz.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <StatCard label="Aktif Abonelik" value={String(stats.active)} />
        <StatCard label="Deneme Sürümünde" value={String(stats.trialing)} />
        <StatCard label="Süresi Dolan / Geciken" value={String(stats.lapsed)} />
        <StatCard label="Aylık Yinelenen Gelir" value={formatKurus(stats.mrr)} highlight />
      </section>

      <div className="flex flex-col md:flex-row gap-md">
        <select
          className="bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 text-body-sm outline-none focus:border-primary-container md:w-64"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(SUBSCRIPTION_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl ambient-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md border-b border-outline-variant">
                <th className="py-4 px-6">İşletme</th>
                <th className="py-4 px-6">Paket</th>
                <th className="py-4 px-6">Durum</th>
                <th className="py-4 px-6">Dönem Bitişi</th>
                <th className="py-4 px-6">Tutar</th>
                <th className="py-4 px-6 text-right">İşlem</th>
              </tr>
            </thead>

            <tbody className="font-body-sm text-body-sm text-on-background">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-10 px-6 text-center text-on-surface-variant">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 px-6 text-center text-on-surface-variant">
                    Abonelik kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((subscription, index) => (
                  <tr
                    key={subscription.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      index !== filtered.length - 1 ? 'border-b border-outline-variant' : ''
                    }`}
                  >
                    <td className="py-4 px-6 font-medium">
                      {restaurantNameById[subscription.restaurantId] ?? subscription.restaurantId.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6">{subscription.planName}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${statusClass(subscription.status)}`}>
                        {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('tr-TR')}
                      {subscription.grantsAccess && (
                        <span className="text-on-surface-variant"> · {subscription.daysRemaining} gün</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {subscription.pricePerPeriod > 0
                        ? `${formatKurus(subscription.pricePerPeriod)} / ${billingPeriodLabel(subscription.billingPeriodMonths)}`
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleExtend(subscription)}
                        className="bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-opacity"
                      >
                        Süre Uzat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col justify-between h-[120px] border-t-2 border-t-primary-container">
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <p className={`font-headline-lg text-headline-lg ${highlight ? 'text-primary-container' : 'text-on-background'}`}>
        {value}
      </p>
    </div>
  );
}
