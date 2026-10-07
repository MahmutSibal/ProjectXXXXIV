import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getCustomerSession } from '../../api/customerClient.js';
import {
  customerMenuApi,
  customerOrdersApi,
  customerBillsApi,
  customerCardsApi,
  customerPaymentsApi,
} from '../../api/customer.js';
import { OrderSessionStatus, formatKurus } from '../../api/enums.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';

import './OrderBill.css';
import IyzicoLogoBand from '../../components/IyzicoLogoBand.jsx';

// "Hesap garsona iletildi" durumu sayfa yenilense de korunsun diye sessionStorage'da tutulur.
// Depo kapalı/erişilemezse sessizce yok sayılır (durum yalnızca bileşen state'inde kalır).
function sentBillKey(restaurantId, tableNo, session) {
  return `sukran_bill_sent:${restaurantId}:${tableNo}:${session?.tableSessionId ?? ''}`;
}

function readSentBill(key) {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.total === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

function writeSentBill(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // yok say
  }
}

/**
 * "Hesap İste" adımı — eski CustomerMenu.jsx'teki BillTab'ın karşılığı.
 * Yeni tasarımda ayrı bir sekme yerine tek, küçük bir sayfa olarak eklendi
 * (OrderSuccess'ten "Hesabı İste" bağlantısıyla ulaşılır).
 *
 * Akış, eski BillTab ile birebir aynı:
 *  1. Masanın açık siparişlerindeki kalemler listelenir.
 *  2. "Hesabı İste" -> customerBillsApi.create(...) bir hesap (bill) açar.
 *  3. Kart bilgileri girilir -> customerCardsApi.create(...) kart kaydedilir
 *     (kart numarası sunucuda saklanmaz).
 *  4. customerPaymentsApi.splitEqually(...) tek kişilik tam ödeme yapar.
 */
