import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  customerRefundsApi,
  customerWaiterApi,
  WaiterCallReason,
} from '../../api/customer.js';
import { OrderSessionStatus, OrderItemStatus, ORDER_ITEM_STATUS_LABEL, formatKurus } from '../../api/enums.js';
import { RefundMethod } from '../../api/refunds.js';
import { toPage, MAX_PAGE_SIZE } from '../../api/pagination.js';
import PayTrBadge from '../../components/PayTrBadge.jsx';
import { CardPaymentStatus, waitForCardPayment, readPaymentReturnParams, clearPaymentReturnParams, currentReturnPath, toPaymentUrl } from '../../api/paytr.js';
import LOGO from '../../assets/img/sukranapp.webp';

const ALL = '__all__';
const LOW_STOCK = 5;

const LEGAL_LINKS = [
  ['/kvkk', 'KVKK Aydınlatma Metni'],
  ['/gizlilik-politikasi', 'Gizlilik Politikası'],
  ['/kullanim-kosullari', 'Kullanım Koşulları'],
  ['/mesafeli-satis-sozlesmesi', 'Mesafeli Satış Sözleşmesi'],
  ['/iptal-ve-iade-politikasi', 'İptal ve İade Politikası'],
];

const ACCOUNT_MENU = [
  ['orders', 'Siparişlerim', 'receipt_long'],
  ['bill', 'Hesap ve Ödeme', 'payments'],
  ['review', 'Yorum Yap', 'star'],
  ['support', 'Destek ve İade', 'support_agent'],
];

const lower = (value) => (value ?? '').toLocaleLowerCase('tr-TR');

/** Ürünün ücretli ek malzemeleri: fiyatı tanımlı olan malzemeler seçilebilir. */
function extrasOf(menuItem) {
  const names = menuItem?.ingredients ?? [];
  const prices = menuItem?.ingredientPrices ?? [];
  return names
    .map((name, index) => ({ name, price: prices[index] }))
    .filter((extra) => extra.price !== null && extra.price !== undefined);
}

function isSoldOut(menuItem) {
  return !menuItem.isAvailable || menuItem.stockQuantity === 0;
}

function lineKey(menuItemId, extras) {
  return `${menuItemId}|${[...extras].sort().join(',')}`;
}

/** Siparişin genel durumu: en geride kalan kalemin durumu. */
function orderStage(order) {
  const statuses = (order.items ?? []).map((item) => item.status);
  if (statuses.length === 0) return OrderItemStatus.Pending;
  return Math.min(...statuses);
}

