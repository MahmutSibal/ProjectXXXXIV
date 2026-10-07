import { useContext } from 'react';

import QrCartContext from './qrCartContextInstance.js';

export default function useQrCart() {
  const context = useContext(QrCartContext);

  if (!context) {
    throw new Error(
      'useQrCart, QrCartProvider içerisinde kullanılmalıdır.',
    );
  }

  return context;
}