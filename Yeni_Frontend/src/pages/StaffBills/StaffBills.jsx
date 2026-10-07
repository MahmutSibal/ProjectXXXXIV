import { useCallback, useEffect, useMemo, useState } from 'react';

import { billsApi, paymentsApi } from '../../api/orders.js';
import {
  OrderSessionStatus,
  OrderItemStatus,
  PaymentStatus,
  ORDER_ITEM_STATUS_LABEL,
  formatKurus,
} from '../../api/enums.js';
import { ApiError } from '../../api/client.js';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { parseApiDate } from '../../lib/date.js';
import { matchesSearch } from '../../lib/text.js';

/**
 * Personel adisyon ekranı (admin ve mutfak/garson panelleri için ortak).
 *
 * Backend notları (kodundan doğrulandı):
 *  - GET /bills/restaurant/{id} sayfalanmaz, süzgeç almaz; tüm adisyonlar düz dizi
 *    olarak gelir. Bu yüzden süzme, sıralama ve sayfalama istemcide yapılır.
 *  - Ödeme uçlarına kart bilgisi gönderilmezse tahsilat yapılmaz, adisyon "dışarıda
 *    ödendi" (nakit) sayılır; bu yalnızca personel içindir.
 *  - Ödeme uçları adisyonun oturum durumunu (Active/Closed) DEĞİŞTİRMEZ. Adisyonu
 *    kapatmak için ödemeden sonra ayrıca PUT /bills/{id} çağrılır.
 *  - /payments/split-equally her çağrıda TEK kişinin payını (kalan / kişi sayısı)
 *    tahsil eder; N kişilik bölüşmede çağrı kişi sayısı azaltılarak tekrarlanır.
 *  - /payments/custom-amount ve split-equally kalemlerin ödeme durumunu değiştirmez,
 *    yalnızca kalan tutarı düşer. Kalemleri "Ödendi" yapan tek uç specific-items'tır.
 */

const PAGE_SIZE_DEFAULT = 10;
const POLL_INTERVAL_MS = 30000;

const PAYMENT_STATUS_LABEL = {
  [PaymentStatus.Unpaid]: 'Ödenmedi',
  [PaymentStatus.Processing]: 'İşleniyor',
  [PaymentStatus.Paid]: 'Ödendi',
};

const PAYMENT_STATUS_STYLE = {
  [PaymentStatus.Unpaid]: 'bg-error-container text-on-error-container',
  [PaymentStatus.Processing]: 'bg-secondary-container text-on-secondary-container',
  [PaymentStatus.Paid]: 'bg-primary-container text-on-primary-container',
};

const FILTERS = [
  ['open', 'Açık'],
  ['closed', 'Kapalı'],
  ['all', 'Tümü'],
];

const INPUT_CLASS =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 px-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all';

/** Yerel (backend'e gitmeyen) doğrulama/akış hatası; mesajı kullanıcıya gösterilir. */
class ActionError extends Error {}

function errorText(err, fallback) {
  return err instanceof ApiError || err instanceof ActionError ? err.message : fallback;
}