export default function CustomerMenu() {
  const { restaurantId, tableNo } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  // PayTR 3D Secure sonrası bu sayfaya ?odeme=...&oid=... ile dönülür.
  const [paymentReturn] = useState(() => readPaymentReturnParams());

  const [session, setSession] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [screen, setScreen] = useState(() => (paymentReturn ? 'bill' : 'menu'));
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const noticeTimer = useRef(null);

  const showNotice = useCallback((text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  }, []);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError('');
      try {
        let current = getCustomerSession();
        // Masa yeniden açıldıysa QR'daki anahtar değişir; eski oturum artık geçersizdir.
        const matches = current
          && current.restaurantId === restaurantId
          && String(current.tableNo) === String(tableNo)
          && (!token || current.qrToken === token);

        if (!matches || !isSessionValid(current)) {
          if (!token) {
            throw new Error('QR kodundaki bağlantı eksik veya geçersiz. Lütfen masadaki QR kodu tekrar okutun.');
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
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setMenuItems(Array.isArray(menuItemsData) ? menuItemsData : menuItemsData?.items ?? []);
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
  }, [restaurantId, tableNo, token]);

  // Masa ve durum süzgeci sunucuda uygulanır; müşteri yalnızca kendi masasının
  // açık oturumdaki siparişlerini görür.
  const loadOrders = useCallback(
    () =>
      customerOrdersApi
        .getByRestaurant(restaurantId, {
          tableNo: Number(tableNo),
          sessionStatus: OrderSessionStatus.Active,
          pageSize: MAX_PAGE_SIZE,
        })
        .then((data) => setOrders(toPage(data).items))
        .catch(() => {})
        .finally(() => setOrdersLoaded(true)),
    [restaurantId, tableNo],
  );

  useEffect(() => {
    if (session) loadOrders();
  }, [session, loadOrders]);

  // Mutfak sipariş durumunu güncellediğinde bildirim gelir; sunucu QR token'ındaki
  // role bakıp bağlantıyı yalnızca BU masanın grubuna alır.
  useOrderRealtime({
    enabled: Boolean(session?.accessToken),
    onChange: loadOrders,
    getAccessToken: () => getCustomerSession()?.accessToken ?? '',
    onRefundChange: () => showNotice('İade talebinizin durumu güncellendi.'),
  });

  const menuById = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => sum + (line.basePrice + line.extrasPrice) * line.qty, 0);

  const go = (next) => {
    setAccountOpen(false);
    setScreen(next);
  };

  const openProduct = (menuItem, editing = null) => {
    if (isSoldOut(menuItem)) return;
    setProduct({ menuItem, editing });
  };

  const saveProduct = ({ menuItem, extras, qty, editing }) => {
    const extraList = extrasOf(menuItem).filter((extra) => extras.includes(extra.name));
    const key = lineKey(menuItem.id, extras);
    const nextLine = {
      key,
      menuItemId: menuItem.id,
      name: menuItem.name,
      basePrice: menuItem.price,
      extras: extraList.map((extra) => extra.name),
      extrasPrice: extraList.reduce((sum, extra) => sum + extra.price, 0),
      qty,
    };
    setCart((prev) => {
      const without = editing ? prev.filter((line) => line.key !== editing.key) : prev;
      const existing = without.find((line) => line.key === key);
      if (existing) {
        return without.map((line) => (line.key === key ? { ...line, qty: editing ? qty : line.qty + qty } : line));
      }
      return [...without, nextLine];
    });
    setProduct(null);
    if (!editing) showNotice(`${menuItem.name} sepete eklendi.`);
  };

  const changeQty = (key, delta) => {
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, qty: line.qty + delta } : line)).filter((line) => line.qty > 0),
    );
  };

  /** "Tekrar Ver": önceki siparişin satıştaki ürünlerini aynı seçimlerle sepete koyar. */
  const repeatOrder = (order) => {
    let added = 0;
    setCart((prev) => {
      let next = [...prev];
      for (const item of order.items ?? []) {
        const menuItem = menuById.get(item.menuItemId);
        if (!menuItem || isSoldOut(menuItem)) continue;
        const allowed = new Set(extrasOf(menuItem).map((extra) => extra.name));
        const extras = (item.extras ?? []).filter((name) => allowed.has(name));
        const extraList = extrasOf(menuItem).filter((extra) => extras.includes(extra.name));
        const key = lineKey(menuItem.id, extras);
        added += 1;
        const existing = next.find((line) => line.key === key);
        next = existing
          ? next.map((line) => (line.key === key ? { ...line, qty: line.qty + 1 } : line))
          : [
              ...next,
              {
                key,
                menuItemId: menuItem.id,
                name: menuItem.name,
                basePrice: menuItem.price,
                extras,
                extrasPrice: extraList.reduce((sum, extra) => sum + extra.price, 0),
                qty: 1,
              },
            ];
      }
      return next;
    });
    go('cart');
    setTimeout(() => {
      if (added === 0) showNotice('Bu siparişteki ürünler şu anda satışta değil.');
    }, 0);
  };

  const callWaiter = async (reason = WaiterCallReason.Service) => {
    setAccountOpen(false);
    try {
      await customerWaiterApi.call(reason);
      showNotice(reason === WaiterCallReason.Bill ? 'Hesap için garsonunuz çağrıldı.' : 'Garsonunuz çağrıldı, birazdan masanızda.');
    } catch (err) {
      showNotice(err.status === 429 ? 'Garsonunuz zaten çağrıldı, lütfen biraz bekleyin.' : err.message ?? 'Garson çağrılamadı.');
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="grid h-full place-items-center p-8 text-center text-white">
          <div>
            <img src={LOGO} alt="Şükran App" className="mx-auto h-14 w-14 animate-pulse rounded-2xl border border-[#D4AF37]/60" />
            <p className="mt-4 text-sm text-neutral-300">Masa oturumunuz doğrulanıyor...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="grid h-full place-items-center p-8 text-center text-white">
          <div>
            <span className="material-symbols-outlined text-5xl text-[#D4AF37]">qr_code_scanner</span>
            <p className="mt-3 text-sm leading-relaxed text-neutral-200">{error}</p>
          </div>
        </div>
      </Shell>
    );
  }

  const header = (title, subtitle, back = 'menu') => (
    <ScreenHeader title={title} subtitle={subtitle ?? `Masa ${tableNo}`} onBack={() => go(back)} />
  );

  return (
    <Shell>
      {notice && (
        <p role="status" className="absolute inset-x-3 top-2 z-[60] rounded-xl bg-[#FED65B] px-4 py-2 text-sm font-medium text-black shadow-lg">
          {notice}
        </p>
      )}

      {screen === 'menu' && (
        <MenuScreen
          restaurant={restaurant}
          tableNo={tableNo}
          categories={categories}
          menuItems={menuItems}
          cart={cart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          activeOrderCount={orders.length}
          accountOpen={accountOpen}
          onToggleAccount={() => setAccountOpen((open) => !open)}
          onNavigate={go}
          onCallWaiter={() => callWaiter(WaiterCallReason.Service)}
          onOpenProduct={openProduct}
          onChangeQty={changeQty}
        />
      )}

      {screen === 'cart' && (
        <CartScreen
          header={header('Sipariş Sepetiniz', `Masa ${tableNo} • ${cartCount} ürün`)}
          cart={cart}
          total={cartTotal}
          menuById={menuById}
          tableNo={tableNo}
          session={session}
          restaurantId={restaurantId}
          onChangeQty={changeQty}
          onEdit={(line) => {
            const menuItem = menuById.get(line.menuItemId);
            if (menuItem) openProduct(menuItem, line);
          }}
          onClear={() => setCart([])}
          onOrdered={() => {
            setCart([]);
            loadOrders();
            go('orders');
            showNotice('Siparişiniz mutfağa iletildi.');
          }}
        />
      )}

      {screen === 'orders' && (
        <OrdersScreen
          header={header('Siparişlerim')}
          orders={orders}
          loaded={ordersLoaded}
          menuById={menuById}
          onRepeat={repeatOrder}
          onBill={() => go('bill')}
        />
      )}

      {screen === 'bill' && (
        <BillScreen
          header={header('Hesap ve Ödeme')}
          session={session}
          restaurantId={restaurantId}
          tableNo={tableNo}
          orders={orders}
          ordersLoaded={ordersLoaded}
          paymentReturn={paymentReturn}
          onCallWaiter={() => callWaiter(WaiterCallReason.Bill)}
          onPaid={loadOrders}
        />
      )}

      {screen === 'review' && <ReviewScreen header={header('Deneyimi Puanla')} restaurantId={restaurantId} showNotice={showNotice} />}

      {screen === 'support' && (
        <SupportScreen
          header={header('Destek ve İade')}
          onCallWaiter={() => callWaiter(WaiterCallReason.Service)}
          showNotice={showNotice}
        />
      )}

      {product && (
        <ProductSheet
          menuItem={product.menuItem}
          editing={product.editing}
          onClose={() => setProduct(null)}
          onSave={saveProduct}
        />
      )}
    </Shell>
  );
}

// --- Ortak parçalar -----------------------------------------------------------

function Shell({ children }) {
  return (
    <main className="relative mx-auto h-dvh w-full max-w-[480px] overflow-hidden bg-[#0f1412] font-['Inter',sans-serif]">
      <style>{'.hide-scrollbar{scrollbar-width:none}.hide-scrollbar::-webkit-scrollbar{display:none}'}</style>
      {children}
    </main>
  );
}

