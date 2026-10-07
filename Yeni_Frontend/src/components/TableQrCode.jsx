import { useEffect, useState } from 'react';
import { buildTableMenuUrl, toQrDataUrl } from '../lib/qr.js';

/**
 * Masanın QR kodunu gösterir. Oturum kapalıyken (qrToken yok) QR üretilemez;
 * bu durumda kullanıcıya oturumu açması gerektiği bilgisi verilir.
 */
export default function TableQrCode({ restaurantId, tableNo, qrToken, size = 160 }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!qrToken) {
      setDataUrl('');
      return;
    }

    let cancelled = false;
    toQrDataUrl(buildTableMenuUrl(restaurantId, tableNo, qrToken), size * 2)
      .then((url) => !cancelled && setDataUrl(url))
      .catch(() => !cancelled && setDataUrl(''));

    return () => {
      cancelled = true;
    };
  }, [restaurantId, tableNo, qrToken, size]);

  if (!qrToken) {
    return (
      <div className="aspect-square bg-surface-container-low rounded-lg flex flex-col items-center justify-center border border-dashed border-outline-variant gap-2 p-3 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline-variant">qr_code_2</span>
        <span className="text-[11px] text-on-surface-variant leading-snug">
          QR kod için masanın oturumunu açın
        </span>
      </div>
    );
  }

  return (
    <div className="aspect-square bg-white rounded-lg flex items-center justify-center border border-outline-variant p-2">
      {dataUrl ? (
        <img src={dataUrl} alt={`Masa ${tableNo} QR kodu`} className="w-full h-full object-contain" />
      ) : (
        <span className="material-symbols-outlined text-[48px] text-outline-variant">hourglass_top</span>
      )}
    </div>
  );
}