/** "12,50" veya "12.50" -> 1250 kuruş. Geçersizse null. */
function tlToKurus(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized || !/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function kurusToTlInput(kurus) {
  return ((kurus ?? 0) / 100).toFixed(2).replace('.', ',');
}

function formatDateTime(value) {
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Backend'de "adet" alanı yok; her birim ayrı kalem. Görünümde aynı ad + fiyat
 * (+ aynı mutfak ve ödeme durumu, aksi hâlde satır yanıltıcı olurdu) olanlar
 * "xN" olarak gruplanır. Gruptaki gerçek kalem kimlikleri `items` içinde kalır.
 */
function groupItems(items) {
  const groups = [];
  const byKey = new Map();
  for (const item of items) {
    const key = `${item.name}__${item.price}__${item.status}__${item.paymentStatus}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      const group = {
        key,
        name: item.name,
        price: item.price,
        status: item.status,
        paymentStatus: item.paymentStatus,
        items: [item],
      };
      byKey.set(key, group);
      groups.push(group);
    }
  }
  return groups;
}

function sortBills(bills) {
  return [...bills].sort((a, b) => {
    const aOpen = a.sessionStatus === OrderSessionStatus.Active ? 0 : 1;
    const bOpen = b.sessionStatus === OrderSessionStatus.Active ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return parseApiDate(b.createdAt) - parseApiDate(a.createdAt);
  });
}

export default function StaffBills({ panelType = 'admin' }) {
  const toast = useToast();
  const { user } = useAuth();

  // Kalan tutarı elle değiştirme ve adisyon silme geri alınamaz finansal
  // müdahalelerdir; backend Garson/Mutfak'a da izin veriyor ama yalnızca işletme
  // sahibi panelinde sunuyoruz.
  const canManage = panelType === 'admin';

  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [filter, setFilter] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [modal, setModal] = useState(null); // { type, billId }

  const restaurantId = user?.restaurantId;

  const loadBills = useCallback(
    async ({ silent = false } = {}) => {
      if (!restaurantId) return;
      if (!silent) setIsRefreshing(true);
      try {
        const data = await billsApi.getByRestaurant(restaurantId);
        setBills(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        // Sessiz (otomatik) yenilemede mevcut listeyi bozma; hata yalnızca elle yenilemede gösterilir.
        if (!silent) setError(errorText(err, 'Adisyonlar yüklenemedi.'));
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [restaurantId],
  );

  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    loadBills().finally(() => setIsLoading(false));
  }, [restaurantId, loadBills]);

  // Müşteri QR'dan "Hesabı İste" dediğinde backend canlı yayın göndermiyor (yalnızca
  // sipariş oluşturma/durum değişimi yayınlanıyor), bu yüzden hafif bir yoklama yapılır.
  useEffect(() => {
    if (!restaurantId) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden && !modal) loadBills({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [restaurantId, loadBills, modal]);

  const filteredBills = useMemo(() => {
    const byStatus = bills.filter((bill) => {
      if (filter === 'open') return bill.sessionStatus === OrderSessionStatus.Active;
      if (filter === 'closed') return bill.sessionStatus === OrderSessionStatus.Closed;
      return true;
    });
    return sortBills(byStatus.filter((bill) => matchesSearch(`Masa ${bill.tableNo}`, searchTerm)));
  }, [bills, filter, searchTerm]);

  const openCount = useMemo(
    () => bills.filter((bill) => bill.sessionStatus === OrderSessionStatus.Active).length,
    [bills],
  );

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageBills = filteredBills.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const modalBill = modal ? bills.find((bill) => bill.id === modal.billId) : null;
  const closeModal = () => setModal(null);

  /**
   * İşlemi çalıştırır, sonucu toast ile bildirir ve listeyi tazeler.
   * Başarılıysa true döner (modal kapatma kararı çağıran tarafta).
   */
  const runAction = async (action, successMessage, fallbackError) => {
    setBusy(true);
    let succeeded = false;
    try {
      await action();
      succeeded = true;
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(errorText(err, fallbackError));
    } finally {
      // Kısmi başarıda (ör. ödeme alındı ama kapatma başarısız) ekran gerçeği göstersin.
      await loadBills({ silent: true });
      setBusy(false);
    }
    return succeeded;
  };

  const paidByUserId = user?.id;

  const requireUser = () => {
    if (!paidByUserId) throw new ActionError('Oturum bilgisi alınamadı. Sayfayı yenileyip tekrar deneyin.');
  };

  const handleCashClose = (bill) =>
    runAction(
      async () => {
        requireUser();
        if (bill.items.some((item) => item.paymentStatus === PaymentStatus.Processing)) {
          throw new ActionError('Ödemesi işlenen kalemler var. Birkaç saniye sonra tekrar deneyin.');
        }

        let remaining = bill.remainingAmount;
        const unpaidIds = bill.items
          .filter((item) => item.paymentStatus === PaymentStatus.Unpaid)
          .map((item) => item.orderItemId);

        // Kalan tutar zaten 0 ise (müşteri kartla ödemiş) yeni tahsilat kaydı açılmaz, yalnızca kapatılır.
        // Kalemleri "Ödendi" yapabilen tek uç specific-items; kart gönderilmediği için nakit sayılır.
        if (remaining > 0 && unpaidIds.length > 0) {
          const result = await paymentsApi.paySpecificItems({
            billId: bill.id,
            itemIds: unpaidIds,
            paidByUserId,
          });
          remaining = result.remainingAmount;
        }

        // Kalem toplamından fazla kalan tutar varsa (elle düzenlenmişse) artığı da tahsil et.
        if (remaining > 0) {
          const result = await paymentsApi.payCustomAmount({
            billId: bill.id,
            amount: remaining,
            paidByUserId,
          });
          remaining = result.remainingAmount;
        }

        // Ödeme uçları oturumu kapatmaz; adisyonu ayrıca kapat.
        await billsApi.update(bill.id, OrderSessionStatus.Closed, Math.max(0, remaining));
      },
      `Masa ${bill.tableNo} adisyonu kapatıldı.`,
      'Adisyon kapatılamadı.',
    );

  const handlePayItems = (bill, itemIds) =>
    runAction(
      async () => {
        requireUser();
        await paymentsApi.paySpecificItems({ billId: bill.id, itemIds, paidByUserId });
      },
      'Seçili kalemler ödendi olarak işlendi.',
      'Ödeme işlenemedi.',
    );

  const handlePayCustom = (bill, amount) =>
    runAction(
      async () => {
        requireUser();
        await paymentsApi.payCustomAmount({ billId: bill.id, amount, paidByUserId });
      },
      `${formatKurus(amount)} tahsilat işlendi.`,
      'Ödeme işlenemedi.',
    );

  // Her çağrı tek kişinin payını tahsil eder; sonucu (PaymentResultDto) döndürür.
  const handleSplitOne = async (bill, personCount) => {
    let result = null;
    const ok = await runAction(
      async () => {
        requireUser();
        result = await paymentsApi.splitEqually({
          billId: bill.id,
          personCount,
          paidByUserId,
        });
      },
      null,
      'Ödeme işlenemedi.',
    );
    if (ok && result) toast.success(`${formatKurus(result.paidAmount)} tahsil edildi.`);
    return ok ? result : null;
  };

  const handleEdit = (bill, sessionStatus, remainingAmount) =>
    runAction(
      () => billsApi.update(bill.id, sessionStatus, remainingAmount),
      'Adisyon güncellendi.',
      'Adisyon güncellenemedi.',
    );

  const handleDelete = (bill) =>
    runAction(() => billsApi.remove(bill.id), `Masa ${bill.tableNo} adisyonu silindi.`, 'Adisyon silinemedi.');

  // Gruptaki her birimin durumu ayrı istekle güncellenir. İstekler sıralı gönderilir:
  // backend her çağrıda adisyonu okuyup tamamen yazdığı için paralel istekler
  // birbirinin değişikliğini ezebilir.
  const handleItemStatus = (bill, group, status) =>
    runAction(
      async () => {
        for (const item of group.items) {
          await billsApi.updateItemStatus(bill.id, item.orderItemId, status);
        }
      },
      `${group.name} durumu güncellendi.`,
      'Kalem durumu güncellenemedi.',
    );

  return (
    <>
      <div className="max-w-[1400px] mx-auto flex flex-col gap-lg">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Adisyonlar</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {panelType === 'kitchen'
                ? 'Masaların adisyonlarını görüntüleyin, nakit tahsilatı işleyin ve hesabı kapatın.'
                : 'Restoranınızın adisyonlarını takip edin, nakit tahsilatı işleyin, hesapları kapatın veya düzenleyin.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBills()}
            disabled={isRefreshing || busy}
            className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            Yenile
          </button>
        </section>

        <section className="flex flex-col md:flex-row gap-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-sm"
              placeholder="Masa numarasına göre ara..."
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value);
                  setPage(1);
                }}
                className={
                  filter === value
                    ? 'px-5 py-3 rounded-xl font-label-md text-label-md bg-primary-container text-on-primary-container'
                    : 'px-5 py-3 rounded-xl font-label-md text-label-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors'
                }
              >
                {label}
                {value === 'open' && ` (${openCount})`}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-error font-body-md text-body-md">{error}</p>}

        {isLoading ? (
          <p className="text-on-surface-variant font-body-md text-body-md">Yükleniyor...</p>
        ) : filteredBills.length === 0 ? (
          <p className="text-on-surface-variant font-body-md text-body-md">
            {filter === 'open' ? 'Şu anda açık adisyon yok.' : 'Gösterilecek adisyon bulunamadı.'}
          </p>
        ) : (
          <section className="flex flex-col gap-md">
            {pageBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                busy={busy}
                canManage={canManage}
                onOpenModal={(type) => setModal({ type, billId: bill.id })}
                onItemStatus={(group, status) => handleItemStatus(bill, group, status)}
              />
            ))}

            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalCount={filteredBills.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              isLoading={busy}
            />
          </section>
        )}
      </div>

      {modal && modalBill && modal.type === 'cash' && (
        <ConfirmModal
          title={modalBill.remainingAmount > 0 ? 'Hesabı Nakit Kapat' : 'Hesabı Kapat'}
          description={
            modalBill.remainingAmount > 0
              ? `Masa ${modalBill.tableNo} adisyonu nakit/dışarıda ödendi olarak kapatılacak. Kart tahsilatı yapılmaz.`
              : `Masa ${modalBill.tableNo} adisyonunun tahsilatı tamamlanmış. Adisyon yalnızca kapatılacak.`
          }
          detail={`Tahsil edilecek tutar: ${formatKurus(modalBill.remainingAmount)}`}
          confirmLabel={modalBill.remainingAmount > 0 ? 'Nakit Kapat' : 'Hesabı Kapat'}
          busy={busy}
          onClose={closeModal}
          onConfirm={async () => {
            if (await handleCashClose(modalBill)) closeModal();
          }}
        />
      )}

      {modal && modalBill && modal.type === 'delete' && (
        <ConfirmModal
          title="Adisyonu Sil"
          description={`Masa ${modalBill.tableNo} adisyonu kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Sil"
          danger
          busy={busy}
          onClose={closeModal}
          onConfirm={async () => {
            if (await handleDelete(modalBill)) closeModal();
          }}
        />
      )}

      {modal && modalBill && modal.type === 'items' && (
        <PayItemsModal
          bill={modalBill}
          busy={busy}
          onClose={closeModal}
          onSubmit={async (itemIds) => {
            if (await handlePayItems(modalBill, itemIds)) closeModal();
          }}
        />
      )}

      {modal && modalBill && modal.type === 'custom' && (
        <CustomAmountModal
          bill={modalBill}
          busy={busy}
          onClose={closeModal}
          onSubmit={async (amount) => {
            if (await handlePayCustom(modalBill, amount)) closeModal();
          }}
        />
      )}

      {modal && modalBill && modal.type === 'split' && (
        <SplitModal
          bill={modalBill}
          busy={busy}
          onClose={closeModal}
          onPayOne={(personCount) => handleSplitOne(modalBill, personCount)}
        />
      )}

      {modal && modalBill && modal.type === 'edit' && (
        <EditBillModal
          bill={modalBill}
          busy={busy}
          onClose={closeModal}
          onSubmit={async (sessionStatus, remainingAmount) => {
            if (await handleEdit(modalBill, sessionStatus, remainingAmount)) closeModal();
          }}
        />
      )}
    </>
  );
}

