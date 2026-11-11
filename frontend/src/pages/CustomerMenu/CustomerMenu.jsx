import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCustomerSession, setCustomerSession, isSessionValid } from '../../api/customerClient.js';
import { useOrderRealtime } from '../../hooks/useOrderRealtime.js';
import {
  qrSessionApi,
  customerMenuApi,
  customerOrdersApi,
  customerBillsApi,
  customerPaymentsApi,
  customerReviewsApi,
} from '../../api/customer.js';
import { OrderSessionStatus, OrderItemStatus, PaymentStatus, ORDER_ITEM_STATUS_LABEL, formatKurus } from '../../api/enums.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import { CardPaymentStatus, waitForCardPayment, readPaymentReturnParams, clearPaymentReturnParams, currentReturnPath } from '../../api/paytr.js';
import './CustomerMenu.css';

const TABS = [
  { id: 'menu', label: 'Menü', icon: 'restaurant_menu' },
  { id: 'cart', label: 'Sepet', icon: 'shopping_cart' },
  { id: 'orders', label: 'Siparişlerim', icon: 'receipt_long' },
  { id: 'bill', label: 'Hesap', icon: 'payments' },
  { id: 'reviews', label: 'Yorumlar', icon: 'star' },
];

export default function CustomerMenu() {
  const { restaurantId, tableNo } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [session, setSession] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('menu');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError('');
      try {
        let current = getCustomerSession();
        // Masa yeniden açıldıysa QR'daki anahtar değişir; eski oturum artık geçersizdir.
        // Adresteki anahtar kayıtlı oturumunkinden farklıysa yeni oturum açılır.
        const matches = current
          && current.restaurantId === restaurantId
          && String(current.tableNo) === String(tableNo)
          && (!token || current.qrToken === token);

        if (!matches || !isSessionValid(current)) {
          if (!token) {
            throw new Error('QR kodundaki bağlantı eksik veya geçersiz.');
          }
          const result = await qrSessionApi.create(restaurantId, tableNo, token);
          current = {
            accessToken: result.accessToken,
            expiresAt: result.expiresAt,
            restaurantId: result.restaurantId,
            tableNo: result.tableNo,
            tableSessionId: result.tableSessionId,
            qrToken: token,
          };
          setCustomerSession(current);
        }

        if (cancelled) return;
        setSession(current);

        const [restaurantData, categoriesData, menuItemsData] = await Promise.all([
          customerMenuApi.getRestaurant(restaurantId),
          customerMenuApi.getCategories(restaurantId).catch(() => []),
          customerMenuApi.getMenuItems(restaurantId),
        ]);

        if (cancelled) return;
        setRestaurant(restaurantData);
        setCategories(categoriesData);
        setMenuItems(menuItemsData.filter((item) => item.isAvailable));
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Masa oturumu doğrulanamadı. Lütfen QR kodu tekrar okutun.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, tableNo, token]);

  const addToCart = (menuItem) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItem.id);
      if (existing) {
        return prev.map((line) => (line.menuItemId === menuItem.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...prev, { menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1 }];
    });
  };

  const changeQty = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((line) => (line.menuItemId === menuItemId ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const cartTotal = useMemo(() => cart.reduce((sum, line) => sum + line.price * line.qty, 0), [cart]);

  if (isLoading) {
    return (
      <div className="customer-menu-loading">
        <span className="material-symbols-outlined">hourglass_top</span>
        <p>Masa oturumunuz doğrulanıyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-menu-loading">
        <span className="material-symbols-outlined">error</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="customer-menu-shell">
      <header className="customer-menu-header">
        <div>
          <h1>{restaurant?.name}</h1>
          <p>Masa {tableNo}</p>
        </div>
      </header>

      <nav className="customer-menu-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-outlined">{tab.icon}</span>
            {tab.label}
            {tab.id === 'cart' && cart.length > 0 && <span className="badge">{cart.reduce((s, l) => s + l.qty, 0)}</span>}
          </button>
        ))}
      </nav>

      <main className="customer-menu-content">
        {activeTab === 'menu' && (
          <MenuTab categories={categories} menuItems={menuItems} onAdd={addToCart} />
        )}
        {activeTab === 'cart' && (
          <CartTab
            cart={cart}
            total={cartTotal}
            onChangeQty={changeQty}
            session={session}
            restaurantId={restaurantId}
            tableNo={tableNo}
            onOrdered={() => {
              setCart([]);
              setActiveTab('orders');
            }}
          />
        )}
        {activeTab === 'orders' && <OrdersTab session={session} restaurantId={restaurantId} tableNo={tableNo} />}
        {activeTab === 'bill' && <BillTab session={session} restaurantId={restaurantId} tableNo={tableNo} />}
        {activeTab === 'reviews' && <ReviewsTab session={session} restaurantId={restaurantId} />}
      </main>
    </div>
  );
}

