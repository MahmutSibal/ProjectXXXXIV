import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import useQrCart from '../../context/useQrCart.js';

import { getCustomerSession } from '../../api/customerClient.js';
import { customerOrdersApi } from '../../api/customer.js';
import { OrderItemStatus, PaymentStatus } from '../../api/enums.js';
import OrderConfirmModal from '../components/QrMenu/OrderConfirmModal.jsx';

import './QrMenuCart.css';

const TABLE_LABEL_FALLBACK = 'Masa';

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);
}

function CartItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  return (
    <article className="qr-cart-item">
      <img
        src={item.product.image}
        alt={item.product.name}
      />

      <div className="qr-cart-item__content">
        <div className="qr-cart-item__heading">
          <div>
            <h2>{item.product.name}</h2>

            {item.cooking && (
              <span>
                {item.cooking.name}
              </span>
            )}
          </div>

          <button
            type="button"
            className="qr-cart-item__remove"
            onClick={() => onRemove(item.id)}
            aria-label={`${item.product.name} ürününü sil`}
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              delete
            </span>
          </button>
        </div>

        {item.extras?.length > 0 && (
          <ul className="qr-cart-item__extras">
            {item.extras.map((extra) => (
              <li key={extra.id}>
                <span>{extra.name}</span>

                <strong>
                  +{formatPrice(extra.price)}
                </strong>
              </li>
            ))}
          </ul>
        )}

        {item.note && (
          <p className="qr-cart-item__note">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              sticky_note_2
            </span>

            {item.note}
          </p>
        )}

        <div className="qr-cart-item__footer">
          <div className="qr-cart-quantity">
            <button
              type="button"
              onClick={() =>
                onDecrease(item.id)
              }
              aria-label="Adedi azalt"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                remove
              </span>
            </button>

            <strong>{item.quantity}</strong>

            <button
              type="button"
              onClick={() =>
                onIncrease(item.id)
              }
              aria-label="Adedi artır"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                add
              </span>
            </button>
          </div>

          <strong className="qr-cart-item__price">
            {formatPrice(item.totalPrice)}
          </strong>
        </div>
      </div>
    </article>
  );
}

export default function QrMenuCart() {
  const { restaurantId, tableNo } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const navigate = useNavigate();

  const tableLabel = `${TABLE_LABEL_FALLBACK} ${tableNo}`;

  const [orderNote, setOrderNote] =
    useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] =
  useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
  cartItems,
  summary,
  increaseItem,
  decreaseItem,
  removeItem,
  clearCart,
} = useQrCart();

  const handleContinue = () => {
  setIsConfirmModalOpen(true);
};