function ScreenHeader({ title, subtitle, onBack, right = null }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800 bg-[#1A1A1A] px-4 py-3 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Menüye dön"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-['Montserrat',sans-serif] text-sm font-bold text-white">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#D4AF37]">{subtitle}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}

function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-[#F1F3F2] text-[#B8BDB9] ${className}`}>
        <span className="material-symbols-outlined text-3xl">restaurant</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

function QtyControl({ value, onMinus, onPlus, size = 'sm' }) {
  const box = size === 'lg' ? 'h-11 px-1' : 'h-7';
  const btn = size === 'lg' ? 'w-9 text-base' : 'w-7 text-sm';
  return (
    <div className={`flex items-center overflow-hidden rounded-lg border border-[#DFE4E0] bg-neutral-50 ${box}`}>
      <button type="button" onClick={onMinus} aria-label="Azalt" className={`flex h-full items-center justify-center font-bold text-neutral-600 ${btn}`}>
        −
      </button>
      <span className="w-7 text-center font-['Montserrat',sans-serif] text-xs font-extrabold text-[#191C1D]">{value}</span>
      <button
        type="button"
        onClick={onPlus}
        aria-label="Artır"
        className={`flex h-full items-center justify-center bg-[#1A1A1A] font-bold text-[#D4AF37] ${btn}`}
      >
        +
      </button>
    </div>
  );
}

function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] font-['Montserrat',sans-serif] text-sm font-extrabold text-[#1A1A1A] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-[#DFE4E0] bg-white p-3 shadow-sm ${className}`}>{children}</div>;
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{children}</p>;
}

// --- Menü ---------------------------------------------------------------------

function MenuScreen({
  restaurant,
  tableNo,
  categories,
  menuItems,
  cart,
  cartCount,
  cartTotal,
  activeOrderCount,
  accountOpen,
  onToggleAccount,
  onNavigate,
  onCallWaiter,
  onOpenProduct,
  onChangeQty,
}) {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');

  // Kategori sırası işletmenin tanımladığı sıradır; tanımsız kategorideki ürünler sona eklenir.
  const categoryList = useMemo(() => {
    const used = new Set(menuItems.map((item) => item.category || 'Diğer'));
    const list = categories.filter((c) => used.has(c.name)).map((c) => ({ name: c.name, description: c.description, imageUrl: c.imageUrl }));
    for (const name of used) {
      if (!list.some((c) => c.name === name)) list.push({ name, description: '', imageUrl: '' });
    }
    return list.map((c) => ({
      ...c,
      imageUrl: c.imageUrl || menuItems.find((item) => (item.category || 'Diğer') === c.name && item.imageUrl)?.imageUrl || '',
    }));
  }, [categories, menuItems]);

  const visible = useMemo(() => {
    const q = lower(query.trim());
    return menuItems.filter((item) => {
      if (category !== ALL && (item.category || 'Diğer') !== category) return false;
      if (!q) return true;
      return lower(item.name).includes(q) || (item.ingredients ?? []).some((ingredient) => lower(ingredient).includes(q));
    });
  }, [menuItems, category, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of categoryList) map.set(c.name, []);
    for (const item of visible) map.get(item.category || 'Diğer')?.push(item);
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [categoryList, visible]);

  const qtyInCart = (menuItemId) => cart.filter((line) => line.menuItemId === menuItemId).reduce((sum, line) => sum + line.qty, 0);
  const plainLine = (menuItemId) => cart.find((line) => line.menuItemId === menuItemId && line.extras.length === 0);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="z-10 shrink-0 border-b border-neutral-800 bg-[#1A1A1A] px-4 py-3 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#D4AF37]/60 shadow">
              <img alt="Şükran App" className="h-full w-full object-cover" src={LOGO} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-['Montserrat',sans-serif] text-sm font-bold leading-tight tracking-tight text-white">
                {restaurant?.name ?? 'Dijital Menü'}
              </h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-400">
                <span className="flex items-center gap-0.5 font-semibold text-[#FED65B]">
                  <span className="material-symbols-outlined text-xs text-[#D4AF37]">table_restaurant</span>
                  Masa {tableNo}
                </span>
                <span>•</span>
                <span>Dijital Menü</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCallWaiter}
              className="flex h-10 items-center gap-1 rounded-xl border border-[#D4AF37]/50 bg-neutral-900 px-2.5 text-[11px] font-bold text-[#D4AF37] transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">room_service</span>
              Garson
            </button>
            <button
              type="button"
              onClick={onToggleAccount}
              aria-expanded={accountOpen}
              aria-label="Masa menüsü"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/50 bg-neutral-900 text-[#D4AF37] transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
              {activeOrderCount > 0 && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border border-black bg-emerald-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {accountOpen && (
        <nav className="absolute right-3 top-16 z-50 grid w-56 gap-1 rounded-xl border border-[#D4AF37] bg-neutral-900 p-2 text-sm text-white shadow-2xl">
          {ACCOUNT_MENU.map(([id, title, icon]) => (
            <button key={id} type="button" onClick={() => onNavigate(id)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base text-[#D4AF37]">{icon}</span>
              {title}
              {id === 'orders' && activeOrderCount > 0 && (
                <span className="ml-auto rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold">{activeOrderCount}</span>
              )}
            </button>
          ))}
        </nav>
      )}

      <div className="hide-scrollbar flex-1 overflow-y-auto pb-24">
        <div className="border-b border-[#DFE4E0]/60 bg-white p-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#59635D]">search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Menüde lezzet ara..."
              className="w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] py-2 pl-9 pr-4 text-sm text-[#191C1D] placeholder:text-[#59635D]/70 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>

        {categoryList.length > 1 && (
          <div className="border-b border-[#DFE4E0]/40 bg-white px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-['Montserrat',sans-serif] text-[11px] font-bold uppercase tracking-wider text-[#59635D]">Kategoriler</span>
              <span className="text-[11px] font-medium text-[#D4AF37]">{categoryList.length} Kategori</span>
            </div>
            <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-1">
              <CategoryChip label="Tümü" icon="apps" active={category === ALL} onClick={() => setCategory(ALL)} />
              {categoryList.map((c) => (
                <CategoryChip key={c.name} label={c.name} imageUrl={c.imageUrl} active={category === c.name} onClick={() => setCategory(c.name)} />
              ))}
            </div>
          </div>
        )}

        {menuItems.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#59635D]">Menüde henüz ürün yok.</p>
        ) : grouped.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#59635D]">Aramanızla eşleşen ürün bulunamadı.</p>
        ) : (
          grouped.map(([name, items]) => {
            const description = categoryList.find((c) => c.name === name)?.description;
            return (
              <section key={name}>
                <div className="px-4 pb-2 pt-4">
                  <h2 className="font-['Montserrat',sans-serif] text-base font-bold text-[#191C1D]">{name}</h2>
                  {description && <p className="text-[11px] leading-snug text-[#59635D]">{description}</p>}
                </div>
                <div className="space-y-3 px-3">
                  {items.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qty={qtyInCart(item.id)}
                      plainLine={plainLine(item.id)}
                      onOpen={() => onOpenProduct(item)}
                      onChangeQty={onChangeQty}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <div className="mx-3 mt-4 flex items-start gap-2 rounded-xl border border-[#002819]/20 bg-[#002819]/10 p-3 text-[11px] text-[#06402B]">
          <span className="material-symbols-outlined shrink-0 text-base">info</span>
          <p>Siparişleriniz mutfak ekranına anlık olarak iletilir. Alerjiniz varsa sipariş vermeden önce lütfen personele bildirin.</p>
        </div>

        <footer className="mb-4 mt-8 px-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
            <span>Powered by</span>
            <span className="flex items-center gap-1 font-['Montserrat',sans-serif] font-bold text-[#06402B]">
              <img alt="" className="inline h-3.5 w-3.5 rounded-sm" src={LOGO} />
              Şükran App
            </span>
          </div>
          <nav aria-label="Hukuki bağlantılar" className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#59635D]">
            {LEGAL_LINKS.map(([href, label]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="py-1 hover:underline">
                {label}
              </a>
            ))}
          </nav>
        </footer>
      </div>

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('cart')}
          className="absolute inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-2xl border border-[#D4AF37] bg-[#1A1A1A] p-3 text-white shadow-2xl"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37] font-['Montserrat',sans-serif] text-xs font-bold text-[#1A1A1A]">
              {cartCount}
            </div>
            <div className="text-left">
              <p className="flex items-center gap-1 text-xs font-bold text-white">
                Sepeti Gör <span className="material-symbols-outlined text-xs text-[#D4AF37]">arrow_forward</span>
              </p>
              <p className="text-[10px] text-[#FED65B]">Masa {tableNo} için hazırlandı</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Toplam Tutar</span>
            <span className="font-['Montserrat',sans-serif] text-sm font-extrabold text-white">{formatKurus(cartTotal)}</span>
          </div>
        </button>
      )}
    </div>
  );
}

function CategoryChip({ label, imageUrl, icon = 'restaurant', active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-[74px] shrink-0 flex-col items-center ${active ? '' : 'opacity-70 hover:opacity-100'}`}>
      <div
        className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm ${
          active ? 'border-2 border-[#D4AF37] bg-[#1A1A1A] p-0.5' : 'border border-[#DFE4E0] bg-white'
        }`}
      >
        {imageUrl ? (
          <ProductImage src={imageUrl} alt="" className="h-full w-full rounded-xl" />
        ) : (
          <span className={`material-symbols-outlined text-2xl ${active ? 'text-[#D4AF37]' : 'text-[#59635D]'}`}>{icon}</span>
        )}
      </div>
      <span
        className={`mt-1 line-clamp-2 text-center text-[11px] leading-tight ${
          active ? "font-['Montserrat',sans-serif] font-bold text-[#1A1A1A]" : 'font-medium text-[#59635D]'
        }`}
      >
        {label}
      </span>
      {active && <span className="mt-0.5 h-0.5 w-4 rounded-full bg-[#D4AF37]" />}
    </button>
  );
}

function StockBadge({ item }) {
  if (isSoldOut(item)) return null;
  if (item.stockQuantity !== null && item.stockQuantity !== undefined && item.stockQuantity <= LOW_STOCK) {
    return <span className="ml-1.5 inline-flex items-center text-[10px] font-medium text-amber-700">Son {item.stockQuantity} adet</span>;
  }
  return (
    <span className="ml-1.5 inline-flex items-center text-[10px] font-medium text-emerald-700">
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Stokta
    </span>
  );
}

function ProductCard({ item, qty, plainLine, onOpen, onChangeQty }) {
  const soldOut = isSoldOut(item);
  const extraNames = extrasOf(item).map((extra) => extra.name);
  const hasExtras = extraNames.length > 0;
  // Ücretli ek malzemeler içindekiler değildir; detayda ayrıca seçilir.
  const description = (item.ingredients ?? []).filter((name) => !extraNames.includes(name)).join(', ');

  return (
    <div
      className={`relative flex gap-3 overflow-hidden rounded-2xl p-3 shadow-sm ${
        soldOut ? 'border border-[#DFE4E0] bg-white/75 opacity-65' : qty > 0 ? 'border-2 border-[#D4AF37]/40 bg-white' : 'border border-[#DFE4E0] bg-white'
      }`}
    >
      <button type="button" onClick={onOpen} disabled={soldOut} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100" aria-label={`${item.name} detayı`}>
        <ProductImage src={item.imageUrl} alt={item.name} className={`h-full w-full ${soldOut ? 'grayscale' : ''}`} />
        {item.calories ? (
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">{item.calories} kcal</span>
        ) : null}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded bg-red-800/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Tükendi</span>
          </div>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          {item.averagePreparationTime > 0 && !soldOut && (
            <div className="mb-1 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-0.5 rounded bg-[#002819] px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                <span className="material-symbols-outlined text-[10px]">schedule</span>~{item.averagePreparationTime} dk
              </span>
            </div>
          )}
          <h3
            className={`truncate font-['Montserrat',sans-serif] text-xs font-bold ${soldOut ? 'text-neutral-500 line-through' : 'text-[#191C1D]'}`}
          >
            {item.name}
          </h3>
          {description && <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[#59635D]">{description}</p>}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-[#DFE4E0]/40 pt-1">
          <div>
            <span className={`font-['Montserrat',sans-serif] text-sm font-extrabold ${soldOut ? 'text-neutral-400' : 'text-[#191C1D]'}`}>
              {formatKurus(item.price)}
            </span>
            <StockBadge item={item} />
          </div>
          {soldOut ? (
            <span className="rounded-lg bg-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-500">Şu anda tükendi</span>
          ) : plainLine && !hasExtras ? (
            <QtyControl value={plainLine.qty} onMinus={() => onChangeQty(plainLine.key, -1)} onPlus={() => onChangeQty(plainLine.key, 1)} />
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="flex h-7 items-center gap-1 rounded-lg bg-[#D4AF37] px-3 text-[11px] font-bold text-[#1A1A1A] shadow-sm transition-all active:scale-95"
            >
              {qty > 0 ? `${qty} · Ekle` : 'Ekle'}
              <span className="material-symbols-outlined text-xs">add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Ürün detayı ---------------------------------------------------------------

function ProductSheet({ menuItem, editing, onClose, onSave }) {
  const extras = extrasOf(menuItem);
  const [selected, setSelected] = useState(() => editing?.extras ?? []);
  const [qty, setQty] = useState(() => editing?.qty ?? 1);
  const extraTotal = extras.filter((extra) => selected.includes(extra.name)).reduce((sum, extra) => sum + extra.price, 0);
  const maxQty = menuItem.stockQuantity ?? 99;
  const base = (menuItem.ingredients ?? []).filter((name) => !extras.some((extra) => extra.name === name));

  const toggle = (name) => setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <div className="absolute inset-0 z-40 flex flex-col">
      <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-label={menuItem.name} className="absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col overflow-hidden rounded-t-[32px] border-t border-[#D4AF37]/30 bg-white shadow-2xl">
        <div className="flex shrink-0 justify-center py-2">
          <div className="h-1.5 w-12 rounded-full bg-neutral-300" />
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-[#DFE4E0]/40 px-4 pb-2">
          <span className="font-['Montserrat',sans-serif] text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">Ürün Detayı</span>
          <button type="button" onClick={onClose} aria-label="Kapat" className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:text-black">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto p-4 pb-24">
          <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-neutral-100">
            <ProductImage src={menuItem.imageUrl} alt={menuItem.name} className="h-full w-full" />
            <div className="absolute left-2 top-2 flex gap-1">
              {menuItem.calories ? (
                <span className="rounded bg-[#002819] px-2 py-0.5 text-[10px] font-bold text-emerald-300 shadow">{menuItem.calories} kcal</span>
              ) : null}
              {menuItem.averagePreparationTime > 0 && (
                <span className="rounded bg-[#1A1A1A] px-2 py-0.5 text-[10px] font-bold text-[#FED65B] shadow">~{menuItem.averagePreparationTime} dk</span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-['Montserrat',sans-serif] text-base font-extrabold text-[#191C1D]">{menuItem.name}</h2>
              <span className="shrink-0 font-['Montserrat',sans-serif] text-lg font-extrabold text-[#06402B]">{formatKurus(menuItem.price)}</span>
            </div>
            {base.length > 0 && <p className="mt-1 text-xs leading-relaxed text-[#59635D]">İçindekiler: {base.join(', ')}</p>}
            {menuItem.recipe && <p className="mt-1 text-xs leading-relaxed text-[#59635D]">{menuItem.recipe}</p>}
          </div>

          {extras.length > 0 && (
            <div className="rounded-2xl border border-[#DFE4E0] bg-[#F8F9FA] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-['Montserrat',sans-serif] text-xs font-bold text-[#191C1D]">Ekstra Malzemeler</span>
                <span className="text-[10px] font-medium text-[#59635D]">İsteğe Bağlı</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {extras.map((extra) => {
                  const checked = selected.includes(extra.name);
                  return (
                    <label
                      key={extra.name}
                      className={`flex cursor-pointer items-center justify-between rounded-xl bg-white p-2.5 ${
                        checked ? 'border-2 border-[#D4AF37]/50' : 'border border-[#DFE4E0]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggle(extra.name)} className="h-4 w-4 rounded accent-[#D4AF37]" />
                        <span className={checked ? 'font-semibold text-[#191C1D]' : ''}>{extra.name}</span>
                      </span>
                      <span className={checked ? 'font-bold text-[#1A1A1A]' : 'font-medium text-neutral-600'}>
                        {extra.price > 0 ? `+${formatKurus(extra.price)}` : 'Ücretsiz'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[#DFE4E0] bg-white p-3 shadow-lg">
          <QtyControl size="lg" value={qty} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => Math.min(maxQty, q + 1))} />
          <button
            type="button"
            onClick={() => onSave({ menuItem, extras: selected, qty, editing })}
            className="flex h-11 flex-1 items-center justify-between rounded-xl bg-[#D4AF37] px-4 font-['Montserrat',sans-serif] text-xs font-extrabold text-[#1A1A1A] shadow-md transition-transform active:scale-[0.98]"
          >
            <span>{editing ? 'Güncelle' : 'Sepete Ekle'}</span>
            <span>{formatKurus((menuItem.price + extraTotal) * qty)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sepet ----------------------------------------------------------------------

function CartScreen({ header, cart, total, menuById, tableNo, session, restaurantId, onChangeQty, onEdit, onClear, onOrdered }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const baseTotal = cart.reduce((sum, line) => sum + line.basePrice * line.qty, 0);

  const submit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setError('');
    try {
      // Ad ve fiyat sunucuda ürün kaydından hesaplanır; istemci yalnızca ürün ve ek malzeme seçimini gönderir.
      const items = cart.flatMap((line) =>
        Array.from({ length: line.qty }, () => ({ menuItemId: line.menuItemId, extras: line.extras, orderedBy: 'Müşteri' })),
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

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]">
      {header}
      {cart.length === 0 ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <span className="material-symbols-outlined text-5xl text-[#D4AF37]">shopping_bag</span>
            <p className="mt-2 text-sm text-[#59635D]">Sepetiniz boş. Menüden ürün ekleyin.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto p-3 pb-36">
            <div className="flex justify-end">
              <button type="button" onClick={onClear} className="text-[11px] text-red-500 hover:underline">
                Sepeti Temizle
              </button>
            </div>
            {cart.map((line) => {
              const menuItem = menuById.get(line.menuItemId);
              const editable = menuItem && extrasOf(menuItem).length > 0;
              return (
                <Card key={line.key}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-['Montserrat',sans-serif] text-xs font-bold text-[#191C1D]">{line.name}</h3>
                      {line.extras.length > 0 && (
                        <p className="text-[10px] font-medium text-[#06402B]">+ {line.extras.join(', ')} (+{formatKurus(line.extrasPrice)})</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-neutral-400">Adet fiyatı: {formatKurus(line.basePrice + line.extrasPrice)}</p>
                    </div>
                    <span className="shrink-0 font-['Montserrat',sans-serif] text-xs font-extrabold text-[#191C1D]">
                      {formatKurus((line.basePrice + line.extrasPrice) * line.qty)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-[#DFE4E0]/40 pt-2">
                    {editable ? (
                      <button type="button" onClick={() => onEdit(line)} className="flex items-center gap-0.5 text-[10px] font-bold text-[#B8941F] hover:underline">
                        <span className="material-symbols-outlined text-xs">edit</span> Düzenle
                      </button>
                    ) : (
                      <span />
                    )}
                    <QtyControl value={line.qty} onMinus={() => onChangeQty(line.key, -1)} onPlus={() => onChangeQty(line.key, 1)} />
                  </div>
                </Card>
              );
            })}

            <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
              <span className="material-symbols-outlined shrink-0 text-xs text-amber-600">warning</span>
              <p>Alerjiniz veya özel bir isteğiniz varsa sipariş vermeden önce lütfen personele bildirin.</p>
            </div>

            <Card className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px] text-[#59635D]">
                <span>Ara Toplam (Ürünler)</span>
                <span>{formatKurus(baseTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#59635D]">
                <span>Ekstra Seçenekler</span>
                <span>{formatKurus(total - baseTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-[#DFE4E0] pt-2 font-['Montserrat',sans-serif] text-sm font-extrabold text-[#191C1D]">
                <span>Genel Toplam</span>
                <span className="text-base text-[#06402B]">{formatKurus(total)}</span>
              </div>
            </Card>
            <ErrorText>{error}</ErrorText>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-30 border-t border-[#DFE4E0] bg-white p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium text-neutral-500">
                Hedef: <strong className="text-[#191C1D]">Masa {tableNo}</strong>
              </span>
              <span className="font-['Montserrat',sans-serif] text-xs font-bold text-[#06402B]">Toplam: {formatKurus(total)}</span>
            </div>
            <PrimaryButton onClick={submit} disabled={isSubmitting}>
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {isSubmitting ? 'Gönderiliyor...' : 'Siparişi Onayla ve Gönder'}
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}

// --- Siparişlerim / canlı takip ------------------------------------------------

const TRACK_STEPS = [
  { label: 'Sipariş Alındı', reached: () => true },
  { label: 'Mutfakta Hazırlanıyor', reached: (stage) => stage >= OrderItemStatus.Kitchen },
  { label: 'Servise Hazır', reached: (stage) => stage >= OrderItemStatus.Ready },
  { label: 'Masaya Teslim Edildi', reached: (stage) => stage >= OrderItemStatus.Delivered },
];

function OrdersScreen({ header, orders, loaded, menuById, onRepeat, onBill }) {
  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [orders]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]">
      {header}
      <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto p-3 pb-8">
        {!loaded ? (
          <p className="p-6 text-center text-sm text-[#59635D]">Yükleniyor...</p>
        ) : sorted.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#59635D]">Bu masada aktif siparişiniz yok.</p>
        ) : (
          sorted.map((order) => {
            const stage = orderStage(order);
            const prep = Math.max(0, ...(order.items ?? []).map((item) => menuById.get(item.menuItemId)?.averagePreparationTime ?? 0));
            const time = new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            return (
              <Card key={order.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-['Montserrat',sans-serif] text-xs font-bold text-[#191C1D]">Sipariş #{order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[10px] text-[#59635D]">
                      {time}
                      {prep > 0 && stage < OrderItemStatus.Ready ? ` • Tahmini süre ~${prep} dk` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      stage >= OrderItemStatus.Delivered
                        ? 'bg-emerald-100 text-emerald-800'
                        : stage >= OrderItemStatus.Ready
                          ? 'bg-[#FED65B] text-black'
                          : 'bg-[#1A1A1A] text-[#FED65B]'
                    }`}
                  >
                    {ORDER_ITEM_STATUS_LABEL[stage]}
                  </span>
                </div>

                <ol className="grid grid-cols-4 gap-1">
                  {TRACK_STEPS.map((step) => {
                    const reached = step.reached(stage);
                    return (
                      <li key={step.label} className="text-center">
                        <div className={`mx-auto h-1.5 rounded-full ${reached ? 'bg-[#D4AF37]' : 'bg-neutral-200'}`} />
                        <span className={`mt-1 block text-[9px] leading-tight ${reached ? 'font-bold text-[#191C1D]' : 'text-neutral-400'}`}>{step.label}</span>
                      </li>
                    );
                  })}
                </ol>

                <ul className="space-y-1 border-t border-[#DFE4E0]/50 pt-2">
                  {(order.items ?? []).map((item) => (
                    <li key={item.orderItemId} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="min-w-0 text-[#191C1D]">
                        {item.name}
                        {item.extras?.length > 0 && <span className="block text-[10px] text-[#06402B]">+ {item.extras.join(', ')}</span>}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#59635D]">{ORDER_ITEM_STATUS_LABEL[item.status]}</span>
                      <span className="w-16 shrink-0 text-right font-semibold">{formatKurus(item.price)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between border-t border-[#DFE4E0]/50 pt-2">
                  <span className="text-xs font-bold">Toplam: {formatKurus(order.totalAmount)}</span>
                  <button type="button" onClick={() => onRepeat(order)} className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-bold text-[#191C1D]">
                    <span className="material-symbols-outlined text-sm">repeat</span>
                    Tekrar Ver
                  </button>
                </div>
              </Card>
            );
          })
        )}
        {sorted.length > 0 && (
          <PrimaryButton onClick={onBill}>
            <span className="material-symbols-outlined text-lg">payments</span>
            Hesabı Gör ve Öde
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

// --- Hesap ve ödeme ---------------------------------------------------------------

function BillScreen({ header, session, restaurantId, tableNo, orders, ordersLoaded, paymentReturn, onCallWaiter, onPaid }) {
  const [bill, setBill] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  // Ödeme sağlayıcısı (PayTR) her tahsilatta bu dört bilgiyi zorunlu tutar.
  const [buyer, setBuyer] = useState({ fullName: '', email: '', address: '', phone: '' });
  // null = henüz bilinmiyor; false ise kart ödemesi kapalı, form gösterilmez.
  const [onlinePayment, setOnlinePayment] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(() => Boolean(paymentReturn));
  const handledReturn = useRef(false);

  // PayTR yönlendirmesinin sonucu kesin değildir; ödeme yalnızca PayTR'nin sunucumuza
  // bildirimiyle onaylanır. Bu yüzden durum sunucudan sorgulanır.
  useEffect(() => {
    if (!paymentReturn || handledReturn.current) return;
    handledReturn.current = true;
    clearPaymentReturnParams();
    waitForCardPayment(customerPaymentsApi.getCardPayment, paymentReturn.merchantOid)
      .then((payment) => {
        if (payment.status === CardPaymentStatus.Succeeded) {
          setPaid(true);
          onPaid?.();
        } else if (payment.status === CardPaymentStatus.Failed) {
          setError(payment.failReason ? `Ödeme tamamlanamadı: ${payment.failReason}` : 'Ödeme tamamlanamadı. Kartınızdan çekim yapılmadı.');
        } else {
          setError('Ödemenin sonucu henüz gelmedi. Birkaç dakika sonra sayfayı yenileyin; çekim yapıldıysa hesabınız kapanmış görünecektir.');
        }
      })
      .catch((err) => setError(err.message ?? 'Ödeme sonucu alınamadı.'))
      .finally(() => setCheckingPayment(false));
  }, [paymentReturn, onPaid]);

  useEffect(() => {
    customerPaymentsApi
      .getOnlinePaymentStatus(restaurantId)
      .then((data) => setOnlinePayment(Boolean(data?.enabled)))
      .catch(() => setOnlinePayment(false));
  }, [restaurantId]);

  const allItems = useMemo(() => orders.flatMap((order) => order.items ?? []), [orders]);
  const total = allItems.reduce((sum, item) => sum + item.price, 0);
  const remaining = orders.reduce((sum, order) => sum + (order.remainingAmount ?? 0), 0);

  const requestBill = async () => {
    if (allItems.length === 0) return;
    setIsProcessing(true);
    setError('');
    try {
      const billId = await customerBillsApi.create({
        restaurantId,
        tableNo: Number(tableNo),
        tableSessionId: session.tableSessionId,
        qrToken: session.qrToken,
      });
      // Tutarı sunucu belirler: daha önce ödenmiş kalemler düşülür.
      const created = await customerBillsApi.getById(billId).catch(() => null);
      setBill({ id: billId, remainingAmount: created?.remainingAmount ?? remaining });
    } catch (err) {
      setError(err.message ?? 'Hesap oluşturulamadı.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pay = async () => {
    if (!bill) return;
    if (buyer.fullName.trim().length < 3) return setError('Ad soyadınızı girin.');
    // PayTR e-postada Türkçe karakter kabul etmiyor.
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(buyer.email.trim())) {
      return setError('Geçerli bir e-posta adresi girin (Türkçe karakter olmadan).');
    }
    if (buyer.address.trim().length < 5) return setError('Adresinizi girin.');
    if (buyer.phone.replace(/\D/g, '').length < 10) return setError('Telefon numaranızı eksiksiz girin.');

    setIsProcessing(true);
    setError('');
    try {
      // İletişim bilgileri yalnızca PayTR'ye iletilir, saklanmaz. Kart bilgisi ve 3D Secure
      // PayTR'nin kendi sayfasında girilir; uygulamamıza hiç gelmez.
      const started = await customerPaymentsApi.startCardPayment({
        billId: bill.id,
        email: buyer.email.trim(),
        fullName: buyer.fullName.trim(),
        address: buyer.address.trim(),
        phone: buyer.phone.trim(),
        returnPath: currentReturnPath(),
      });
      window.location.assign(toPaymentUrl(started.paymentPageUrl));
    } catch (err) {
      setError(err.message ?? 'Ödeme başlatılamadı.');
      setIsProcessing(false);
    }
  };

  const field = (key, label, type, autoComplete, placeholder) => (
    <label className="block text-xs font-semibold text-[#191C1D]">
      {label}
      <input
        type={type}
        autoComplete={autoComplete}
        value={buyer[key]}
        onChange={(event) => setBuyer((prev) => ({ ...prev, [key]: event.target.value }))}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] px-3 py-2 text-sm text-[#191C1D] focus:border-[#D4AF37] focus:outline-none"
      />
    </label>
  );

  let body;
  if (checkingPayment) {
    body = <p className="p-6 text-center text-sm text-[#59635D]">Ödemeniz kontrol ediliyor, lütfen bekleyin...</p>;
  } else if (paid) {
    body = (
      <div className="p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-emerald-600">check_circle</span>
        <p className="mt-2 font-['Montserrat',sans-serif] text-base font-bold text-[#191C1D]">Ödemeniz alındı, afiyet olsun!</p>
      </div>
    );
  } else if (!ordersLoaded) {
    body = <p className="p-6 text-center text-sm text-[#59635D]">Yükleniyor...</p>;
  } else if (allItems.length === 0) {
    body = (
      <div className="space-y-3">
        <ErrorText>{error}</ErrorText>
        <p className="p-6 text-center text-sm text-[#59635D]">Ödenecek aktif bir siparişiniz yok.</p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <Card>
          <ul className="space-y-1.5">
            {allItems.map((item) => (
              <li key={item.orderItemId} className="flex justify-between gap-2 text-xs">
                <span className="min-w-0">
                  {item.name}
                  {item.extras?.length > 0 && <span className="block text-[10px] text-[#06402B]">+ {item.extras.join(', ')}</span>}
                </span>
                <span className="shrink-0 font-semibold">{formatKurus(item.price)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-[#DFE4E0] pt-2 font-['Montserrat',sans-serif] text-sm font-extrabold">
            <span>Toplam</span>
            <span>{formatKurus(total)}</span>
          </div>
          {(bill ? bill.remainingAmount : remaining) !== total && (
            <div className="mt-1 flex justify-between text-xs font-bold text-[#06402B]">
              <span>Ödenecek (ödenmiş ürünler düşüldü)</span>
              <span>{formatKurus(bill ? bill.remainingAmount : remaining)}</span>
            </div>
          )}
        </Card>

        <ErrorText>{error}</ErrorText>

        {!bill ? (
          <>
            <PrimaryButton onClick={requestBill} disabled={isProcessing}>
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              {isProcessing ? 'Hazırlanıyor...' : 'Hesabı İste'}
            </PrimaryButton>
            <button type="button" onClick={onCallWaiter} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A1A] bg-white text-sm font-bold text-[#1A1A1A]">
              <span className="material-symbols-outlined text-lg">room_service</span>
              Nakit / Masada Ödeme İçin Garson Çağır
            </button>
          </>
        ) : onlinePayment === false ? (
          <>
            <p className="rounded-xl border border-[#DFE4E0] bg-white p-3 text-xs text-[#59635D]">
              Bu işletmede kartla online ödeme şu anda kullanılamıyor. Ödeme için garsonunuzu çağırabilirsiniz.
            </p>
            <PrimaryButton onClick={onCallWaiter}>
              <span className="material-symbols-outlined text-lg">room_service</span>
              Hesap İçin Garson Çağır
            </PrimaryButton>
          </>
        ) : (
          <>
            <Card className="space-y-2.5">
              <p className="text-[11px] font-bold text-[#59635D]">İletişim bilgileriniz (ödeme için zorunludur)</p>
              {field('fullName', 'Ad Soyad', 'text', 'name', 'Ad Soyad')}
              {field('email', 'E-posta', 'email', 'email', 'ornek@mail.com')}
              {field('address', 'Adres', 'text', 'street-address', 'Mahalle, sokak, no, ilçe / il')}
              {field('phone', 'Telefon', 'tel', 'tel', '05xx xxx xx xx')}
              <p className="text-[10px] leading-relaxed text-[#59635D]">
                Kart bilgilerinizi bir sonraki adımda PayTR&apos;nin güvenli ödeme sayfasında gireceksiniz; Şükran App kart bilgilerinizi görmez ve
                saklamaz. Nakit ödemek isterseniz garsonunuzu çağırın.
              </p>
            </Card>
            <div className="flex justify-center">
              <PayTrBadge compact />
            </div>
            <PrimaryButton onClick={pay} disabled={isProcessing}>
              <span className="material-symbols-outlined text-lg">lock</span>
              {isProcessing ? 'Güvenli ödeme sayfası açılıyor...' : `${formatKurus(bill.remainingAmount)} Kartla Öde`}
            </PrimaryButton>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]">
      {header}
      <div className="hide-scrollbar flex-1 overflow-y-auto p-3 pb-8">{body}</div>
    </div>
  );
}

// --- Yorum -----------------------------------------------------------------------

const RATING_TEXT = ['', 'Kötü', 'Vasat', 'İyi', 'Çok iyi', 'Mükemmel!'];

function ReviewScreen({ header, restaurantId, showNotice }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    customerReviewsApi
      .getByRestaurant(restaurantId)
      .then((data) => setReviews(Array.isArray(data) ? data : data?.items ?? []))
      .catch(() => setReviews([]))
      .finally(() => setIsLoading(false));
  }, [restaurantId]);

  const submit = async () => {
    if (!rating) return setError('Bir yıldız puanı seçin.');
    if (comment.trim().length < 3) return setError('Görüşünüzü birkaç kelimeyle yazın.');
    setIsSubmitting(true);
    setError('');
    try {
      const review = await customerReviewsApi.create({ restaurantId, comment: comment.trim(), rating });
      if (review?.id) setReviews((prev) => [review, ...prev]);
      setComment('');
      setRating(0);
      showNotice('Yorumunuz için teşekkürler!');
    } catch (err) {
      setError(err.message ?? 'Yorum gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]">
      {header}
      <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto p-3 pb-8">
        <Card className="space-y-3 text-center">
          <p className="font-['Montserrat',sans-serif] text-xs font-bold text-[#191C1D]">Lezzet ve Servis Puanınız</p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} yıldız`} className={n <= rating ? 'text-[#D4AF37]' : 'text-neutral-300'}>
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: n <= rating ? "'FILL' 1" : "'FILL' 0" }}>
                  star
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#59635D]">{rating ? `${rating}.0 / 5.0 • ${RATING_TEXT[rating]}` : 'Puan seçin'}</p>
          <label className="block text-left text-xs font-bold text-[#191C1D]">
            Detaylı Görüşünüz
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Lezzet, sunum ve servis hakkındaki deneyiminiz..."
              className="mt-1 w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] p-2.5 text-sm font-normal focus:border-[#D4AF37] focus:outline-none"
            />
          </label>
          <ErrorText>{error}</ErrorText>
          <PrimaryButton onClick={submit} disabled={isSubmitting}>
            <span className="material-symbols-outlined text-lg">send</span>
            {isSubmitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
          </PrimaryButton>
          <p className="text-[10px] text-[#59635D]">Yorum yapabilmek için bu masadan sipariş vermiş olmanız gerekir.</p>
        </Card>

        {isLoading ? (
          <p className="p-4 text-center text-sm text-[#59635D]">Yükleniyor...</p>
        ) : reviews.length === 0 ? (
          <p className="p-4 text-center text-sm text-[#59635D]">Henüz yorum yok. İlk yorumu siz yapın!</p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191C1D]">{review.userName || 'Misafir'}</span>
                <span className="text-sm text-[#D4AF37]" aria-label={`${review.rating} yıldız`}>
                  {'★'.repeat(review.rating)}
                  <span className="text-neutral-300">{'★'.repeat(5 - review.rating)}</span>
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-[#59635D]">{review.comment}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// --- Destek ve iade --------------------------------------------------------------

const REFUND_OPTIONS = [
  [RefundMethod.Cash, 'Nakit'],
  [RefundMethod.Card, 'Karta'],
  [RefundMethod.Iban, 'IBAN'],
];

function SupportScreen({ header, onCallWaiter, showNotice }) {
  const [content, setContent] = useState('');
  const [method, setMethod] = useState(null);
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (content.trim().length < 5) return setError('Lütfen durumu kısaca açıklayın.');
    if (!method) return setError('İade yöntemini seçin: Nakit, Karta veya IBAN.');
    if (method === RefundMethod.Iban && (!iban.trim() || !holder.trim())) return setError('IBAN ve hesap sahibinin adını girin.');
    setIsSubmitting(true);
    setError('');
    try {
      await customerRefundsApi.create({
        content: content.trim(),
        method,
        iban: method === RefundMethod.Iban ? iban.trim() : null,
        accountHolderName: method === RefundMethod.Iban ? holder.trim() : null,
      });
      setContent('');
      setMethod(null);
      setIban('');
      setHolder('');
      showNotice('İade talebiniz işletmeye iletildi.');
    } catch (err) {
      setError(err.message ?? 'İade talebi gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]">
      {header}
      <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto p-3 pb-8">
        <div className="flex items-center gap-3 rounded-2xl bg-[#002819] p-3 text-white">
          <span className="material-symbols-outlined text-2xl text-[#D4AF37]">headset_mic</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Hemen yardım mı lazım?</p>
            <p className="text-[10px] text-emerald-200">Garsonunuz masanıza gelsin.</p>
          </div>
          <button type="button" onClick={onCallWaiter} className="shrink-0 rounded-lg bg-[#D4AF37] px-3 py-2 text-[11px] font-bold text-[#1A1A1A]">
            Garson Çağır
          </button>
        </div>

        <Card className="space-y-3">
          <p className="font-['Montserrat',sans-serif] text-xs font-bold text-[#191C1D]">İade Talebi</p>
          <label className="block text-xs font-semibold text-[#191C1D]">
            Açıklama
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Örn: Siparişimdeki ürün eksik geldi, iade rica ediyorum."
              className="mt-1 w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] p-2.5 text-sm font-normal focus:border-[#D4AF37] focus:outline-none"
            />
          </label>
          <fieldset>
            <legend className="mb-1 text-xs font-semibold text-[#191C1D]">İade Yöntemi</legend>
            <div className="grid grid-cols-3 gap-2">
              {REFUND_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2 text-xs ${
                    method === value ? 'border-2 border-[#D4AF37] bg-[#D4AF37]/10 font-bold' : 'border-[#DFE4E0] bg-white'
                  }`}
                >
                  <input type="radio" name="refund-method" className="accent-[#D4AF37]" checked={method === value} onChange={() => setMethod(value)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {method === RefundMethod.Card && (
            <p className="text-[10px] text-[#59635D]">Kartla ödediyseniz iade aynı karta yapılır; kart bilginiz istenmez.</p>
          )}
          {method === RefundMethod.Iban && (
            <div className="space-y-2">
              <input
                value={iban}
                onChange={(event) => setIban(event.target.value)}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                autoComplete="off"
                className="w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none"
              />
              <input
                value={holder}
                onChange={(event) => setHolder(event.target.value)}
                placeholder="Hesap sahibinin adı soyadı"
                autoComplete="name"
                className="w-full rounded-xl border border-[#DFE4E0] bg-[#F8F9FA] px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          )}
          <ErrorText>{error}</ErrorText>
          <PrimaryButton onClick={submit} disabled={isSubmitting}>
            <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
            {isSubmitting ? 'Gönderiliyor...' : 'İade Talebi Oluştur'}
          </PrimaryButton>
        </Card>
      </div>
    </div>
  );
}
