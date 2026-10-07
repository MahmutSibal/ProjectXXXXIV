import { useEffect, useMemo, useState } from 'react';

import './ProductOptionsModal.css';

const cookingOptions = [
  {
    id: 'rare',
    name: 'Az Pişmiş',
    price: 0,
  },
  {
    id: 'medium',
    name: 'Orta Pişmiş',
    price: 0,
  },
  {
    id: 'well-done',
    name: 'İyi Pişmiş',
    price: 0,
  },
];

const extraOptions = [
  {
    id: 'extra-cheddar',
    name: 'Ekstra Cheddar',
    price: 35,
  },
  {
    id: 'caramelized-onion',
    name: 'Karamelize Soğan',
    price: 20,
  },
  {
    id: 'truffle-sauce',
    name: 'Trüf Sosu',
    price: 45,
  },
  {
    id: 'extra-meat',
    name: 'Ekstra Köfte',
    price: 95,
  },
  {
    id: 'gluten-free-bread',
    name: 'Glutensiz Ekmek',
    price: 30,
  },
];

const badgeInformation = {
  chef: {
    label: 'Şefin Tavsiyesi',
    className: 'product-modal-badge--chef',
  },
  weekly: {
    label: 'Haftanın Ürünü',
    className: 'product-modal-badge--weekly',
  },
  bestseller: {
    label: 'En Çok Satan',
    className: 'product-modal-badge--bestseller',
  },
  new: {
    label: 'Yeni Ürün',
    className: 'product-modal-badge--new',
  },
};

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) {
  const [selectedCooking, setSelectedCooking] =
    useState('');

  const [selectedExtras, setSelectedExtras] =
    useState([]);

  const [quantity, setQuantity] = useState(1);

  const [note, setNote] = useState('');

  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

 

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce(
      (total, extraId) => {
        const selectedExtra = extraOptions.find(
          (extra) => extra.id === extraId,
        );

        return total + (selectedExtra?.price || 0);
      },
      0,
    );
  }, [selectedExtras]);

  const totalPrice = useMemo(() => {
    if (!product) {
      return 0;
    }

    return (
      (product.price + extrasTotal) * quantity
    );
  }, [extrasTotal, product, quantity]);

  if (!isOpen || !product) {
    return null;
  }

  const handleToggleExtra = (extraId) => {
    setSelectedExtras((currentExtras) => {
      if (currentExtras.includes(extraId)) {
        return currentExtras.filter(
          (id) => id !== extraId,
        );
      }

      return [...currentExtras, extraId];
    });
  };

  const handleSubmit = () => {
    if (!selectedCooking) {
      setFormError(
        'Lütfen pişirme tercihinizi seçin.',
      );

      return;
    }

    const selectedExtraObjects =
      selectedExtras.map((extraId) =>
        extraOptions.find(
          (extra) => extra.id === extraId,
        ),
      );

    onAddToCart({
      product,
      quantity,
      note: note.trim(),
      cooking: cookingOptions.find(
        (option) =>
          option.id === selectedCooking,
      ),
      extras: selectedExtraObjects.filter(Boolean),
      unitPrice: product.price + extrasTotal,
      totalPrice,
    });

    onClose();
  };

  return (
    <div
      className="product-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <button
        type="button"
        className="product-modal__backdrop"
        onClick={onClose}
        aria-label="Ürün detayını kapat"
      />

      <section className="product-modal__panel">
        <div className="product-modal__handle" />

        <header className="product-modal__header">
          <div>
            <span>Ürün detayları</span>

            <strong>Seçeneklerinizi belirleyin</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </header>

        <div className="product-modal__scroll">
          <div className="product-modal__image">
            <img
              src={product.image}
              alt={product.name}
            />

            <span>
              {product.calories} kcal
            </span>
          </div>

          {product.badges?.length > 0 && (
            <div className="product-modal__badges">
              {product.badges
                .slice(0, 2)
                .map((badgeKey) => {
                  const badge =
                    badgeInformation[badgeKey];

                  if (!badge) {
                    return null;
                  }

                  return (
                    <span
                      key={badgeKey}
                      className={
                        badge.className
                      }
                    >
                      {badge.label}
                    </span>
                  );
                })}
            </div>
          )}

          <div className="product-modal__information">
            <div className="product-modal__title">
              <h2 id="product-modal-title">
                {product.name}
              </h2>

              <strong>
                {formatPrice(product.price)}
              </strong>
            </div>

            <p>{product.description}</p>
          </div>

          <fieldset className="product-option-group">
            <legend>
              <span>Pişirme tercihi</span>

              <strong>Zorunlu</strong>
            </legend>

            <p className="product-option-group__description">
              Lütfen bir seçenek belirleyin.
            </p>

            <div className="product-option-group__list">
              {cookingOptions.map((option) => (
                <label
                  className="product-option-row"
                  key={option.id}
                >
                  <span className="product-option-row__control">
                    <input
                      type="radio"
                      name="cookingOption"
                      value={option.id}
                      checked={
                        selectedCooking ===
                        option.id
                      }
                      onChange={() => {
                        setSelectedCooking(
                          option.id,
                        );

                        setFormError('');
                      }}
                    />

                    <i />
                  </span>

                  <span className="product-option-row__name">
                    {option.name}
                  </span>

                  <strong>
                    {option.price > 0
                      ? `+${formatPrice(option.price)}`
                      : 'Ücretsiz'}
                  </strong>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="product-option-group">
            <legend>
              <span>Ekstra malzemeler</span>

              <small>İsteğe bağlı</small>
            </legend>

            <p className="product-option-group__description">
              Birden fazla seçim yapabilirsiniz.
            </p>

            <div className="product-option-group__list">
              {extraOptions.map((extra) => (
                <label
                  className="product-option-row"
                  key={extra.id}
                >
                  <span className="product-option-row__control">
                    <input
                      type="checkbox"
                      value={extra.id}
                      checked={selectedExtras.includes(
                        extra.id,
                      )}
                      onChange={() =>
                        handleToggleExtra(
                          extra.id,
                        )
                      }
                    />

                    <i />
                  </span>

                  <span className="product-option-row__name">
                    {extra.name}
                  </span>

                  <strong>
                    +{formatPrice(extra.price)}
                  </strong>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="product-modal-note">
            <label htmlFor="productNote">
              Ürün notu
            </label>

            <textarea
              id="productNote"
              rows="3"
              maxLength="200"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Örneğin: Soğansız olsun, sos ayrı gelsin..."
            />

            <span>{note.length}/200</span>
          </div>

          {formError && (
            <div
              className="product-modal__error"
              role="alert"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                error
              </span>

              <span>{formError}</span>
            </div>
          )}
        </div>

        <footer className="product-modal__footer">
          <div className="product-modal-quantity">
            <button
              type="button"
              onClick={() =>
                setQuantity((currentQuantity) =>
                  Math.max(
                    1,
                    currentQuantity - 1,
                  ),
                )
              }
              aria-label="Ürün adedini azalt"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                remove
              </span>
            </button>

            <strong>{quantity}</strong>

            <button
              type="button"
              onClick={() =>
                setQuantity(
                  (currentQuantity) =>
                    currentQuantity + 1,
                )
              }
              aria-label="Ürün adedini artır"
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
              >
                add
              </span>
            </button>
          </div>

          <button
            type="button"
            className="product-modal__add-button"
            onClick={handleSubmit}
          >
            <span>Sepete Ekle</span>

            <strong>
              {formatPrice(totalPrice)}
            </strong>
          </button>
        </footer>
      </section>
    </div>
  );
}