function BillCard({ bill, busy, canManage, onOpenModal, onItemStatus }) {
  const isActive = bill.sessionStatus === OrderSessionStatus.Active;
  const groups = useMemo(() => groupItems(bill.items ?? []), [bill.items]);
  const paidCount = (bill.items ?? []).filter((item) => item.paymentStatus === PaymentStatus.Paid).length;
  const hasRemaining = bill.remainingAmount > 0;

  const actionClass =
    'flex items-center justify-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md ambient-shadow flex flex-col gap-md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-headline-md text-headline-md text-on-background">Masa {bill.tableNo}</h3>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-bold ${
              isActive
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {isActive ? 'Açık' : 'Kapalı'}
          </span>
          <span className="text-label-sm text-on-surface-variant">
            {paidCount}/{bill.items.length} kalem ödendi
          </span>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Oluşturulma: {formatDateTime(bill.createdAt)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Kalemler</p>

        {groups.length === 0 ? (
          <p className="font-body-md text-on-surface-variant">Bu adisyonda kalem yok.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-outline-variant">
            {groups.map((group) => {
              const quantity = group.items.length;
              const canChangeStatus = isActive && group.paymentStatus === PaymentStatus.Unpaid;
              return (
                <li
                  key={group.key}
                  className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 font-body-md text-on-background"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline-sm">
                      {quantity > 1 ? `${quantity}x ` : ''}
                      {group.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-bold ${
                        PAYMENT_STATUS_STYLE[group.paymentStatus] ?? 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {PAYMENT_STATUS_LABEL[group.paymentStatus] ?? group.paymentStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    {canChangeStatus ? (
                      <select
                        className="bg-surface-container-low border border-outline-variant rounded-lg py-1.5 px-2 text-label-md outline-none focus:border-primary-container disabled:opacity-60"
                        value={group.status}
                        disabled={busy}
                        onChange={(e) => onItemStatus(group, Number(e.target.value))}
                        aria-label={`${group.name} durumu`}
                      >
                        {Object.values(OrderItemStatus).map((value) => (
                          <option key={value} value={value}>
                            {ORDER_ITEM_STATUS_LABEL[value]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-label-sm text-on-surface-variant">
                        {ORDER_ITEM_STATUS_LABEL[group.status] ?? group.status}
                      </span>
                    )}
                    <span className="min-w-[96px] text-right">
                      {formatKurus(group.price * quantity)}
                      {quantity > 1 && (
                        <span className="block text-label-sm text-on-surface-variant">
                          {formatKurus(group.price)} / adet
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-md pt-2 border-t border-outline-variant">
        <div className="flex gap-lg flex-wrap">
          <p className="font-body-md text-on-surface-variant">
            Toplam: <span className="text-on-background font-headline-sm">{formatKurus(bill.totalAmount)}</span>
          </p>
          <p className="font-headline-sm text-headline-sm text-on-background">
            Kalan: <span className="text-primary-container">{formatKurus(bill.remainingAmount)}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isActive && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpenModal('cash')}
                className="bg-primary-container text-on-primary-container px-5 py-2 rounded-lg font-label-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                {hasRemaining ? 'Nakit Kapat' : 'Hesabı Kapat'}
              </button>
              <button type="button" disabled={busy || !hasRemaining} onClick={() => onOpenModal('items')} className={actionClass}>
                <span className="material-symbols-outlined text-[18px]">checklist</span>
                Kalemleri Öde
              </button>
              <button
                type="button"
                disabled={busy || !hasRemaining}
                onClick={() => onOpenModal('custom')}
                className={actionClass}
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Tutar Öde
              </button>
              <button
                type="button"
                disabled={busy || !hasRemaining}
                onClick={() => onOpenModal('split')}
                className={actionClass}
              >
                <span className="material-symbols-outlined text-[18px]">group</span>
                Eşit Böl
              </button>
            </>
          )}

          {canManage && (
            <>
              <button type="button" disabled={busy} onClick={() => onOpenModal('edit')} className={actionClass}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Düzenle
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpenModal('delete')}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-error text-error rounded-lg text-label-md font-label-md hover:bg-error-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Sil
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Modallar (AdminCategories modal kabuğuyla aynı görünüm)
 * ------------------------------------------------------------------------- */

function ModalShell({ title, subtitle, busy, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-md max-h-[90vh] flex flex-col rounded-xl shadow-xl border border-outline-variant overflow-hidden">
        <div className="p-md border-b border-outline-variant flex justify-between items-start">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary-container">{title}</h3>
            {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1 transition-colors disabled:opacity-50"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md flex flex-col gap-md overflow-y-auto">{children}</div>

        <div className="p-md bg-surface-container-low flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

function CancelButton({ onClose, busy, label = 'Vazgeç' }) {
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={busy}
      className="px-6 py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function SubmitButton({ onClick, busy, disabled = false, children, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`px-6 py-2.5 rounded-lg font-label-md text-label-md text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 ${
        danger ? 'bg-error' : 'bg-primary-container'
      }`}
    >
      {busy ? 'İşleniyor...' : children}
    </button>
  );
}

function ConfirmModal({ title, description, detail, confirmLabel, danger = false, busy, onClose, onConfirm }) {
  return (
    <ModalShell
      title={title}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} busy={busy} />
          <SubmitButton onClick={onConfirm} busy={busy} danger={danger}>
            {confirmLabel}
          </SubmitButton>
        </>
      }
    >
      <p className="font-body-md text-body-md text-on-background">{description}</p>
      {detail && <p className="font-headline-sm text-headline-sm text-on-background">{detail}</p>}
    </ModalShell>
  );
}

function PayItemsModal({ bill, busy, onClose, onSubmit }) {
  // Yalnızca ödenmemiş kalemler seçilebilir; aynı ad + fiyat "xN" olarak gruplanır
  // ve ne kadarının ödeneceği adet düğmeleriyle seçilir.
  const unpaidGroups = useMemo(() => {
    const groups = [];
    const byKey = new Map();
    for (const item of bill.items) {
      if (item.paymentStatus !== PaymentStatus.Unpaid) continue;
      const key = `${item.name}__${item.price}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        const group = { key, name: item.name, price: item.price, items: [item] };
        byKey.set(key, group);
        groups.push(group);
      }
    }
    return groups;
  }, [bill.items]);

  const [counts, setCounts] = useState({});

  const setCount = (key, next, max) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, Math.min(max, next)) }));

  const selectedIds = [];
  let selectedTotal = 0;
  for (const group of unpaidGroups) {
    const count = counts[group.key] ?? 0;
    group.items.slice(0, count).forEach((item) => selectedIds.push(item.orderItemId));
    selectedTotal += count * group.price;
  }

  const allSelected = unpaidGroups.length > 0 && unpaidGroups.every((g) => (counts[g.key] ?? 0) === g.items.length);
  const toggleAll = () =>
    setCounts(allSelected ? {} : Object.fromEntries(unpaidGroups.map((g) => [g.key, g.items.length])));

  return (
    <ModalShell
      title="Kalemleri Öde"
      subtitle={`Masa ${bill.tableNo} - ödenen kalemler nakit olarak işlenir.`}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} busy={busy} />
          <SubmitButton onClick={() => onSubmit(selectedIds)} busy={busy} disabled={selectedIds.length === 0}>
            {selectedIds.length > 0 ? `${formatKurus(selectedTotal)} Öde` : 'Öde'}
          </SubmitButton>
        </>
      }
    >
      {unpaidGroups.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">Ödenmemiş kalem yok.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={toggleAll}
            disabled={busy}
            className="self-start text-label-md font-label-md text-primary-container hover:underline disabled:opacity-50"
          >
            {allSelected ? 'Seçimi temizle' : 'Tümünü seç'}
          </button>

          <ul className="flex flex-col divide-y divide-outline-variant">
            {unpaidGroups.map((group) => {
              const max = group.items.length;
              const count = counts[group.key] ?? 0;
              return (
                <li key={group.key} className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-body-md text-on-background">{group.name}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {formatKurus(group.price)} / adet
                      {max > 1 ? ` - ${max} adet ödenmemiş` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || count <= 0}
                      onClick={() => setCount(group.key, count - 1, max)}
                      className="w-8 h-8 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container-low disabled:opacity-40"
                      aria-label="Azalt"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-6 text-center font-label-md">{count}</span>
                    <button
                      type="button"
                      disabled={busy || count >= max}
                      onClick={() => setCount(group.key, count + 1, max)}
                      className="w-8 h-8 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container-low disabled:opacity-40"
                      aria-label="Artır"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ModalShell>
  );
}

function CustomAmountModal({ bill, busy, onClose, onSubmit }) {
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = () => {
    const amount = tlToKurus(value);
    if (amount === null || amount <= 0) {
      setFormError('Geçerli bir tutar girin (örn. 150 veya 150,50).');
      return;
    }
    if (amount > bill.remainingAmount) {
      setFormError(`Tutar kalan tutarı (${formatKurus(bill.remainingAmount)}) aşamaz.`);
      return;
    }
    setFormError('');
    onSubmit(amount);
  };

  return (
    <ModalShell
      title="Tutar Öde"
      subtitle={`Masa ${bill.tableNo} - girilen tutar nakit olarak işlenir.`}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} busy={busy} />
          <SubmitButton onClick={handleSubmit} busy={busy}>
            Tahsil Et
          </SubmitButton>
        </>
      }
    >
      <p className="font-body-md text-on-surface-variant">
        Kalan tutar: <span className="text-on-background font-headline-sm">{formatKurus(bill.remainingAmount)}</span>
      </p>

      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md text-on-background">Tutar (TL)</label>
        <input
          className={INPUT_CLASS}
          type="text"
          inputMode="decimal"
          placeholder="Örn: 150,50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && handleSubmit()}
          autoFocus
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => setValue(kurusToTlInput(bill.remainingAmount))}
          className="self-start text-label-md font-label-md text-primary-container hover:underline disabled:opacity-50"
        >
          Kalan tutarın tamamı
        </button>
      </div>

      {formError && <p className="text-error font-body-sm text-body-sm">{formError}</p>}
    </ModalShell>
  );
}

function SplitModal({ bill, busy, onClose, onPayOne }) {
  const [people, setPeople] = useState(2);
  const [paidPeople, setPaidPeople] = useState(0);

  // Backend her çağrıda "kalan / kişi sayısı" kadar tahsil eder. Kalan kişi sayısı
  // her ödemeden sonra azaltıldığı için kalan paylar eşit çıkar; son kişi artığı öder.
  const safePeople = Math.max(1, Math.min(100, people));
  const share = Math.floor(bill.remainingAmount / safePeople);

  const handlePay = async () => {
    const result = await onPayOne(safePeople);
    if (!result) return;
    const nextPeople = safePeople - 1;
    if (nextPeople < 1 || result.remainingAmount <= 0) {
      onClose();
      return;
    }
    setPeople(nextPeople);
    setPaidPeople((count) => count + 1);
  };

  return (
    <ModalShell
      title="Eşit Böl"
      subtitle={`Masa ${bill.tableNo} - her tahsilatta bir kişinin payı nakit olarak işlenir.`}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} busy={busy} label="Kapat" />
          <SubmitButton onClick={handlePay} busy={busy} disabled={share <= 0}>
            {share > 0 ? `1 Kişinin Payını Tahsil Et (${formatKurus(share)})` : 'Tahsil Et'}
          </SubmitButton>
        </>
      }
    >
      <p className="font-body-md text-on-surface-variant">
        Kalan tutar: <span className="text-on-background font-headline-sm">{formatKurus(bill.remainingAmount)}</span>
      </p>

      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md text-on-background">
          {paidPeople > 0 ? 'Ödeme yapmayan kişi sayısı' : 'Kişi sayısı'}
        </label>
        <input
          className={INPUT_CLASS}
          type="number"
          min="1"
          max="100"
          value={people}
          disabled={busy || paidPeople > 0}
          onChange={(e) => setPeople(Number(e.target.value) || 1)}
        />
      </div>

      <p className="font-headline-sm text-headline-sm text-on-background">
        Kişi başı: <span className="text-primary-container">{formatKurus(share)}</span>
      </p>

      {paidPeople > 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {paidPeople} kişi ödedi. Kalan kişi sayısı otomatik azaltıldı.
        </p>
      )}
    </ModalShell>
  );
}

function EditBillModal({ bill, busy, onClose, onSubmit }) {
  const [sessionStatus, setSessionStatus] = useState(bill.sessionStatus);
  const [remaining, setRemaining] = useState(kurusToTlInput(bill.remainingAmount));
  const [formError, setFormError] = useState('');

  const handleSubmit = () => {
    const kurus = tlToKurus(remaining);
    if (kurus === null) {
      setFormError('Geçerli bir kalan tutar girin (0 veya daha büyük).');
      return;
    }
    setFormError('');
    onSubmit(sessionStatus, kurus);
  };

  return (
    <ModalShell
      title="Adisyonu Düzenle"
      subtitle={`Masa ${bill.tableNo} - bu değişiklik ödeme kaydı oluşturmaz, doğrudan adisyonu günceller.`}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} busy={busy} label="İptal" />
          <SubmitButton onClick={handleSubmit} busy={busy}>
            Güncelle
          </SubmitButton>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md text-on-background">Oturum Durumu</label>
        <select
          className={INPUT_CLASS}
          value={sessionStatus}
          disabled={busy}
          onChange={(e) => setSessionStatus(Number(e.target.value))}
        >
          <option value={OrderSessionStatus.Active}>Açık</option>
          <option value={OrderSessionStatus.Closed}>Kapalı</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md text-on-background">Kalan Tutar (TL)</label>
        <input
          className={INPUT_CLASS}
          type="text"
          inputMode="decimal"
          value={remaining}
          disabled={busy}
          onChange={(e) => setRemaining(e.target.value)}
        />
      </div>

      {formError && <p className="text-error font-body-sm text-body-sm">{formError}</p>}
    </ModalShell>
  );
}