function MenuTab({ categories, menuItems, onAdd }) {
  const grouped = useMemo(() => {
    const byCategory = new Map();
    for (const item of menuItems) {
      const key = item.category || 'Diğer';
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(item);
    }
    return byCategory;
  }, [menuItems]);

  const orderedCategoryNames = categories.length > 0 ? categories.map((c) => c.name) : Array.from(grouped.keys());

  if (menuItems.length === 0) {
    return <p className="customer-empty">Menüde henüz ürün yok.</p>;
  }

  return (
    <div className="customer-menu-list">
      {orderedCategoryNames
        .filter((name) => grouped.has(name))
        .map((name) => (
          <section key={name}>
            <h2>{name}</h2>
            <div className="customer-product-grid">
              {grouped.get(name).map((item) => (
                <div key={item.id} className="customer-product-card">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
                  <div className="customer-product-info">
                    <h3>{item.name}</h3>
                    {item.ingredients?.length > 0 && <p>{item.ingredients.join(', ')}</p>}
                    <div className="customer-product-footer">
                      <span>{formatKurus(item.price)}</span>
                      <button type="button" onClick={() => onAdd(item)}>
                        <span className="material-symbols-outlined">add</span>
                        Ekle
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function CartTab({ cart, total, onChangeQty, session, restaurantId, tableNo, onOrdered }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setError('');
    try {
      const items = cart.flatMap((line) =>
        Array.from({ length: line.qty }, () => ({
          menuItemId: line.menuItemId,
          name: line.name,
          price: line.price,
          orderedBy: 'Müşteri',
          status: OrderItemStatus.Pending,
          paymentStatus: PaymentStatus.Unpaid,
        })),
      );

      await customerOrdersApi.create({
        restaurantId,
        tableNo: Number(tableNo),
        tableSessionId: session.tableSessionId,
        qrToken: session.qrToken,
        items,
      });
      onOrdered();
    } catch (err) {
      setError(err.message ?? 'Sipariş gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return <p className="customer-empty">Sepetiniz boş. Menüden ürün ekleyin.</p>;
  }

  return (
    <div className="customer-cart">
      {cart.map((line) => (
        <div key={line.menuItemId} className="customer-cart-line">
          <div>
            <p className="name">{line.name}</p>
            <p className="price">{formatKurus(line.price)}</p>
          </div>
          <div className="qty-control">
            <button type="button" onClick={() => onChangeQty(line.menuItemId, -1)}>
              <span className="material-symbols-outlined">remove</span>
            </button>
            <span>{line.qty}</span>
            <button type="button" onClick={() => onChangeQty(line.menuItemId, 1)}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      ))}

      <div className="customer-cart-total">
        <span>Toplam</span>
        <strong>{formatKurus(total)}</strong>
      </div>

      {error && <p className="customer-error">{error}</p>}

      <button type="button" className="customer-primary-btn" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
      </button>
    </div>
  );
}

function OrdersTab({ session, restaurantId, tableNo }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Masa ve durum süzgeci sunucuda uygulanır. Eskiden tüm restoranın siparişleri
  // indirilip istemcide süzülüyordu: gereksiz yük, üstelik müşterinin eline diğer
  // masaların sipariş verisi geçiyordu.
  const load = useCallback(
    () =>
      customerOrdersApi
        .getByRestaurant(restaurantId, {
          tableNo: Number(tableNo),
          sessionStatus: OrderSessionStatus.Active,
          pageSize: MAX_PAGE_SIZE,
        })
        .then((data) => setOrders(toPage(data).items))
        .catch((err) => setError(err.message ?? 'Siparişler yüklenemedi.'))
        .finally(() => setIsLoading(false)),
    [restaurantId, tableNo],
  );

  useEffect(() => {
    load();
  }, [load, session]);

  // Eskiden 5 saniyede bir istek atılıyordu: masadaki her açık telefon, hiçbir şey
  // değişmese bile sunucuyu sürekli meşgul ediyordu. Artık mutfak siparişin
  // durumunu güncellediğinde bildirim geliyor.
  //
  // QR oturumu personel oturumundan ayrı bir depoda durur, o yüzden token'ı
  // buradan veriyoruz. Sunucu bu token'daki role bakıp bağlantıyı yalnızca BU
  // masanın grubuna alır; misafir diğer masaların siparişlerini görmez.
  useOrderRealtime({
    enabled: Boolean(session?.accessToken),
    onChange: load,
    getAccessToken: () => getCustomerSession()?.accessToken ?? '',
  });

  if (isLoading) return <p className="customer-empty">Yükleniyor...</p>;
  if (error) return <p className="customer-error">{error}</p>;
  if (orders.length === 0) return <p className="customer-empty">Aktif siparişiniz yok.</p>;

  return (
    <div className="customer-orders">
      {orders.map((order) => (
        <div key={order.id} className="customer-order-card">
          <ul>
            {order.items.map((item) => (
              <li key={item.orderItemId}>
                <span>{item.name}</span>
                <span className="status">{ORDER_ITEM_STATUS_LABEL[item.status]}</span>
                <span>{formatKurus(item.price)}</span>
              </li>
            ))}
          </ul>
          <div className="customer-order-total">
            <span>Toplam</span>
            <strong>{formatKurus(order.totalAmount)}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function BillTab({ session, restaurantId, tableNo }) {
  const [orders, setOrders] = useState([]);
  const [bill, setBill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  // Ödeme sağlayıcısı (PayTR) her tahsilatta bu dört bilgiyi zorunlu tutar.
  const [buyer, setBuyer] = useState({ fullName: '', email: '', address: '', phone: '' });
  // null = henüz bilinmiyor; false ise kart ödemesi kapalı, form gösterilmez.
  const [onlinePayment, setOnlinePayment] = useState(null);
  // PayTR 3D Secure sonrası bu sayfaya ?odeme=...&oid=... ile dönülür. Yönlendirme sonucu
  // kesin değildir; ödeme yalnızca PayTR'nin sunucumuza bildirimiyle onaylanır.
  const [paymentReturn] = useState(() => readPaymentReturnParams());
  const [checkingPayment, setCheckingPayment] = useState(() => Boolean(paymentReturn));

  useEffect(() => {
    const returned = paymentReturn;
    if (!returned) return;

    clearPaymentReturnParams();
    waitForCardPayment(customerPaymentsApi.getCardPayment, returned.merchantOid)
      .then((payment) => {
        if (payment.status === CardPaymentStatus.Succeeded) {
          setPaid(true);
        } else if (payment.status === CardPaymentStatus.Failed) {
          setError(payment.failReason ? `Ödeme tamamlanamadı: ${payment.failReason}` : 'Ödeme tamamlanamadı. Kartınızdan çekim yapılmadı.');
        } else {
          setError('Ödemenin sonucu henüz gelmedi. Birkaç dakika sonra sayfayı yenileyin; çekim yapıldıysa hesabınız kapanmış görünecektir.');
        }
      })
      .catch((err) => setError(err.message ?? 'Ödeme sonucu alınamadı.'))
      .finally(() => setCheckingPayment(false));
  }, [paymentReturn]);

  useEffect(() => {
    customerPaymentsApi
      .getOnlinePaymentStatus(restaurantId)
      .then((data) => setOnlinePayment(Boolean(data?.enabled)))
      .catch(() => setOnlinePayment(false));
  }, [restaurantId]);

  useEffect(() => {
    customerOrdersApi
      .getByRestaurant(restaurantId, {
        tableNo: Number(tableNo),
        sessionStatus: OrderSessionStatus.Active,
        pageSize: MAX_PAGE_SIZE,
      })
      .then((data) => setOrders(toPage(data).items))
      .catch((err) => setError(err.message ?? 'Sipariş bilgisi alınamadı.'))
      .finally(() => setIsLoading(false));
  }, [restaurantId, tableNo]);

  const allItems = useMemo(() => orders.flatMap((order) => order.items), [orders]);
  const total = allItems.reduce((sum, item) => sum + item.price, 0);

  const handleRequestBill = async () => {
    if (allItems.length === 0) return;
    setIsProcessing(true);
    setError('');
    try {
      const billId = await customerBillsApi.create({
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
      // Tutarı sunucu belirler: daha önce ödenmiş kalemler düşülür. Ekrandaki toplam
      // bununla değiştirilir ki müşteri ödeyeceğinden farklı bir tutar görmesin.
      const created = await customerBillsApi.getById(billId).catch(() => null);
      setBill({ id: billId, remainingAmount: created?.remainingAmount ?? total });
    } catch (err) {
      setError(err.message ?? 'Hesap oluşturulamadı.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!bill) return;

    if (buyer.fullName.trim().length < 3) {
      setError('Ad soyadınızı girin.');
      return;
    }
    // PayTR e-postada Türkçe karakter kabul etmiyor.
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(buyer.email.trim())) {
      setError('Geçerli bir e-posta adresi girin (Türkçe karakter olmadan).');
      return;
    }
    if (buyer.address.trim().length < 5) {
      setError('Adresinizi girin.');
      return;
    }
    if (buyer.phone.replace(/\D/g, '').length < 10) {
      setError('Telefon numaranızı eksiksiz girin.');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      // Sunucu tutarı kendisi hesaplar ve PayTR'nin güvenli ödeme sayfasını alır.
      // İletişim bilgileri yalnızca PayTR'ye iletilir, saklanmaz. Kart bilgisi PayTR'nin
      // sayfasında girilir; uygulamamıza hiç gelmez.
      const started = await customerPaymentsApi.startCardPayment({
        billId: bill.id,
        email: buyer.email.trim(),
        fullName: buyer.fullName.trim(),
        address: buyer.address.trim(),
        phone: buyer.phone.trim(),
        returnPath: currentReturnPath(),
      });
      // Müşteri PayTR'nin kendi sayfasına geçer: kart ve 3D Secure orada girilir,
      // ödeme bitince PayTR bu sayfaya geri döndürür.
      window.location.assign(started.paymentPageUrl);
    } catch (err) {
      setError(err.message ?? 'Ödeme başlatılamadı.');
      setIsProcessing(false);
    }
  };

  if (isLoading) return <p className="customer-empty">Yükleniyor...</p>;

  if (checkingPayment) {
    return <p className="customer-empty">Ödemeniz kontrol ediliyor, lütfen bekleyin...</p>;
  }

  if (paid) {
    return (
      <div className="customer-empty">
        <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
          check_circle
        </span>
        <p>Ödemeniz alındı, afiyet olsun!</p>
      </div>
    );
  }

  if (allItems.length === 0) {
    return <p className="customer-empty">Ödenecek aktif bir siparişiniz yok.</p>;
  }

  return (
    <div className="customer-bill">
      <ul>
        {allItems.map((item) => (
          <li key={item.orderItemId}>
            <span>{item.name}</span>
            <span>{formatKurus(item.price)}</span>
          </li>
        ))}
      </ul>

      <div className="customer-cart-total">
        <span>Toplam</span>
        <strong>{formatKurus(total)}</strong>
      </div>

      {bill && bill.remainingAmount !== total && (
        <div className="customer-cart-total">
          <span>Ödenecek (ödenmiş ürünler düşüldü)</span>
          <strong>{formatKurus(bill.remainingAmount)}</strong>
        </div>
      )}

      {error && <p className="customer-error">{error}</p>}

      {!bill ? (
        <button type="button" className="customer-primary-btn" onClick={handleRequestBill} disabled={isProcessing}>
          {isProcessing ? 'Hazırlanıyor...' : 'Hesabı İste'}
        </button>
      ) : onlinePayment === false ? (
        <p className="customer-card-note">
          Bu işletmede kartla online ödeme şu anda kullanılamıyor. Ödemeyi personele bildirin.
        </p>
      ) : (
        <>
          <div className="customer-card-form">
            <p className="customer-card-note">İletişim bilgileriniz (ödeme için zorunludur)</p>

            <label>
              <span>Ad Soyad</span>
              <input
                type="text"
                autoComplete="name"
                value={buyer.fullName}
                onChange={(e) => setBuyer((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Ad Soyad"
              />
            </label>

            <label>
              <span>E-posta</span>
              <input
                type="email"
                autoComplete="email"
                value={buyer.email}
                onChange={(e) => setBuyer((p) => ({ ...p, email: e.target.value }))}
                placeholder="ornek@mail.com"
              />
            </label>

            <label>
              <span>Adres</span>
              <input
                type="text"
                autoComplete="street-address"
                value={buyer.address}
                onChange={(e) => setBuyer((p) => ({ ...p, address: e.target.value }))}
                placeholder="Mahalle, sokak, no, ilçe / il"
              />
            </label>

            <label>
              <span>Telefon</span>
              <input
                type="tel"
                autoComplete="tel"
                value={buyer.phone}
                onChange={(e) => setBuyer((p) => ({ ...p, phone: e.target.value }))}
                placeholder="05xx xxx xx xx"
              />
            </label>

            <p className="customer-card-note">
              Kart bilgilerinizi bir sonraki adımda PayTR&apos;nin güvenli ödeme sayfasında
              gireceksiniz; Şükran App kart bilgilerinizi görmez ve saklamaz. Nakit ödemek
              isterseniz personele bildirin.
            </p>
          </div>

          <button type="button" className="customer-primary-btn" onClick={handlePay} disabled={isProcessing}>
            {isProcessing ? 'Güvenli ödeme sayfası açılıyor...' : `${formatKurus(bill?.remainingAmount ?? total)} Kartla Öde`}
          </button>
        </>
      )}
    </div>
  );
}

function ReviewsTab({ session, restaurantId }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    customerReviewsApi
      .getByRestaurant(restaurantId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setIsLoading(false));
  }, [restaurantId, session]);

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const review = await customerReviewsApi.create({ restaurantId, comment: comment.trim(), rating });
      setReviews((prev) => [review, ...prev]);
      setComment('');
    } catch (err) {
      setError(err.message ?? 'Yorum gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="customer-reviews">
      <div className="customer-review-form">
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? 'filled' : ''}>
              <span className="material-symbols-outlined">star</span>
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Deneyiminizi paylaşın..."
          rows={3}
        />
        {error && <p className="customer-error">{error}</p>}
        <button type="button" className="customer-primary-btn" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Gönderiliyor...' : 'Yorum Yap'}
        </button>
      </div>

      {isLoading ? (
        <p className="customer-empty">Yükleniyor...</p>
      ) : reviews.length === 0 ? (
        <p className="customer-empty">Henüz yorum yok.</p>
      ) : (
        <div className="customer-review-list">
          {reviews.map((review) => (
            <div key={review.id} className="customer-review-item">
              <div className="stars">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </div>
              <p>{review.comment}</p>
              <span>{review.userName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
