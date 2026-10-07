import { useEffect } from 'react';

import './OrderConfirmModal.css';

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function OrderConfirmModal({
  isOpen,
  tableName,
  totalQuantity,
  totalPrice,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener(
      'keydown',
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleEscape,
      );
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="order-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirm-title"
    >
      <button
        type="button"
        className="order-confirm-modal__backdrop"
        onClick={onCancel}
        aria-label="Sipariş onay penceresini kapat"
      />

      <section className="order-confirm-modal__card">
        <div className="order-confirm-modal__icon">
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            restaurant
          </span>
        </div>

        <span className="order-confirm-modal__eyebrow">
          Son kontrol
        </span>

        <h2 id="order-confirm-title">
          Siparişinizi onaylıyor musunuz?
        </h2>

        <p>
          Siparişiniz{' '}
          <strong>{tableName}</strong> adına
          işletmeye iletilecektir.
        </p>

        <dl className="order-confirm-modal__summary">
          <div>
            <dt>Ürün adedi</dt>

            <dd>{totalQuantity}</dd>
          </div>

          <div>
            <dt>Masa</dt>

            <dd>{tableName}</dd>
          </div>

          <div>
            <dt>Toplam tutar</dt>

            <dd>{formatPrice(totalPrice)}</dd>
          </div>
        </dl>

        <div className="order-confirm-modal__notice">
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
          >
            info
          </span>

          <span>
            Siparişinizi göndermeden önce
            ürünlerinizi ve seçimlerinizi kontrol
            ediniz.
          </span>
        </div>

        <div className="order-confirm-modal__actions">
          <button
            type="button"
            className="order-confirm-modal__cancel"
            onClick={onCancel}
          >
            Vazgeç
          </button>

          <button
            type="button"
            className="order-confirm-modal__confirm"
            onClick={onConfirm}
          >
            <span>Siparişi Ver</span>

            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}