// Backend sipariş kalemi şekli eski CustomerMenu.jsx'teki CartTab ile aynı:
// her adet için ayrı bir satır (qty alanı yok), fiyat kuruş cinsinden.
// Sipariş notu (orderNote) backend'de karşılığı olmadığı için gönderilmiyor
// — bu bir varsayımdır, backend'de böyle bir alan eklenirse burası
// güncellenmelidir.
const handleConfirmOrder = async () => {
  if (cartItems.length === 0 || isSubmitting) return;

  const session = getCustomerSession();
  if (!session?.tableSessionId || !session?.accessToken) {
    setSubmitError('Masa oturumu bulunamadı. Lütfen menüyü yeniden açın.');
    setIsConfirmModalOpen(false);
    return;
  }

  setIsSubmitting(true);
  setSubmitError('');
  try {
    const items = cartItems.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        menuItemId: item.product.id,
        name: item.product.name,
        price: item.product.priceKurus ?? Math.round(item.unitPrice * 100),
        orderedBy: 'Müşteri',
        status: OrderItemStatus.Pending,
        paymentStatus: PaymentStatus.Unpaid,
      })),
    );

    // Dönen değerin tam şekli backend'de doğrulanmalı: OrderResponse
    // bekleniyor (bkz. customerOrdersApi.getByRestaurant sonuçları — .id
    // alanı taşıyor). Eski CustomerMenu.jsx dönüş değerini hiç kullanmıyordu
    // (yalnızca sekme değiştiriyordu), o yüzden burada orderId'yi gerçek
    // backend yanıtından güvenle çıkarmak için birkaç olası alanı deniyoruz.
    const created = await customerOrdersApi.create({
      restaurantId,
      tableNo: Number(tableNo),
      tableSessionId: session.tableSessionId,
      qrToken: session.qrToken || token,
      items,
    });

    const orderId = created?.id ?? created?.orderId ?? created;

    setIsConfirmModalOpen(false);
    clearCart();

    navigate(`/menu/${restaurantId}/${tableNo}/order-success/${orderId}`);
  } catch (err) {
    setSubmitError(err.message ?? 'Sipariş gönderilemedi.');
    setIsConfirmModalOpen(false);
  } finally {
    setIsSubmitting(false);
  }
};

  if (cartItems.length === 0) {
    return (
      <main className="qr-cart-page">
        <header className="qr-cart-header">
          <Link
            to={`/menu/${restaurantId}/${tableNo}`}
            aria-label="Menüye dön"
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              arrow_back
            </span>
          </Link>

          <div>
            <span>{tableLabel}</span>

            <h1>Sepetim</h1>
          </div>
        </header>

        <section className="qr-empty-cart">
          <div className="qr-empty-cart__icon">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              shopping_bag
            </span>
          </div>

          <span className="qr-empty-cart__eyebrow">
            Sepetiniz boş
          </span>

          <h2>Henüz ürün eklemediniz</h2>

          <p>
            Menüyü inceleyerek beğendiğiniz ürünleri
            sepetinize ekleyebilirsiniz.
          </p>

          <Link to={`/menu/${restaurantId}/${tableNo}`}>
            Menüye Dön
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="qr-cart-page">
      <header className="qr-cart-header">
        <Link
          to={`/menu/${restaurantId}/${tableNo}`}
          aria-label="Menüye dön"
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            arrow_back
          </span>
        </Link>

        <div>
          <span>{tableLabel}</span>

          <h1>Sepetim</h1>
        </div>

        <strong>
          {summary.totalQuantity} ürün
        </strong>
      </header>

      <div className="qr-cart-content">
        <section className="qr-cart-products">
          <div className="qr-cart-section-heading">
            <span>Siparişiniz</span>

            <h2>Sepetinizdeki ürünler</h2>
          </div>

          <div className="qr-cart-products__list">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={increaseItem}
                onDecrease={decreaseItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        </section>

        <section className="qr-cart-note">
          <div className="qr-cart-note__heading">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              edit_note
            </span>

            <div>
              <h2>Sipariş notu</h2>

              <p>
                Bütün siparişiniz için geçerli olacak
                notunuzu yazabilirsiniz.
              </p>
            </div>
          </div>

          <div className="qr-cart-note__field">
            <textarea
              rows="4"
              maxLength="300"
              value={orderNote}
              onChange={(event) =>
                setOrderNote(event.target.value)
              }
              placeholder="Örneğin: Soslar ayrı gelsin veya alerji bilgisi..."
            />

            <span>
              {orderNote.length}/300
            </span>
          </div>
        </section>

        <aside className="qr-cart-allergy">
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            health_and_safety
          </span>

          <p>
            Alerjiniz veya özel bir sağlık durumunuz
            varsa sipariş vermeden önce işletme
            personeline bildiriniz.
          </p>
        </aside>

        <section className="qr-cart-summary">
          <div className="qr-cart-summary__heading">
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              receipt_long
            </span>

            <h2>Sipariş özeti</h2>
          </div>

          <dl>
            <div>
              <dt>Ürün adedi</dt>

              <dd>
                {summary.totalQuantity}
              </dd>
            </div>

            <div>
              <dt>Ara toplam</dt>

              <dd>
                {formatPrice(
                  summary.totalPrice,
                )}
              </dd>
            </div>

            <div>
              <dt>Hizmet bedeli</dt>

              <dd>₺0,00</dd>
            </div>

            <div className="qr-cart-summary__total">
              <dt>Genel toplam</dt>

              <dd>
                {formatPrice(
                  summary.totalPrice,
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {submitError && (
        <p className="qr-cart-note__field" style={{ color: '#b3261e', padding: '0 15px' }}>
          {submitError}
        </p>
      )}

      <footer className="qr-cart-checkout">
        <div>
          <span>{tableLabel}</span>

          <strong>
            {formatPrice(summary.totalPrice)}
          </strong>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={isSubmitting}
        >
          <span>{isSubmitting ? 'Gönderiliyor...' : 'Siparişi Onayla'}</span>

          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </button>
      </footer>
      <OrderConfirmModal
  isOpen={isConfirmModalOpen}
  tableName={tableLabel}
  totalQuantity={summary.totalQuantity}
  totalPrice={summary.totalPrice}
  onCancel={() =>
    setIsConfirmModalOpen(false)
  }
  onConfirm={handleConfirmOrder}
/>
    </main>
  );
}