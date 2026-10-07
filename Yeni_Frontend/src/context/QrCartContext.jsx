import { useMemo, useState } from 'react';

import QrCartContext from './qrCartContextInstance.js';

function createCartItemId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `cart-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export function QrCartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addSimpleProduct = (product) => {
    setCartItems((currentItems) => {
      const configurationKey =
        `simple-${product.id}`;

      const existingItem = currentItems.find(
        (item) =>
          item.configurationKey ===
          configurationKey,
      );

      if (existingItem) {
        return currentItems.map((item) => {
          if (item.id !== existingItem.id) {
            return item;
          }

          const nextQuantity =
            item.quantity + 1;

          return {
            ...item,
            quantity: nextQuantity,
            totalPrice:
              item.unitPrice * nextQuantity,
          };
        });
      }

      return [
        ...currentItems,
        {
          id: createCartItemId(),
          configurationKey,
          product,
          quantity: 1,
          cooking: null,
          extras: [],
          note: '',
          unitPrice: product.price,
          totalPrice: product.price,
        },
      ];
    });
  };

  const addConfiguredProduct = (
    configuredProduct,
  ) => {
    setCartItems((currentItems) => [
      ...currentItems,
      {
        id: createCartItemId(),

        configurationKey:
          createCartItemId(),

        ...configuredProduct,
      },
    ]);
  };

  const increaseItem = (itemId) => {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextQuantity =
          item.quantity + 1;

        return {
          ...item,
          quantity: nextQuantity,
          totalPrice:
            item.unitPrice * nextQuantity,
        };
      }),
    );
  };

  const decreaseItem = (itemId) => {
    setCartItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.id !== itemId) {
          return [item];
        }

        if (item.quantity <= 1) {
          return [];
        }

        const nextQuantity =
          item.quantity - 1;

        return [
          {
            ...item,
            quantity: nextQuantity,
            totalPrice:
              item.unitPrice *
              nextQuantity,
          },
        ];
      }),
    );
  };

  const removeItem = (itemId) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== itemId,
      ),
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getProductQuantity = (productId) => {
    return cartItems
      .filter(
        (item) =>
          item.product.id === productId,
      )
      .reduce(
        (total, item) =>
          total + item.quantity,
        0,
      );
  };

  const summary = useMemo(() => {
    return cartItems.reduce(
      (currentSummary, item) => {
        return {
          totalQuantity:
            currentSummary.totalQuantity +
            item.quantity,

          totalPrice:
            currentSummary.totalPrice +
            item.totalPrice,
        };
      },
      {
        totalQuantity: 0,
        totalPrice: 0,
      },
    );
  }, [cartItems]);

  /*
    contextValue için useMemo kullanmıyoruz.

    Böylece fonksiyonların eksik dependency
    uyarıları oluşmaz. Bu proje ölçeğinde
    ayrıca performans problemi yaratmaz.
  */

  const contextValue = {
    cartItems,
    summary,
    addSimpleProduct,
    addConfiguredProduct,
    increaseItem,
    decreaseItem,
    removeItem,
    clearCart,
    getProductQuantity,
  };

  return (
    <QrCartContext.Provider
      value={contextValue}
    >
      {children}
    </QrCartContext.Provider>
  );
}