export default function OrderBill() {
  const { restaurantId, tableNo } = useParams();

  const session = getCustomerSession();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const [card, setCard] = useState({ holder: '', number: '', month: '', year: '', cvc: '' });

  // Online kart ödemesi restoran bazında opt-in; yanıt alınamazsa kapalı say (fail closed).
  const [onlinePayment, setOnlinePayment] = useState(false);
  // Online ödeme kapalıyken hesap garsona iletildiyse (aynı oturumda) bilgi burada tutulur.
  const [sentBill, setSentBill] = useState(() => readSentBill(sentBillKey(restaurantId, tableNo, session)));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const ordersPromise = customerOrdersApi
      .getByRestaurant(restaurantId, {
        tableNo: Number(tableNo),
        sessionStatus: OrderSessionStatus.Active,
        pageSize: MAX_PAGE_SIZE,
      })
      .then((data) => {
        if (!cancelled) setOrders(toPage(data).items);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Sipariş bilgisi alınamadı.');
      });

    const onlinePaymentPromise = customerMenuApi
      .getOnlinePayment(restaurantId)
      .then((data) => data?.enabled === true)
      .catch(() => false)
      .then((enabled) => {
        if (!cancelled) setOnlinePayment(enabled);
      });

    Promise.all([ordersPromise, onlinePaymentPromise]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, tableNo]);

  const allItems = useMemo(() => orders.flatMap((order) => order.items), [orders]);
  const total = allItems.reduce((sum, item) => sum + item.price, 0);

  // Aynı tutarda hesap zaten iletildiyse tekrar hesap açma; yeni kalem eklenmişse (tutar değişti) yeniden istenebilir.
  const billSent = !onlinePayment && sentBill !== null && sentBill.total === total;

  const handleRequestBill = async () => {
    if (allItems.length === 0 || !session?.tableSessionId || billSent) return;
    setIsProcessing(true);
    setError('');
    try {
      // Backend yanıtının tam şekli doğrulanmalı: eski BillTab dönüş
      // değerini doğrudan hesap id'si olarak kullanıyordu
      // (`const billId = await customerBillsApi.create(...)`). Burada aynı
      // varsayım korunuyor, ama olası bir { id } nesnesini de kabul ediyoruz.
      const result = await customerBillsApi.create({
        restaurantId,
        tableNo: Number(tableNo),
        tableSessionId: session.tableSessionId,
        qrToken: session.qrToken,
        items: allItems.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          orderedBy: item.orderedBy,
          status: item.status,
          paymentStatus: item.paymentStatus,
        })),
      });
      const billId = (result && typeof result === 'object') ? (result.id ?? result.billId) : result;
      if (onlinePayment) {
        setBill({ id: billId, remainingAmount: total });
      } else {
        // Online ödeme kapalı: kart formu hiç açılmaz, hesap yalnızca garsona iletilir.
        const next = { billId, total };
        writeSentBill(sentBillKey(restaurantId, tableNo, session), next);
        setSentBill(next);
      }
    } catch (err) {
      setError(err.message ?? 'Hesap oluşturulamadı.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!onlinePayment || !bill) return;

    const digits = card.number.replace(/\D/g, '');
    if (digits.length < 15) {
      setError('Kart numarasını eksiksiz girin.');
      return;
    }
    if (!/^\d{2}$/.test(card.month) || Number(card.month) < 1 || Number(card.month) > 12) {
      setError('Son kullanma ayı 01-12 arasında olmalı.');
      return;
    }
    if (!/^\d{4}$/.test(card.year)) {
      setError('Son kullanma yılını 4 haneli girin (örn. 2030).');
      return;
    }
    if (!/^\d{3,4}$/.test(card.cvc)) {
      setError('CVC 3 veya 4 haneli olmalı.');
      return;
    }
    if (card.holder.trim().length < 3) {
      setError('Kart üzerindeki ismi girin.');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const saved = await customerCardsApi.create({
        cardholderName: card.holder.trim(),
        cardNumber: digits,
        expiryMonth: Number(card.month),
        expiryYear: Number(card.year),
        cvv: card.cvc,
        isDefault: false,
      });

      await customerPaymentsApi.splitEqually({
        billId: bill.id,
        personCount: 1,
        paidByUserId: session.tableSessionId,
        customerCardId: saved.id,
        cardNumber: digits,
        cvc: card.cvc,
      });
      setPaid(true);
    } catch (err) {
      setError(err.message ?? 'Ödeme işlemi başarısız oldu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="bill-page">
      <header className="bill-header">
        <Link to={`/menu/${restaurantId}/${tableNo}`} aria-label="Menüye dön">
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </Link>

        <div>
          <span>Masa {tableNo}</span>
          <h1>Hesabım</h1>
        </div>
      </header>

      <div className="bill-content">
        {isLoading && <p className="bill-empty">Yükleniyor...</p>}

        {!isLoading && paid && (
          <section className="bill-card bill-thankyou">
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            <h2>Ödemeniz alındı, afiyet olsun!</h2>
            <Link to={`/menu/${restaurantId}/${tableNo}`} className="bill-primary-btn">
              Menüye Dön
            </Link>
          </section>
        )}

        {!isLoading && !paid && allItems.length === 0 && (
          <p className="bill-empty">Ödenecek aktif bir siparişiniz yok.</p>
        )}

        {!isLoading && !paid && allItems.length > 0 && (
          <>
            <section className="bill-card">
              <h2>Sipariş kalemleri</h2>
              <ul className="bill-items">
                {allItems.map((item) => (
                  <li key={item.orderItemId}>
                    <span>{item.name}</span>
                    <strong>{formatKurus(item.price)}</strong>
                  </li>
                ))}
              </ul>
              <div className="bill-total">
                <span>Toplam</span>
                <strong>{formatKurus(total)}</strong>
              </div>
            </section>

            {error && <p className="bill-error">{error}</p>}

            {billSent ? (
              <section className="bill-card bill-thankyou bill-sent">
                <span className="material-symbols-outlined" aria-hidden="true">
                  check_circle
                </span>
                <h2>Hesabınız garsonumuza iletildi</h2>
                <p>Ödemenizi masanızda garsonumuza (nakit veya kart/POS ile) yapabilirsiniz.</p>
                <div className="bill-sent-meta">
                  <div>
                    <span>Masa</span>
                    <strong>{tableNo}</strong>
                  </div>
                  <div>
                    <span>Toplam</span>
                    <strong>{formatKurus(total)}</strong>
                  </div>
                </div>
              </section>
            ) : !onlinePayment || !bill ? (
              <button
                type="button"
                className="bill-primary-btn"
                onClick={handleRequestBill}
                disabled={isProcessing}
              >
                {isProcessing ? 'Hazırlanıyor...' : 'Hesabı İste'}
              </button>
            ) : (
              <section className="bill-card">
                <h2>Kart ile Öde</h2>

                <label className="bill-field">
                  <span>Kart Üzerindeki İsim</span>
                  <input
                    type="text"
                    autoComplete="cc-name"
                    value={card.holder}
                    onChange={(e) => setCard((p) => ({ ...p, holder: e.target.value }))}
                    placeholder="Ad Soyad"
                  />
                </label>

                <label className="bill-field">
                  <span>Kart Numarası</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={19}
                    value={card.number}
                    onChange={(e) => setCard((p) => ({ ...p, number: e.target.value }))}
                    placeholder="•••• •••• •••• ••••"
                  />
                </label>

                <div className="bill-field-row">
                  <label className="bill-field">
                    <span>Ay</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      autoComplete="cc-exp-month"
                      value={card.month}
                      onChange={(e) => setCard((p) => ({ ...p, month: e.target.value }))}
                      placeholder="12"
                    />
                  </label>

                  <label className="bill-field">
                    <span>Yıl</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="cc-exp-year"
                      value={card.year}
                      onChange={(e) => setCard((p) => ({ ...p, year: e.target.value }))}
                      placeholder="2030"
                    />
                  </label>

                  <label className="bill-field">
                    <span>CVC</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="cc-csc"
                      value={card.cvc}
                      onChange={(e) => setCard((p) => ({ ...p, cvc: e.target.value }))}
                      placeholder="123"
                    />
                  </label>
                </div>

                <p className="bill-note">
                  Ödeme iyzico altyapısı üzerinden alınır. Nakit ödemek isterseniz personele bildirin.
                </p>

                <div className="bill-payment-logos">
                  <IyzicoLogoBand variant="colored" width={300} />
                </div>


                <button
                  type="button"
                  className="bill-primary-btn"
                  onClick={handlePay}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'İşleniyor...' : `${formatKurus(total)} Öde`}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
